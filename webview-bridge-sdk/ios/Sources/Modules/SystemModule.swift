/**
 * System 模块 - 系统级功能
 *
 * 提供打开 URL、分享、系统信息等功能
 */

import Foundation
import SafariServices
import StoreKit
import UIKit

// MARK: - 分享内容类型

/// 分享内容
public struct ShareContent {
    var text: String?
    var url: String?
    var title: String?
    var image: UIImage?
}

// MARK: - System 模块

public class SystemModule: BridgeModule {

    public let moduleName = "System"
    public let methods = [
        "OpenURL", "Share", "GetInfo", "GetLanguage", "GetTimezone",
        "GetSafeArea", "CanOpenURL", "RateApp", "OpenAppStore",
        "GetColorScheme", "SetBrightness", "GetBrightness", "KeepScreenOn",
    ]

    private weak var bridge: WebViewBridge?
    private var isScreenKeepOn: Bool = false

    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }

    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "OpenURL":
            openURL(params: params, callback: callback)
        case "Share":
            share(params: params, callback: callback)
        case "GetInfo":
            getInfo(callback: callback)
        case "GetLanguage":
            getLanguage(callback: callback)
        case "GetTimezone":
            getTimezone(callback: callback)
        case "GetSafeArea":
            getSafeArea(callback: callback)
        case "CanOpenURL":
            canOpenURL(params: params, callback: callback)
        case "RateApp":
            rateApp(callback: callback)
        case "OpenAppStore":
            openAppStore(params: params, callback: callback)
        case "GetColorScheme":
            getColorScheme(callback: callback)
        case "SetBrightness":
            setBrightness(params: params, callback: callback)
        case "GetBrightness":
            getBrightness(callback: callback)
        case "KeepScreenOn":
            keepScreenOn(params: params, callback: callback)
        default:
            callback(
                .failure(BridgeError.methodNotFound("\(moduleName).\(method)"))
            )
        }
    }

    // MARK: - OpenURL

    private func openURL(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let urlString = params.getString("url"),
            let url = URL(string: urlString)
        else {
            callback(.failure(BridgeError.invalidParams("url")))
            return
        }

        let inApp = params.getBool("inApp") ?? false

        DispatchQueue.main.async {
            if inApp && (url.scheme == "http" || url.scheme == "https") {
                // 使用 SFSafariViewController 在应用内打开
                self.openInSafariViewController(url: url, callback: callback)
            } else {
                // 使用系统浏览器打开
                UIApplication.shared.open(url, options: [:]) { success in
                    if success {
                        callback(
                            .success([
                                "url": urlString,
                                "opened": true,
                            ])
                        )
                    } else {
                        callback(
                            .failure(
                                BridgeError(
                                    code: .internalError,
                                    message: "无法打开 URL"
                                )
                            )
                        )
                    }
                }
            }
        }
    }

    private func openInSafariViewController(
        url: URL,
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let topViewController = UIApplication.shared.topViewController
        else {
            callback(
                .failure(
                    BridgeError(code: .internalError, message: "无法获取当前视图控制器")
                )
            )
            return
        }

        let safari = SFSafariViewController(url: url)
        topViewController.present(safari, animated: true) {
            callback(
                .success([
                    "url": url.absoluteString,
                    "opened": true,
                ])
            )
        }
    }

    // MARK: - Share

    private func share(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        var items: [Any] = []

        // 安全获取 text
        if let text = params["text"]?.value as? String {
            items.append(text)
        }

        // 安全获取 URL
        if let urlString = params["url"]?.value as? String,
            let url = URL(string: urlString)
        {
            items.append(url)
        }

        // 安全获取图片
        if let imageBase64 = params["image"]?.value as? String,
            let data = extractBase64Data(from: imageBase64),
            let imageData = Data(base64Encoded: data),
            let image = UIImage(data: imageData)
        {
            items.append(image)
        }

        guard !items.isEmpty else {
            callback(.failure(BridgeError.invalidParams("至少需要一个分享内容")))
            return
        }

        DispatchQueue.main.async {
            guard let topViewController = UIApplication.shared.topViewController
            else {
                callback(
                    .failure(
                        BridgeError(
                            code: .internalError,
                            message: "无法获取当前视图控制器"
                        )
                    )
                )
                return
            }

            let activityVC = UIActivityViewController(
                activityItems: items,
                applicationActivities: nil
            )

            // iPad popover
            if let popover = activityVC.popoverPresentationController {
                popover.sourceView = topViewController.view
                popover.sourceRect = CGRect(
                    x: topViewController.view.bounds.midX,
                    y: topViewController.view.bounds.midY,
                    width: 0,
                    height: 0
                )
                popover.permittedArrowDirections = []
            }

            activityVC.completionWithItemsHandler = {
                (
                    activityType: UIActivity.ActivityType?,
                    completed: Bool,
                    returnedItems: [Any]?,
                    error: Error?
                ) in
                if let error = error {
                    callback(
                        .failure(
                            BridgeError(
                                code: .internalError,
                                message: error.localizedDescription
                            )
                        )
                    )
                } else {
                    callback(
                        .success([
                            "shared": completed,
                            "activityType": activityType?.rawValue ?? "",
                        ])
                    )
                }
            }

            topViewController.present(activityVC, animated: true)
        }
    }

    // MARK: - GetInfo

    private func getInfo(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let info: [String: Any] = [
            "platform": "ios",
            "osVersion": UIDevice.current.systemVersion,
            "osName": UIDevice.current.systemName,
            "language": Locale.preferredLanguages.first ?? "en",
            "region": Locale.current.regionCode ?? "US",
            "timezone": TimeZone.current.identifier,
            "timezoneOffset": TimeZone.current.secondsFromGMT() / 60,
            "is24HourFormat": is24HourFormat(),
            "isRTL": UIApplication.shared.userInterfaceLayoutDirection
                == .rightToLeft,
        ]
        callback(.success(info))
    }

    // MARK: - GetLanguage

    private func getLanguage(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let preferredLanguage = Locale.preferredLanguages.first ?? "en"
        let locale = Locale.current

        callback(
            .success([
                "language": preferredLanguage,
                "languageCode": locale.languageCode ?? "en",
                "regionCode": locale.regionCode ?? "US",
                "scriptCode": locale.scriptCode ?? NSNull(),
                "preferredLanguages": Locale.preferredLanguages,
            ])
        )
    }

    // MARK: - GetTimezone

    private func getTimezone(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let timezone = TimeZone.current

        callback(
            .success([
                "identifier": timezone.identifier,
                "abbreviation": timezone.abbreviation() ?? "",
                "offsetSeconds": timezone.secondsFromGMT(),
                "offsetMinutes": timezone.secondsFromGMT() / 60,
                "isDaylightSaving": timezone.isDaylightSavingTime(),
            ])
        )
    }

    // MARK: - GetSafeArea

    private func getSafeArea(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.main.async {
            var safeArea: [String: CGFloat] = [
                "top": 0,
                "bottom": 0,
                "left": 0,
                "right": 0,
            ]

            if #available(iOS 13.0, *) {
                if let window = UIApplication.shared.windows.first(where: {
                    $0.isKeyWindow
                }) {
                    let insets = window.safeAreaInsets
                    safeArea = [
                        "top": insets.top,
                        "bottom": insets.bottom,
                        "left": insets.left,
                        "right": insets.right,
                    ]
                }
            } else if let window = UIApplication.shared.keyWindow {
                let insets = window.safeAreaInsets
                safeArea = [
                    "top": insets.top,
                    "bottom": insets.bottom,
                    "left": insets.left,
                    "right": insets.right,
                ]
            }

            callback(.success(safeArea))
        }
    }

    // MARK: - CanOpenURL

    private func canOpenURL(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let urlString = params.getString("url"),
            let url = URL(string: urlString)
        else {
            callback(.failure(BridgeError.invalidParams("url")))
            return
        }

        let canOpen = UIApplication.shared.canOpenURL(url)
        callback(
            .success([
                "url": urlString,
                "canOpen": canOpen,
            ])
        )
    }

    // MARK: - RateApp

    private func rateApp(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.main.async {
            if #available(iOS 14.0, *) {
                if let scene = UIApplication.shared.connectedScenes.first(
                    where: { $0.activationState == .foregroundActive })
                    as? UIWindowScene
                {
                    SKStoreReviewController.requestReview(in: scene)
                    callback(.success(nil))
                } else {
                    callback(
                        .failure(
                            BridgeError(
                                code: .internalError,
                                message: "无法获取窗口场景"
                            )
                        )
                    )
                }
            } else {
                SKStoreReviewController.requestReview()
                callback(.success(nil))
            }
        }
    }

    // MARK: - OpenAppStore

    private func openAppStore(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let appId = params.getString("appId") else {
            callback(.failure(BridgeError.invalidParams("appId")))
            return
        }

        let urlString = "itms-apps://itunes.apple.com/app/id\(appId)"
        guard let url = URL(string: urlString) else {
            callback(.failure(BridgeError.invalidParams("无效的 App ID")))
            return
        }

        UIApplication.shared.open(url, options: [:]) { success in
            if success {
                callback(.success(nil))
            } else {
                callback(
                    .failure(
                        BridgeError(
                            code: .internalError,
                            message: "无法打开 App Store"
                        )
                    )
                )
            }
        }
    }

    // MARK: - GetColorScheme

    private func getColorScheme(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.main.async {
            var colorScheme = "light"

            if #available(iOS 13.0, *) {
                let style = UITraitCollection.current.userInterfaceStyle
                switch style {
                case .dark:
                    colorScheme = "dark"
                case .light:
                    colorScheme = "light"
                case .unspecified:
                    colorScheme = "light"
                @unknown default:
                    colorScheme = "light"
                }
            }

            callback(
                .success([
                    "colorScheme": colorScheme,
                    "prefersColorScheme": colorScheme,
                ])
            )
        }
    }

    // MARK: - SetBrightness

    private func setBrightness(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let brightness = params["brightness"]?.value as? Float else {
            callback(.failure(BridgeError.invalidParams("brightness")))
            return
        }

        let clampedBrightness = max(0.0, min(1.0, brightness))

        DispatchQueue.main.async {
            UIScreen.main.brightness = CGFloat(clampedBrightness)
            callback(
                .success([
                    "brightness": clampedBrightness
                ])
            )
        }
    }

    // MARK: - GetBrightness

    private func getBrightness(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.main.async {
            let brightness = UIScreen.main.brightness
            callback(
                .success([
                    "brightness": brightness
                ])
            )
        }
    }

    // MARK: - KeepScreenOn

    private func keepScreenOn(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let keepOn = params.getBool("keepOn") else {
            callback(.failure(BridgeError.invalidParams("keepOn")))
            return
        }

        DispatchQueue.main.async { [weak self] in
            UIApplication.shared.isIdleTimerDisabled = keepOn
            self?.isScreenKeepOn = keepOn
            callback(
                .success([
                    "keepOn": keepOn
                ])
            )
        }
    }

    // MARK: - 辅助方法

    private func is24HourFormat() -> Bool {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        let timeString = formatter.string(from: Date())
        return !timeString.contains(formatter.amSymbol ?? "AM")
            && !timeString.contains(formatter.pmSymbol ?? "PM")
    }

    private func extractBase64Data(from dataURL: String) -> String? {
        guard let commaIndex = dataURL.firstIndex(of: ",") else {
            return dataURL  // 可能直接是 base64 数据
        }
        return String(dataURL[dataURL.index(after: commaIndex)...])
    }
}

// MARK: - UIApplication 扩展

extension UIApplication {
    /// 获取最顶层的视图控制器
    var topViewController: UIViewController? {
        var topVC: UIViewController?

        if #available(iOS 13.0, *) {
            topVC =
                connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }?
                .rootViewController
        } else {
            topVC = keyWindow?.rootViewController
        }

        while let presented = topVC?.presentedViewController {
            topVC = presented
        }

        return topVC
    }
}
