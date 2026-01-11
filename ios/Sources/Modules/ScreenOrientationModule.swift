/**
 * ScreenOrientation 模块 - 屏幕方向控制
 *
 * 提供屏幕方向锁定和监听功能
 */

import Foundation
import UIKit

// MARK: - ScreenOrientation 模块

public class ScreenOrientationModule: BridgeModule {
    
    public let moduleName = "ScreenOrientation"
    public let methods = ["Get", "Lock", "Unlock"]
    
    private weak var bridge: WebViewBridge?
    private var isLocked = false
    private var lockedOrientation: UIInterfaceOrientationMask = .all
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        setupNotifications()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Get":
            getOrientation(callback: callback)
        case "Lock":
            lockOrientation(params: params, callback: callback)
        case "Unlock":
            unlockOrientation(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 方法实现
    
    /// 获取当前屏幕方向
    private func getOrientation(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async {
            let orientation: String
            
            if #available(iOS 13.0, *) {
                let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene
                let interfaceOrientation = windowScene?.interfaceOrientation ?? .portrait
                orientation = self.orientationToString(interfaceOrientation)
            } else {
                orientation = self.orientationToString(UIApplication.shared.statusBarOrientation)
            }
            
            callback(.success([
                "type": orientation,
                "isLocked": self.isLocked
            ]))
        }
    }
    
    /// 锁定屏幕方向
    private func lockOrientation(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard let orientationType = params["orientation"]?.value as? String else {
            callback(.failure(BridgeError.invalidParams("缺少 orientation 参数")))
            return
        }
        
        let mask = stringToOrientationMask(orientationType)
        lockedOrientation = mask
        isLocked = true
        
        // 通知应用更新方向
        if #available(iOS 16.0, *) {
            DispatchQueue.main.async {
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: mask)
                    windowScene.requestGeometryUpdate(geometryPreferences) { error in
                        if let error = error {
                            print("屏幕方向更新失败: \(error)")
                        }
                    }
                }
            }
        }
        
        callback(.success([
            "type": orientationType,
            "isLocked": true
        ]))
    }
    
    /// 解锁屏幕方向
    private func unlockOrientation(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        isLocked = false
        lockedOrientation = .all
        
        if #available(iOS 16.0, *) {
            DispatchQueue.main.async {
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: .all)
                    windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
                }
            }
        }
        
        callback(.success([
            "isLocked": false
        ]))
    }
    
    // MARK: - 辅助方法
    
    private func orientationToString(_ orientation: UIInterfaceOrientation) -> String {
        switch orientation {
        case .portrait:
            return "portrait"
        case .portraitUpsideDown:
            return "portrait-secondary"
        case .landscapeLeft:
            return "landscape"
        case .landscapeRight:
            return "landscape-secondary"
        default:
            return "portrait"
        }
    }
    
    private func stringToOrientationMask(_ string: String) -> UIInterfaceOrientationMask {
        switch string {
        case "portrait":
            return .portrait
        case "portrait-primary":
            return .portrait
        case "portrait-secondary":
            return .portraitUpsideDown
        case "landscape":
            return .landscape
        case "landscape-primary":
            return .landscapeLeft
        case "landscape-secondary":
            return .landscapeRight
        case "any":
            return .all
        default:
            return .portrait
        }
    }
    
    // MARK: - 通知
    
    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(orientationDidChange),
            name: UIDevice.orientationDidChangeNotification,
            object: nil
        )
    }
    
    @objc private func orientationDidChange() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let orientation: String
            if #available(iOS 13.0, *) {
                let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene
                let interfaceOrientation = windowScene?.interfaceOrientation ?? .portrait
                orientation = self.orientationToString(interfaceOrientation)
            } else {
                orientation = self.orientationToString(UIApplication.shared.statusBarOrientation)
            }
            
            self.bridge?.sendEvent("ScreenOrientation.Changed", data: [
                "type": orientation
            ])
        }
    }
    
    /// 获取锁定的方向（供 AppDelegate 使用）
    public func getSupportedOrientations() -> UIInterfaceOrientationMask {
        return isLocked ? lockedOrientation : .all
    }
}
