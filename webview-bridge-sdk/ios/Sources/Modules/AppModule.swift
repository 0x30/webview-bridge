/**
 * App 模块 - 应用级别信息与控制
 *
 * 获取启动参数、生命周期状态等
 */

import Foundation
import UIKit

// MARK: - App 模块

public class AppModule: BridgeModule {
    
    public let moduleName = "App"
    public let methods = ["GetLaunchParams", "Exit", "GetLifecycleState", "GetAppInfo", "Minimize"]
    
    private weak var bridge: WebViewBridge?
    
    /// 存储的启动参数
    private var launchParams: LaunchParams?
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetLaunchParams":
            getLaunchParams(callback: callback)
        case "Exit":
            exit(callback: callback)
        case "GetLifecycleState":
            getLifecycleState(callback: callback)
        case "GetAppInfo":
            getAppInfo(callback: callback)
        case "Minimize":
            minimize(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 方法实现
    
    /// 获取启动参数
    private func getLaunchParams(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let params = launchParams ?? LaunchParams(
            source: "normal",
            url: nil,
            params: [:],
            pushData: nil,
            shortcutType: nil,
            userActivityType: nil,
            referrer: nil
        )
        callback(.success(params.toDictionary()))
    }
    
    /// 请求退出
    private func exit(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        // iOS 不允许应用自行退出，返回不允许
        callback(.success([
            "allowed": false,
            "reason": "iOS 不允许应用程序自行退出"
        ]))
    }
    
    /// 获取生命周期状态
    private func getLifecycleState(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async {
            let state: String
            switch UIApplication.shared.applicationState {
            case .active:
                state = "foreground"
            case .inactive:
                state = "inactive"
            case .background:
                state = "background"
            @unknown default:
                state = "unknown"
            }
            callback(.success(state))
        }
    }
    
    /// 获取应用信息
    private func getAppInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let bundle = Bundle.main
        let info: [String: Any] = [
            "bundleId": bundle.bundleIdentifier ?? "",
            "appName": bundle.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
                ?? bundle.object(forInfoDictionaryKey: "CFBundleName") as? String ?? "",
            "appVersion": bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
            "buildNumber": bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "",
            "isDebug": isDebugBuild(),
            "isTestFlight": isTestFlightBuild()
        ]
        callback(.success(info))
    }
    
    /// 最小化应用（iOS 不支持）
    private func minimize(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        callback(.failure(BridgeError(code: .capabilityNotSupported, message: "iOS 不支持最小化应用")))
    }
    
    // MARK: - 辅助方法
    
    /// 设置启动参数（由宿主应用调用）
    public func setLaunchParams(_ params: LaunchParams) {
        self.launchParams = params
    }
    
    /// 检查是否为 Debug 构建
    private func isDebugBuild() -> Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
    
    /// 检查是否为 TestFlight 构建
    private func isTestFlightBuild() -> Bool {
        guard let receiptURL = Bundle.main.appStoreReceiptURL else { return false }
        return receiptURL.lastPathComponent == "sandboxReceipt"
    }
}

// MARK: - 启动参数

/// 启动参数结构
public struct LaunchParams {
    public let source: String
    public let url: String?
    public let params: [String: String]
    public let pushData: [String: Any]?
    public let shortcutType: String?
    public let userActivityType: String?
    public let referrer: String?
    
    public init(
        source: String,
        url: String?,
        params: [String: String],
        pushData: [String: Any]?,
        shortcutType: String?,
        userActivityType: String?,
        referrer: String?
    ) {
        self.source = source
        self.url = url
        self.params = params
        self.pushData = pushData
        self.shortcutType = shortcutType
        self.userActivityType = userActivityType
        self.referrer = referrer
    }
    
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "source": source,
            "params": params
        ]
        if let url = url { dict["url"] = url }
        if let pushData = pushData { dict["pushData"] = pushData }
        if let shortcutType = shortcutType { dict["shortcutType"] = shortcutType }
        if let userActivityType = userActivityType { dict["userActivityType"] = userActivityType }
        if let referrer = referrer { dict["referrer"] = referrer }
        return dict
    }
}
