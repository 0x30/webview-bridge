/**
 * Biometrics 模块 - 生物识别认证
 *
 * 提供 Touch ID / Face ID 认证功能
 */

import Foundation
import LocalAuthentication

// MARK: - Biometrics 模块

public class BiometricsModule: BridgeModule {
    
    public let moduleName = "Biometrics"
    public let methods = [
        "IsAvailable",
        "GetBiometryType",
        "Authenticate",
        "CheckEnrollment"
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
        case "IsAvailable":
            isAvailable(callback: callback)
        case "GetBiometryType":
            getBiometryType(callback: callback)
        case "Authenticate":
            authenticate(params: params, callback: callback)
        case "CheckEnrollment":
            checkEnrollment(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - IsAvailable
    
    /// 检查生物识别是否可用
    private func isAvailable(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let context = LAContext()
        var error: NSError?
        
        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        
        var result: [String: Any] = [
            "isAvailable": canEvaluate,
            "biometryType": biometryTypeString(context.biometryType)
        ]
        
        if let error = error {
            result["errorCode"] = error.code
            result["errorMessage"] = errorMessage(for: LAError.Code(rawValue: error.code))
        }
        
        callback(.success(result))
    }
    
    // MARK: - GetBiometryType
    
    /// 获取生物识别类型
    private func getBiometryType(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let context = LAContext()
        var error: NSError?
        
        // 需要先评估才能获取正确的 biometryType
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        
        let result: [String: Any] = [
            "type": biometryTypeString(context.biometryType),
            "displayName": biometryDisplayName(context.biometryType)
        ]
        
        callback(.success(result))
    }
    
    // MARK: - Authenticate
    
    /// 进行生物识别认证
    private func authenticate(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let reason = params["reason"]?.stringValue ?? "请验证您的身份"
        let fallbackTitle = params["fallbackTitle"]?.stringValue
        let cancelTitle = params["cancelTitle"]?.stringValue
        let allowDeviceCredential = params["allowDeviceCredential"]?.boolValue ?? false
        
        let context = LAContext()
        
        // 配置上下文
        if let fallbackTitle = fallbackTitle {
            context.localizedFallbackTitle = fallbackTitle
        }
        
        if let cancelTitle = cancelTitle {
            context.localizedCancelTitle = cancelTitle
        }
        
        // 选择认证策略
        let policy: LAPolicy = allowDeviceCredential
            ? .deviceOwnerAuthentication
            : .deviceOwnerAuthenticationWithBiometrics
        
        var error: NSError?
        guard context.canEvaluatePolicy(policy, error: &error) else {
            let laError = LAError.Code(rawValue: error?.code ?? LAError.biometryNotAvailable.rawValue)
            callback(.failure(BridgeError(
                code: .featureDisabled,
                message: errorMessage(for: laError)
            )))
            return
        }
        
        context.evaluatePolicy(policy, localizedReason: reason) { success, authError in
            DispatchQueue.main.async {
                if success {
                    callback(.success([
                        "success": true,
                        "biometryType": self.biometryTypeString(context.biometryType)
                    ]))
                } else {
                    let laError = (authError as? LAError)?.code ?? .authenticationFailed
                    
                    var result: [String: Any] = [
                        "success": false,
                        "errorCode": laError.rawValue,
                        "errorMessage": self.errorMessage(for: laError)
                    ]
                    
                    // 提供更多错误详情
                    switch laError {
                    case .userCancel:
                        result["reason"] = "userCancel"
                    case .userFallback:
                        result["reason"] = "userFallback"
                    case .systemCancel:
                        result["reason"] = "systemCancel"
                    case .appCancel:
                        result["reason"] = "appCancel"
                    case .biometryLockout:
                        result["reason"] = "lockout"
                    default:
                        result["reason"] = "failed"
                    }
                    
                    callback(.success(result))
                }
            }
        }
    }
    
    // MARK: - CheckEnrollment
    
    /// 检查生物识别是否已注册
    private func checkEnrollment(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let context = LAContext()
        var error: NSError?
        
        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        
        var result: [String: Any] = [
            "isEnrolled": canEvaluate,
            "biometryType": biometryTypeString(context.biometryType)
        ]
        
        if let error = error {
            let laError = LAError.Code(rawValue: error.code)
            
            switch laError {
            case .biometryNotEnrolled:
                result["isEnrolled"] = false
                result["reason"] = "notEnrolled"
            case .biometryNotAvailable:
                result["isEnrolled"] = false
                result["reason"] = "notAvailable"
            case .biometryLockout:
                result["isEnrolled"] = true
                result["reason"] = "lockout"
            default:
                result["reason"] = "unknown"
            }
        }
        
        callback(.success(result))
    }
    
    // MARK: - 辅助方法
    
    private func biometryTypeString(_ type: LABiometryType) -> String {
        switch type {
        case .none:
            return "none"
        case .touchID:
            return "touchId"
        case .faceID:
            return "faceId"
        @unknown default:
            return "unknown"
        }
    }
    
    private func biometryDisplayName(_ type: LABiometryType) -> String {
        switch type {
        case .none:
            return "无"
        case .touchID:
            return "Touch ID"
        case .faceID:
            return "Face ID"
        @unknown default:
            return "未知"
        }
    }
    
    private func errorMessage(for code: LAError.Code?) -> String {
        guard let code = code else { return "未知错误" }
        
        switch code {
        case .authenticationFailed:
            return "认证失败"
        case .userCancel:
            return "用户取消"
        case .userFallback:
            return "用户选择输入密码"
        case .systemCancel:
            return "系统取消"
        case .passcodeNotSet:
            return "设备未设置密码"
        case .biometryNotAvailable:
            return "生物识别不可用"
        case .biometryNotEnrolled:
            return "未注册生物识别"
        case .biometryLockout:
            return "生物识别已锁定，请输入密码解锁"
        case .appCancel:
            return "应用取消"
        case .invalidContext:
            return "无效的上下文"
        case .notInteractive:
            return "需要用户交互"
        case .watchNotAvailable:
            return "Apple Watch 不可用"
        @unknown default:
            return "未知错误"
        }
    }
}
