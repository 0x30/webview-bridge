/**
 * StatusBar 模块 - 状态栏控制
 *
 * 提供状态栏样式、可见性等控制功能
 */

import Foundation
import UIKit

// MARK: - 状态栏样式

/// 状态栏样式
public enum StatusBarStyleType: String {
    case `default` = "default"
    case light = "light"
    case dark = "dark"
}

/// 状态栏动画类型
public enum StatusBarAnimation: String {
    case none
    case fade
    case slide
}

// MARK: - StatusBar 模块

public class StatusBarModule: BridgeModule {
    
    public let moduleName = "StatusBar"
    public let methods = ["SetStyle", "SetVisible", "GetInfo", "SetBackgroundColor", "SetOverlaysWebView"]
    
    private weak var bridge: WebViewBridge?
    
    // 状态栏配置
    private var currentStyle: UIStatusBarStyle = .default
    private var isHidden: Bool = false
    private var backgroundColor: UIColor?
    private var overlaysWebView: Bool = true
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "SetStyle":
            setStyle(params: params, callback: callback)
        case "SetVisible":
            setVisible(params: params, callback: callback)
        case "GetInfo":
            getInfo(callback: callback)
        case "SetBackgroundColor":
            setBackgroundColor(params: params, callback: callback)
        case "SetOverlaysWebView":
            setOverlaysWebView(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - SetStyle
    
    private func setStyle(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let styleString = params.getString("style"),
              let style = StatusBarStyleType(rawValue: styleString) else {
            callback(.failure(BridgeError.invalidParams("style")))
            return
        }
        
        let animated = params.getBool("animated") ?? true
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let newStyle: UIStatusBarStyle
            switch style {
            case .default:
                newStyle = .default
            case .light:
                newStyle = .lightContent
            case .dark:
                if #available(iOS 13.0, *) {
                    newStyle = .darkContent
                } else {
                    newStyle = .default
                }
            }
            
            self.currentStyle = newStyle
            
            // 通知视图控制器更新状态栏
            self.notifyStatusBarStyleChange(style: newStyle, animated: animated)
            
            callback(.success(nil))
        }
    }
    
    // MARK: - SetVisible
    
    private func setVisible(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let visible = params.getBool("visible") else {
            callback(.failure(BridgeError.invalidParams("visible")))
            return
        }
        
        let animationString = params.getString("animation") ?? "fade"
        let animation = StatusBarAnimation(rawValue: animationString) ?? .fade
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.isHidden = !visible
            
            let uiAnimation: UIStatusBarAnimation
            switch animation {
            case .none:
                uiAnimation = .none
            case .fade:
                uiAnimation = .fade
            case .slide:
                uiAnimation = .slide
            }
            
            self.notifyStatusBarVisibilityChange(hidden: !visible, animation: uiAnimation)
            
            callback(.success(nil))
        }
    }
    
    // MARK: - GetInfo
    
    private func getInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let style: String
            switch self.currentStyle {
            case .lightContent:
                style = "light"
            case .default:
                style = "default"
            default:
                if #available(iOS 13.0, *), self.currentStyle == .darkContent {
                    style = "dark"
                } else {
                    style = "default"
                }
            }
            
            var height: CGFloat = 0
            if #available(iOS 13.0, *) {
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    height = windowScene.statusBarManager?.statusBarFrame.height ?? 0
                }
            } else {
                height = UIApplication.shared.statusBarFrame.height
            }
            
            callback(.success([
                "style": style,
                "visible": !self.isHidden,
                "height": height,
                "overlaysWebView": self.overlaysWebView,
                "backgroundColor": self.backgroundColor?.hexString ?? NSNull()
            ]))
        }
    }
    
    // MARK: - SetBackgroundColor
    
    private func setBackgroundColor(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let colorString = params.getString("color") else {
            callback(.failure(BridgeError.invalidParams("color")))
            return
        }
        
        guard let color = UIColor(hex: colorString) else {
            callback(.failure(BridgeError.invalidParams("无效的颜色值")))
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.backgroundColor = color
            self?.notifyBackgroundColorChange(color: color)
            callback(.success(nil))
        }
    }
    
    // MARK: - SetOverlaysWebView
    
    private func setOverlaysWebView(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let overlay = params.getBool("overlay") else {
            callback(.failure(BridgeError.invalidParams("overlay")))
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.overlaysWebView = overlay
            self?.notifyOverlayChange(overlay: overlay)
            callback(.success(nil))
        }
    }
    
    // MARK: - 通知方法
    
    /// 通知状态栏样式变化
    private func notifyStatusBarStyleChange(style: UIStatusBarStyle, animated: Bool) {
        // 发送通知，让宿主应用处理
        NotificationCenter.default.post(
            name: .statusBarStyleDidChange,
            object: nil,
            userInfo: [
                "style": style,
                "animated": animated
            ]
        )
    }
    
    /// 通知状态栏可见性变化
    private func notifyStatusBarVisibilityChange(hidden: Bool, animation: UIStatusBarAnimation) {
        NotificationCenter.default.post(
            name: .statusBarVisibilityDidChange,
            object: nil,
            userInfo: [
                "hidden": hidden,
                "animation": animation
            ]
        )
    }
    
    /// 通知背景色变化
    private func notifyBackgroundColorChange(color: UIColor) {
        NotificationCenter.default.post(
            name: .statusBarBackgroundColorDidChange,
            object: nil,
            userInfo: ["color": color]
        )
    }
    
    /// 通知覆盖模式变化
    private func notifyOverlayChange(overlay: Bool) {
        NotificationCenter.default.post(
            name: .statusBarOverlayDidChange,
            object: nil,
            userInfo: ["overlay": overlay]
        )
    }
}

// MARK: - 通知名称扩展

public extension Notification.Name {
    static let statusBarStyleDidChange = Notification.Name("WebViewBridge.StatusBarStyleDidChange")
    static let statusBarVisibilityDidChange = Notification.Name("WebViewBridge.StatusBarVisibilityDidChange")
    static let statusBarBackgroundColorDidChange = Notification.Name("WebViewBridge.StatusBarBackgroundColorDidChange")
    static let statusBarOverlayDidChange = Notification.Name("WebViewBridge.StatusBarOverlayDidChange")
}

// MARK: - UIColor 扩展

private extension UIColor {
    /// 从十六进制字符串创建颜色
    convenience init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return nil
        }
        
        let length = hexSanitized.count
        
        var r, g, b, a: CGFloat
        switch length {
        case 6: // RGB
            r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
            g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
            b = CGFloat(rgb & 0x0000FF) / 255.0
            a = 1.0
        case 8: // ARGB
            a = CGFloat((rgb & 0xFF000000) >> 24) / 255.0
            r = CGFloat((rgb & 0x00FF0000) >> 16) / 255.0
            g = CGFloat((rgb & 0x0000FF00) >> 8) / 255.0
            b = CGFloat(rgb & 0x000000FF) / 255.0
        default:
            return nil
        }
        
        self.init(red: r, green: g, blue: b, alpha: a)
    }
    
    /// 转换为十六进制字符串
    var hexString: String {
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        
        getRed(&r, green: &g, blue: &b, alpha: &a)
        
        if a < 1.0 {
            return String(
                format: "#%02X%02X%02X%02X",
                Int(a * 255),
                Int(r * 255),
                Int(g * 255),
                Int(b * 255)
            )
        } else {
            return String(
                format: "#%02X%02X%02X",
                Int(r * 255),
                Int(g * 255),
                Int(b * 255)
            )
        }
    }
}
