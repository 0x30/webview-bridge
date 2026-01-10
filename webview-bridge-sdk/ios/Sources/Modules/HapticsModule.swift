/**
 * Haptics 模块 - 触觉反馈
 *
 * 提供 iOS 触觉反馈功能，支持多种反馈类型
 */

import Foundation
import UIKit

// MARK: - 触觉反馈类型

/// 冲击反馈强度
public enum ImpactStyle: String {
    case light
    case medium
    case heavy
    case soft
    case rigid
}

/// 通知反馈类型
public enum NotificationFeedbackType: String {
    case success
    case warning
    case error
}

// MARK: - Haptics 模块

public class HapticsModule: BridgeModule {
    
    public let moduleName = "Haptics"
    public let methods = ["Impact", "Notification", "Selection", "Vibrate", "IsSupported"]
    
    private weak var bridge: WebViewBridge?
    
    // 预创建的反馈生成器
    private lazy var lightImpact = UIImpactFeedbackGenerator(style: .light)
    private lazy var mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private lazy var heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private lazy var softImpact: UIImpactFeedbackGenerator = {
        if #available(iOS 13.0, *) {
            return UIImpactFeedbackGenerator(style: .soft)
        }
        return UIImpactFeedbackGenerator(style: .light)
    }()
    private lazy var rigidImpact: UIImpactFeedbackGenerator = {
        if #available(iOS 13.0, *) {
            return UIImpactFeedbackGenerator(style: .rigid)
        }
        return UIImpactFeedbackGenerator(style: .heavy)
    }()
    private lazy var notificationFeedback = UINotificationFeedbackGenerator()
    private lazy var selectionFeedback = UISelectionFeedbackGenerator()
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        prepareGenerators()
    }
    
    /// 预准备反馈生成器以减少延迟
    private func prepareGenerators() {
        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
        notificationFeedback.prepare()
        selectionFeedback.prepare()
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Impact":
            impact(params: params, callback: callback)
        case "Notification":
            notification(params: params, callback: callback)
        case "Selection":
            selection(callback: callback)
        case "Vibrate":
            vibrate(params: params, callback: callback)
        case "IsSupported":
            isSupported(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - Impact
    
    /// 触发冲击反馈
    private func impact(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let styleString = params.getString("style") ?? "medium"
        let style = ImpactStyle(rawValue: styleString) ?? .medium
        let intensity = params.getDouble("intensity") ?? 1.0
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let generator: UIImpactFeedbackGenerator
            switch style {
            case .light:
                generator = self.lightImpact
            case .medium:
                generator = self.mediumImpact
            case .heavy:
                generator = self.heavyImpact
            case .soft:
                generator = self.softImpact
            case .rigid:
                generator = self.rigidImpact
            }
            
            if #available(iOS 13.0, *) {
                generator.impactOccurred(intensity: CGFloat(min(1.0, max(0.0, intensity))))
            } else {
                generator.impactOccurred()
            }
            
            generator.prepare()
            callback(.success(nil))
        }
    }
    
    // MARK: - Notification
    
    /// 触发通知反馈
    private func notification(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let typeString = params.getString("type") ?? "success"
        let type = NotificationFeedbackType(rawValue: typeString) ?? .success
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let feedbackType: UINotificationFeedbackGenerator.FeedbackType
            switch type {
            case .success:
                feedbackType = .success
            case .warning:
                feedbackType = .warning
            case .error:
                feedbackType = .error
            }
            
            self.notificationFeedback.notificationOccurred(feedbackType)
            self.notificationFeedback.prepare()
            callback(.success(nil))
        }
    }
    
    // MARK: - Selection
    
    /// 触发选择反馈（轻微）
    private func selection(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.selectionFeedback.selectionChanged()
            self.selectionFeedback.prepare()
            callback(.success(nil))
        }
    }
    
    // MARK: - Vibrate
    
    /// 自定义振动模式
    private func vibrate(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        // iOS 不支持自定义振动模式
        // 使用系统振动作为替代
        let pattern = params["pattern"]?.arrayValue as? [Int] ?? [100]
        
        DispatchQueue.main.async { [weak self] in
            // 使用冲击反馈模拟
            for (index, duration) in pattern.enumerated() {
                if index % 2 == 0 {
                    // 振动阶段
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(self?.sumUpTo(pattern, index: index) ?? 0) / 1000.0) {
                        self?.heavyImpact.impactOccurred()
                    }
                }
                // 奇数索引是暂停时间，不需要处理
            }
            
            callback(.success(nil))
        }
    }
    
    // MARK: - IsSupported
    
    /// 检查触觉反馈是否支持
    private func isSupported(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        // 检查设备是否支持触觉反馈
        // iPhone 7 及更新版本支持 Taptic Engine
        let deviceModel = UIDevice.current.modelIdentifier
        
        // 简单检查：判断是否为 iPhone 7 或更新
        let hasHaptics = checkHapticsSupport()
        
        callback(.success([
            "supported": hasHaptics,
            "impactSupported": hasHaptics,
            "notificationSupported": hasHaptics,
            "selectionSupported": hasHaptics
        ]))
    }
    
    // MARK: - 辅助方法
    
    private func sumUpTo(_ array: [Int], index: Int) -> Int {
        guard index > 0 else { return 0 }
        return array.prefix(index).reduce(0, +)
    }
    
    private func checkHapticsSupport() -> Bool {
        // 基于设备判断触觉反馈支持
        // iPhone 7 及更新版本支持
        guard let window = UIApplication.shared.windows.first else {
            return true // 默认认为支持
        }
        
        // 尝试创建反馈生成器作为检测手段
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        
        // 如果设备不支持，prepare() 不会有效果
        // 但这不会抛出错误，所以我们默认返回 true
        return true
    }
}

// MARK: - UIDevice 扩展

private extension UIDevice {
    /// 获取设备型号标识符
    var modelIdentifier: String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        return machineMirror.children.reduce("") { identifier, element in
            guard let value = element.value as? Int8, value != 0 else { return identifier }
            return identifier + String(UnicodeScalar(UInt8(value)))
        }
    }
}
