/**
 * Keyboard 模块 - 键盘控制
 *
 * 提供键盘显示/隐藏控制和状态监听
 */

import Foundation
import UIKit
import WebKit

// MARK: - WKWebView InputAccessoryView 隐藏扩展

/// 通过 swizzling 隐藏 WKWebView 的 inputAccessoryView
private var WKWebViewAccessoryBarHiddenKey: UInt8 = 0

extension WKWebView {
    
    /// 是否隐藏键盘附件栏
    var isInputAccessoryViewHidden: Bool {
        get {
            return objc_getAssociatedObject(self, &WKWebViewAccessoryBarHiddenKey) as? Bool ?? false
        }
        set {
            objc_setAssociatedObject(self, &WKWebViewAccessoryBarHiddenKey, newValue, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            
            // 通过 swizzling WKContentView 来隐藏 inputAccessoryView
            if newValue {
                hideInputAccessoryView()
            }
        }
    }
    
    private func hideInputAccessoryView() {
        guard let contentView = scrollView.subviews.first(where: {
            String(describing: type(of: $0)).hasPrefix("WKContentView")
        }) else { return }
        
        // 使用自定义的空视图替换 inputAccessoryView
        let emptyView = UIView(frame: .zero)
        
        // 通过 key-value coding 设置（可能会在未来 iOS 版本失效）
        if contentView.responds(to: NSSelectorFromString("setInputAccessoryView:")) {
            contentView.setValue(emptyView, forKey: "inputAccessoryView")
        }
    }
    
    /// 恢复显示键盘附件栏
    func showInputAccessoryView() {
        guard let contentView = scrollView.subviews.first(where: {
            String(describing: type(of: $0)).hasPrefix("WKContentView")
        }) else { return }
        
        if contentView.responds(to: NSSelectorFromString("setInputAccessoryView:")) {
            contentView.setValue(nil, forKey: "inputAccessoryView")
        }
    }
}

// MARK: - Keyboard 模块

public class KeyboardModule: BridgeModule {
    
    public let moduleName = "Keyboard"
    public let methods = [
        "Show", 
        "Hide", 
        "GetInfo", 
        "SetAccessoryBarVisible", 
        "SetScroll",
        "SetStyle"
    ]
    
    private weak var bridge: WebViewBridge?
    private weak var webView: WKWebView?
    private var isMonitoring = false
    private var accessoryBarHidden = false
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        self.webView = bridge.webView
        setupNotifications()
    }
    
    deinit {
        removeNotifications()
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Show":
            showKeyboard(callback: callback)
        case "Hide":
            hideKeyboard(callback: callback)
        case "GetInfo":
            getInfo(callback: callback)
        case "SetAccessoryBarVisible":
            setAccessoryBarVisible(params: params, callback: callback)
        case "SetScroll":
            setScroll(params: params, callback: callback)
        case "SetStyle":
            setStyle(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 键盘操作
    
    /// 显示键盘
    private func showKeyboard(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async { [weak self] in
            // 通过注入 JS 来聚焦输入框
            self?.webView?.evaluateJavaScript("""
                (function() {
                    var activeElement = document.activeElement;
                    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                        activeElement.blur();
                        activeElement.focus();
                    } else {
                        var inputs = document.querySelectorAll('input, textarea');
                        if (inputs.length > 0) {
                            inputs[0].focus();
                        }
                    }
                })();
            """) { _, _ in }
            
            callback(.success(["requested": true]))
        }
    }
    
    /// 隐藏键盘
    private func hideKeyboard(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async { [weak self] in
            // 通过注入 JS 来移除焦点
            self?.webView?.evaluateJavaScript("""
                document.activeElement && document.activeElement.blur();
            """) { _, _ in }
            
            // 同时使用系统方法
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            
            callback(.success(["hidden": true]))
        }
    }
    
    /// 获取键盘信息
    private func getInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        callback(.success([
            "isVisible": KeyboardState.shared.isVisible,
            "height": KeyboardState.shared.height,
            "accessoryBarHidden": accessoryBarHidden
        ]))
    }
    
    /// 设置附件栏可见性（iOS 特有）
    private func setAccessoryBarVisible(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard let visible = params["visible"]?.value as? Bool else {
            callback(.failure(BridgeError.invalidParams("visible 参数必需")))
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.accessoryBarHidden = !visible
            self?.webView?.isInputAccessoryViewHidden = !visible
            
            callback(.success([
                "set": true,
                "visible": visible
            ]))
        }
    }
    
    /// 设置滚动行为
    private func setScroll(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard let enabled = params["enabled"]?.value as? Bool else {
            callback(.failure(BridgeError.invalidParams("enabled 参数必需")))
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            // 控制 WebView 的键盘避让行为
            if #available(iOS 16.4, *) {
                // iOS 16.4+ 可以通过 CSS env() 控制
            }
            
            // 通用方案：控制 scrollView 的行为
            self?.webView?.scrollView.keyboardDismissMode = enabled ? .interactive : .none
            
            callback(.success(["set": true]))
        }
    }
    
    /// 设置键盘样式
    private func setStyle(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard let style = params["style"]?.value as? String else {
            callback(.failure(BridgeError.invalidParams("style 参数必需")))
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            // 通过 JS 设置键盘样式
            let colorScheme = style == "dark" ? "dark" : "light"
            self?.webView?.evaluateJavaScript("""
                document.documentElement.style.colorScheme = '\(colorScheme)';
            """) { _, _ in }
            
            callback(.success(["set": true, "style": style]))
        }
    }
    
    // MARK: - 辅助方法
    
    private func findAndActivateTextField(in view: UIView) {
        for subview in view.subviews {
            if let textField = subview as? UITextField {
                textField.becomeFirstResponder()
                return
            }
            if let textView = subview as? UITextView {
                textView.becomeFirstResponder()
                return
            }
            findAndActivateTextField(in: subview)
        }
    }
                return
            }
            findAndActivateTextField(in: subview)
        }
    }
    
    // MARK: - 键盘通知
    
    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardDidShow),
            name: UIResponder.keyboardDidShowNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardDidHide),
            name: UIResponder.keyboardDidHideNotification,
            object: nil
        )
    }
    
    private func removeNotifications() {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func keyboardWillShow(_ notification: Notification) {
        if let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
            let height = keyboardFrame.height
            KeyboardState.shared.height = height
            
            bridge?.sendEvent("Keyboard.WillShow", data: [
                "height": height
            ])
        }
    }
    
    @objc private func keyboardDidShow(_ notification: Notification) {
        if let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
            let height = keyboardFrame.height
            KeyboardState.shared.isVisible = true
            KeyboardState.shared.height = height
            
            bridge?.sendEvent("Keyboard.DidShow", data: [
                "height": height
            ])
        }
    }
    
    @objc private func keyboardWillHide(_ notification: Notification) {
        bridge?.sendEvent("Keyboard.WillHide", data: [
            "height": 0
        ])
    }
    
    @objc private func keyboardDidHide(_ notification: Notification) {
        KeyboardState.shared.isVisible = false
        KeyboardState.shared.height = 0
        
        bridge?.sendEvent("Keyboard.DidHide", data: [
            "height": 0
        ])
    }
}

// MARK: - 键盘状态

class KeyboardState {
    static let shared = KeyboardState()
    
    var isVisible: Bool = false
    var height: CGFloat = 0
    
    private init() {}
}
