/**
 * Browser 模块 - 应用内浏览器
 *
 * 提供应用内浏览器功能
 */

import Foundation
import SafariServices
import WebKit

/**
 * 应用内浏览器模块
 */
public class BrowserModule: NSObject, BridgeModule, SFSafariViewControllerDelegate {
    
    public var moduleName: String { "Browser" }
    
    public var methods: [String] {
        ["Open", "Close", "Prefetch"]
    }
    
    weak var bridge: WebViewBridge?
    private var safariVC: SFSafariViewController?
    private var customWebView: WKWebView?
    private var customNavController: UINavigationController?
    
    public init(bridge: WebViewBridge? = nil) {
        self.bridge = bridge
        super.init()
    }
    
    public func handleRequest(method: String, request: BridgeRequest, callback: @escaping BridgeCallback) {
        switch method {
        case "Open":
            open(params: request.params, callback: callback)
        case "Close":
            close(callback: callback)
        case "Prefetch":
            prefetch(params: request.params, callback: callback)
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 打开浏览器
    
    private func open(params: [String: Any]?, callback: @escaping BridgeCallback) {
        guard let urlString = params?["url"] as? String,
              let url = URL(string: urlString) else {
            callback(.failure(.invalidParams("url 参数无效")))
            return
        }
        
        let presentationStyle = params?["presentationStyle"] as? String ?? "fullScreen"
        let toolbarColor = params?["toolbarColor"] as? String
        let showTitle = params?["showTitle"] as? Bool ?? true
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let viewController = self.getTopViewController() else {
                callback(.failure(.unknown("无法获取视图控制器")))
                return
            }
            
            // 配置 Safari View Controller
            let config = SFSafariViewController.Configuration()
            config.entersReaderIfAvailable = false
            config.barCollapsingEnabled = true
            
            let safari = SFSafariViewController(url: url, configuration: config)
            safari.delegate = self
            
            // 设置工具栏颜色
            if let colorString = toolbarColor {
                safari.preferredBarTintColor = UIColor(hexString: colorString)
            }
            
            // 设置呈现样式
            switch presentationStyle {
            case "popover":
                safari.modalPresentationStyle = .popover
            case "pageSheet":
                safari.modalPresentationStyle = .pageSheet
            case "formSheet":
                safari.modalPresentationStyle = .formSheet
            default:
                safari.modalPresentationStyle = .fullScreen
            }
            
            self.safariVC = safari
            
            viewController.present(safari, animated: true) {
                callback(.success(["opened": true]))
                self.bridge?.sendEvent("Browser.Opened", data: ["url": urlString])
            }
        }
    }
    
    // MARK: - 关闭浏览器
    
    private func close(callback: @escaping BridgeCallback) {
        DispatchQueue.main.async { [weak self] in
            if let safari = self?.safariVC {
                safari.dismiss(animated: true) {
                    self?.safariVC = nil
                    callback(.success(["closed": true]))
                }
            } else if let nav = self?.customNavController {
                nav.dismiss(animated: true) {
                    self?.customNavController = nil
                    self?.customWebView = nil
                    callback(.success(["closed": true]))
                }
            } else {
                callback(.success(["closed": false, "reason": "没有打开的浏览器"]))
            }
        }
    }
    
    // MARK: - 预加载 URL
    
    private func prefetch(params: [String: Any]?, callback: @escaping BridgeCallback) {
        guard let urls = params?["urls"] as? [String] else {
            callback(.failure(.invalidParams("urls 参数无效")))
            return
        }
        
        let validURLs = urls.compactMap { URL(string: $0) }
        
        if validURLs.isEmpty {
            callback(.failure(.invalidParams("没有有效的 URL")))
            return
        }
        
        // iOS 没有直接的预加载 API，但我们可以使用 URLSession 预热
        let session = URLSession.shared
        for url in validURLs {
            var request = URLRequest(url: url)
            request.httpMethod = "HEAD"
            session.dataTask(with: request).resume()
        }
        
        callback(.success([
            "prefetched": true,
            "count": validURLs.count
        ]))
    }
    
    // MARK: - SFSafariViewControllerDelegate
    
    public func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        safariVC = nil
        bridge?.sendEvent("Browser.Closed", data: [:])
    }
    
    public func safariViewController(_ controller: SFSafariViewController, initialLoadDidRedirectTo URL: URL) {
        bridge?.sendEvent("Browser.PageLoaded", data: ["url": URL.absoluteString])
    }
    
    // MARK: - Helper
    
    private func getTopViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }),
              var topController = window.rootViewController else {
            return nil
        }
        
        while let presentedViewController = topController.presentedViewController {
            topController = presentedViewController
        }
        
        return topController
    }
}

// MARK: - UIColor Extension

extension UIColor {
    convenience init?(hexString: String) {
        var hexSanitized = hexString.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        
        let length = hexSanitized.count
        guard length == 6 || length == 8 else { return nil }
        
        if length == 6 {
            self.init(
                red: CGFloat((rgb & 0xFF0000) >> 16) / 255.0,
                green: CGFloat((rgb & 0x00FF00) >> 8) / 255.0,
                blue: CGFloat(rgb & 0x0000FF) / 255.0,
                alpha: 1.0
            )
        } else {
            self.init(
                red: CGFloat((rgb & 0xFF000000) >> 24) / 255.0,
                green: CGFloat((rgb & 0x00FF0000) >> 16) / 255.0,
                blue: CGFloat((rgb & 0x0000FF00) >> 8) / 255.0,
                alpha: CGFloat(rgb & 0x000000FF) / 255.0
            )
        }
    }
}
