/**
 * Custom 模块 - 自定义模块示例
 *
 * 演示如何创建自定义原生模块，供开发者参考
 * 包含 Alert、Confirm、Prompt、Toast 等常见 UI 交互方法
 */

import UIKit
import WebViewBridge

/// 自定义模块 - 演示原生 UI 交互
///
/// 此模块展示如何创建自定义模块，包含：
/// - Alert: 显示原生警告框
/// - Confirm: 显示确认对话框
/// - Prompt: 显示输入对话框
/// - Toast: 显示 Toast 消息
/// - Loading: 显示/隐藏加载指示器
/// - ActionSheet: 显示操作表
class CustomModule: BridgeModule {
    
    let moduleName = "Custom"
    let methods = ["Alert", "Confirm", "Prompt", "Toast", "ShowLoading", "HideLoading", "ActionSheet"]
    
    private weak var viewController: UIViewController?
    
    /// Loading 遮罩视图
    private var loadingView: UIView?
    
    init(viewController: UIViewController) {
        self.viewController = viewController
    }
    
    func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Alert":
            showAlert(params: params, callback: callback)
        case "Confirm":
            showConfirm(params: params, callback: callback)
        case "Prompt":
            showPrompt(params: params, callback: callback)
        case "Toast":
            showToast(params: params, callback: callback)
        case "ShowLoading":
            showLoading(params: params, callback: callback)
        case "HideLoading":
            hideLoading(callback: callback)
        case "ActionSheet":
            showActionSheet(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - Alert
    
    private func showAlert(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let title = params["title"]?.value as? String
        let message = params["message"]?.value as? String ?? ""
        let buttonText = params["buttonText"]?.value as? String ?? "确定"
        
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.viewController else {
                callback(.failure(BridgeError.unknown("无法获取视图控制器")))
                return
            }
            
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: buttonText, style: .default) { _ in
                callback(.success(["action": "confirm"]))
            })
            vc.present(alert, animated: true)
        }
    }
    
    // MARK: - Confirm
    
    private func showConfirm(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let title = params["title"]?.value as? String
        let message = params["message"]?.value as? String ?? ""
        let confirmText = params["confirmText"]?.value as? String ?? "确定"
        let cancelText = params["cancelText"]?.value as? String ?? "取消"
        
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.viewController else {
                callback(.failure(BridgeError.unknown("无法获取视图控制器")))
                return
            }
            
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: cancelText, style: .cancel) { _ in
                callback(.success(["confirmed": false]))
            })
            alert.addAction(UIAlertAction(title: confirmText, style: .default) { _ in
                callback(.success(["confirmed": true]))
            })
            vc.present(alert, animated: true)
        }
    }
    
    // MARK: - Prompt
    
    private func showPrompt(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let title = params["title"]?.value as? String
        let message = params["message"]?.value as? String
        let placeholder = params["placeholder"]?.value as? String ?? ""
        let defaultValue = params["defaultValue"]?.value as? String ?? ""
        let confirmText = params["confirmText"]?.value as? String ?? "确定"
        let cancelText = params["cancelText"]?.value as? String ?? "取消"
        
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.viewController else {
                callback(.failure(BridgeError.unknown("无法获取视图控制器")))
                return
            }
            
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addTextField { textField in
                textField.placeholder = placeholder
                textField.text = defaultValue
            }
            
            alert.addAction(UIAlertAction(title: cancelText, style: .cancel) { _ in
                callback(.success(["confirmed": false, "value": ""]))
            })
            alert.addAction(UIAlertAction(title: confirmText, style: .default) { _ in
                let value = alert.textFields?.first?.text ?? ""
                callback(.success(["confirmed": true, "value": value]))
            })
            vc.present(alert, animated: true)
        }
    }
    
    // MARK: - Toast
    
    private func showToast(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let message = params["message"]?.value as? String ?? ""
        let duration = params["duration"]?.value as? String ?? "short"
        let displayDuration: TimeInterval = duration == "long" ? 3.0 : 2.0
        
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.viewController else {
                callback(.failure(BridgeError.unknown("无法获取视图控制器")))
                return
            }
            
            // 创建 Toast 视图
            let toastLabel = UILabel()
            toastLabel.backgroundColor = UIColor.black.withAlphaComponent(0.7)
            toastLabel.textColor = .white
            toastLabel.textAlignment = .center
            toastLabel.font = UIFont.systemFont(ofSize: 14)
            toastLabel.text = message
            toastLabel.alpha = 0
            toastLabel.layer.cornerRadius = 10
            toastLabel.clipsToBounds = true
            toastLabel.numberOfLines = 0
            
            let maxWidth = vc.view.bounds.width - 60
            let size = toastLabel.sizeThatFits(CGSize(width: maxWidth, height: .greatestFiniteMagnitude))
            let width = min(size.width + 32, maxWidth)
            let height = size.height + 16
            
            toastLabel.frame = CGRect(
                x: (vc.view.bounds.width - width) / 2,
                y: vc.view.bounds.height - 120,
                width: width,
                height: height
            )
            
            vc.view.addSubview(toastLabel)
            
            UIView.animate(withDuration: 0.3, animations: {
                toastLabel.alpha = 1.0
            }) { _ in
                UIView.animate(withDuration: 0.3, delay: displayDuration, options: [], animations: {
                    toastLabel.alpha = 0
                }) { _ in
                    toastLabel.removeFromSuperview()
                }
            }
            
            callback(.success(nil))
        }
    }
    
    // MARK: - Loading
    
    private func showLoading(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let message = params["message"]?.value as? String ?? "加载中..."
        
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.viewController else {
                callback(.failure(BridgeError.unknown("无法获取视图控制器")))
                return
            }
            
            // 移除现有的 loading 视图
            self?.loadingView?.removeFromSuperview()
            
            // 创建遮罩
            let overlay = UIView(frame: vc.view.bounds)
            overlay.backgroundColor = UIColor.black.withAlphaComponent(0.4)
            overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            
            // 创建容器
            let container = UIView()
            container.backgroundColor = UIColor.white
            container.layer.cornerRadius = 12
            container.translatesAutoresizingMaskIntoConstraints = false
            
            // 创建指示器
            let indicator = UIActivityIndicatorView(style: .large)
            indicator.translatesAutoresizingMaskIntoConstraints = false
            indicator.startAnimating()
            
            // 创建标签
            let label = UILabel()
            label.text = message
            label.textColor = .darkGray
            label.font = UIFont.systemFont(ofSize: 14)
            label.textAlignment = .center
            label.translatesAutoresizingMaskIntoConstraints = false
            
            container.addSubview(indicator)
            container.addSubview(label)
            overlay.addSubview(container)
            
            NSLayoutConstraint.activate([
                container.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
                container.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
                container.widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
                container.heightAnchor.constraint(greaterThanOrEqualToConstant: 100),
                
                indicator.topAnchor.constraint(equalTo: container.topAnchor, constant: 20),
                indicator.centerXAnchor.constraint(equalTo: container.centerXAnchor),
                
                label.topAnchor.constraint(equalTo: indicator.bottomAnchor, constant: 12),
                label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
                label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16),
                label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -16)
            ])
            
            vc.view.addSubview(overlay)
            self?.loadingView = overlay
            
            callback(.success(nil))
        }
    }
    
    private func hideLoading(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async { [weak self] in
            self?.loadingView?.removeFromSuperview()
            self?.loadingView = nil
            callback(.success(nil))
        }
    }
    
    // MARK: - ActionSheet
    
    private func showActionSheet(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let title = params["title"]?.value as? String
        let options = params["options"]?.value as? [String] ?? []
        let cancelText = params["cancelText"]?.value as? String ?? "取消"
        
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.viewController else {
                callback(.failure(BridgeError.unknown("无法获取视图控制器")))
                return
            }
            
            let actionSheet = UIAlertController(title: title, message: nil, preferredStyle: .actionSheet)
            
            for (index, option) in options.enumerated() {
                actionSheet.addAction(UIAlertAction(title: option, style: .default) { _ in
                    callback(.success([
                        "index": index,
                        "option": option,
                        "cancelled": false
                    ]))
                })
            }
            
            actionSheet.addAction(UIAlertAction(title: cancelText, style: .cancel) { _ in
                callback(.success([
                    "index": -1,
                    "option": "",
                    "cancelled": true
                ]))
            })
            
            // iPad 适配
            if let popover = actionSheet.popoverPresentationController {
                popover.sourceView = vc.view
                popover.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            
            vc.present(actionSheet, animated: true)
        }
    }
}
