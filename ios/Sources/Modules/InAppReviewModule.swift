/**
 * InAppReview 模块 - 应用内评价
 *
 * 提供 iOS StoreKit 应用内评价功能
 * 使用 SKStoreReviewController 请求用户评价
 */

import Foundation
import StoreKit
import UIKit

// MARK: - 评价可用性结果

/// 评价可用性检查结果
public struct ReviewAvailability: Encodable {
    /// 是否支持应用内评价
    public let isSupported: Bool
    /// 不支持的原因（如果不支持）
    public let reason: String?
    
    public init(isSupported: Bool, reason: String? = nil) {
        self.isSupported = isSupported
        self.reason = reason
    }
}

/// 评价请求结果
public struct RequestReviewResult: Encodable {
    /// 是否成功发起请求
    public let requested: Bool
    /// 附加信息
    public let message: String?
    
    public init(requested: Bool, message: String? = nil) {
        self.requested = requested
        self.message = message
    }
}

// MARK: - InAppReview 模块

public class InAppReviewModule: BridgeModule {

    public let moduleName = "InAppReview"
    public let methods = [
        "RequestReview",
        "IsAvailable",
        "OpenAppStoreReview"
    ]

    private weak var bridge: WebViewBridge?

    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }

    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "RequestReview":
            requestReview(callback: callback)
        case "IsAvailable":
            isAvailable(callback: callback)
        case "OpenAppStoreReview":
            openAppStoreReview(params: params, callback: callback)
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }

    // MARK: - RequestReview

    /// 请求应用内评价
    /// 注意：iOS 会根据自己的策略决定是否显示评价弹窗
    /// 每个应用每年最多显示 3 次
    private func requestReview(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard self != nil else {
                callback(.failure(.internalError("Module deallocated")))
                return
            }
            
            if #available(iOS 14.0, *) {
                // iOS 14+ 使用新的 API
                if let scene = UIApplication.shared.connectedScenes
                    .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                    SKStoreReviewController.requestReview(in: scene)
                    callback(.success(RequestReviewResult(
                        requested: true,
                        message: "Review request sent to system"
                    )))
                } else {
                    callback(.failure(.internalError("No active window scene available")))
                }
            } else {
                // iOS 10.3 - iOS 13
                SKStoreReviewController.requestReview()
                callback(.success(RequestReviewResult(
                    requested: true,
                    message: "Review request sent to system"
                )))
            }
        }
    }

    // MARK: - IsAvailable

    /// 检查应用内评价是否可用
    private func isAvailable(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        // SKStoreReviewController 从 iOS 10.3 开始可用
        // 我们的 SDK 最低支持 iOS 14，所以始终可用
        let availability = ReviewAvailability(
            isSupported: true,
            reason: nil
        )
        callback(.success(availability))
    }

    // MARK: - OpenAppStoreReview

    /// 打开 App Store 评价页面
    /// 直接跳转到 App Store 的评价页面
    private func openAppStoreReview(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let appId = params["appId"]?.value as? String, !appId.isEmpty else {
            callback(.failure(.invalidParams("appId is required")))
            return
        }
        
        // App Store 评价页面 URL
        // 格式: https://apps.apple.com/app/id{APP_ID}?action=write-review
        let urlString = "https://apps.apple.com/app/id\(appId)?action=write-review"
        
        guard let url = URL(string: urlString) else {
            callback(.failure(.invalidParams("Invalid appId format")))
            return
        }
        
        DispatchQueue.main.async {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:]) { success in
                    if success {
                        callback(.success(["opened": true]))
                    } else {
                        callback(.failure(.internalError("Failed to open App Store")))
                    }
                }
            } else {
                callback(.failure(.internalError("Cannot open App Store URL")))
            }
        }
    }
}
