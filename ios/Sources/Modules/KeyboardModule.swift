/**
 * Keyboard 模块 - 键盘控制
 *
 * 提供键盘显示/隐藏控制和状态监听
 */

import Foundation
import UIKit

// MARK: - Keyboard 模块

public class KeyboardModule: BridgeModule {
    
    public let moduleName = "Keyboard"
    public let methods = ["Show", "Hide", "GetInfo", "SetAccessoryBarVisible", "SetScroll"]
    
    private weak var bridge: WebViewBridge?
    private var isMonitoring = false
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
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
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 键盘操作
    
    /// 显示键盘
    private func showKeyboard(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async {
            // 查找当前的第一响应者并使其成为第一响应者
            if let window = UIApplication.shared.keyWindow {
                self.findAndActivateTextField(in: window)
            }
            callback(.success(nil))
        }
    }
    
    /// 隐藏键盘
    private func hideKeyboard(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async {
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            callback(.success(nil))
        }
    }
    
    /// 获取键盘信息
    private func getInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        callback(.success([
            "isVisible": KeyboardState.shared.isVisible,
            "height": KeyboardState.shared.height
        ]))
    }
    
    /// 设置附件栏可见性（iOS 特有）
    private func setAccessoryBarVisible(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        // iOS 原生键盘附件栏控制较复杂，通常需要通过 WKWebView 配置
        callback(.success(nil))
    }
    
    /// 设置滚动行为
    private func setScroll(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        // 控制键盘出现时是否自动滚动
        callback(.success(nil))
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
