/**
 * WebView Bridge SDK - 示例扩展模块 (iOS)
 *
 * 此文件演示如何在 iOS 端扩展自定义模块
 * 第三方开发者可参考此示例创建自己的模块
 */

import Foundation

// MARK: - 用户模块 (示例)

/// 用户信息结构
public struct UserInfo: Codable {
    public var userId: String
    public var username: String
    public var avatar: String?
    public var email: String?
    public var phone: String?
    public var extra: [String: AnyCodable]?
    
    public init(
        userId: String,
        username: String,
        avatar: String? = nil,
        email: String? = nil,
        phone: String? = nil,
        extra: [String: AnyCodable]? = nil
    ) {
        self.userId = userId
        self.username = username
        self.avatar = avatar
        self.email = email
        self.phone = phone
        self.extra = extra
    }
}

/// 登录类型
public enum LoginType: String, Codable {
    case password
    case sms
    case oauth
}

/// OAuth 提供商
public enum OAuthProvider: String, Codable {
    case wechat
    case apple
    case google
}

/// 登录参数
public struct LoginParams: Codable {
    public var type: LoginType
    public var account: String?
    public var password: String?
    public var code: String?
    public var provider: OAuthProvider?
}

/// 登录结果
public struct LoginResult: Codable {
    public var success: Bool
    public var user: UserInfo?
    public var token: String?
    public var error: String?
}

/// 用户模块 - 示例扩展
///
/// 演示如何创建一个自定义模块来处理用户相关功能
/// 第三方只需继承或遵循 BridgeModule 协议即可
public class UserModule: BridgeModule {
    
    public let moduleName = "User"
    public let methods = ["GetCurrentUser", "Login", "Logout", "UpdateProfile"]
    
    public weak var bridge: WebViewBridge?
    
    // 模拟的当前用户
    private var currentUser: UserInfo?
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetCurrentUser":
            handleGetCurrentUser(callback: callback)
            
        case "Login":
            handleLogin(params: params, callback: callback)
            
        case "Logout":
            handleLogout(callback: callback)
            
        case "UpdateProfile":
            handleUpdateProfile(params: params, callback: callback)
            
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 方法实现
    
    private func handleGetCurrentUser(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        if let user = currentUser {
            callback(.success(user.asDictionary()))
        } else {
            callback(.success(nil))
        }
    }
    
    private func handleLogin(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        // 解析登录类型
        guard let typeString = params["type"]?.stringValue,
              let loginType = LoginType(rawValue: typeString) else {
            callback(.failure(.invalidParams("缺少 type 参数")))
            return
        }
        
        // 模拟登录逻辑
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.5) { [weak self] in
            // 这里应该调用实际的登录服务
            let user = UserInfo(
                userId: "user_\(Int.random(in: 1000...9999))",
                username: params["account"]?.stringValue ?? "TestUser"
            )
            
            self?.currentUser = user
            
            let result = LoginResult(
                success: true,
                user: user,
                token: "mock_token_\(UUID().uuidString)",
                error: nil
            )
            
            callback(.success(result.asDictionary()))
        }
    }
    
    private func handleLogout(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        currentUser = nil
        callback(.success(nil))
    }
    
    private func handleUpdateProfile(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard var user = currentUser else {
            callback(.failure(.internalError("用户未登录")))
            return
        }
        
        // 更新用户信息
        if let username = params["username"]?.stringValue {
            user.username = username
        }
        if let avatar = params["avatar"]?.stringValue {
            user.avatar = avatar
        }
        if let email = params["email"]?.stringValue {
            user.email = email
        }
        if let phone = params["phone"]?.stringValue {
            user.phone = phone
        }
        
        currentUser = user
        callback(.success(user.asDictionary()))
    }
}

// MARK: - 分析模块 (示例)

/// 分析事件
public struct AnalyticsEvent: Codable {
    public var event: String
    public var properties: [String: AnyCodable]?
    public var timestamp: Double?
}

/// 分析模块 - 示例扩展
///
/// 演示如何创建一个埋点/分析模块
public class AnalyticsModule: BridgeModule {
    
    public let moduleName = "Analytics"
    public let methods = ["Track", "SetUserId", "SetUserProperties", "Flush"]
    
    public weak var bridge: WebViewBridge?
    
    // 事件缓存
    private var eventBuffer: [AnalyticsEvent] = []
    private var userId: String?
    private var userProperties: [String: AnyCodable] = [:]
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Track":
            handleTrack(params: params, callback: callback)
            
        case "SetUserId":
            handleSetUserId(params: params, callback: callback)
            
        case "SetUserProperties":
            handleSetUserProperties(params: params, callback: callback)
            
        case "Flush":
            handleFlush(callback: callback)
            
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 方法实现
    
    private func handleTrack(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let eventName = params["event"]?.stringValue else {
            callback(.failure(.invalidParams("缺少 event 参数")))
            return
        }
        
        let event = AnalyticsEvent(
            event: eventName,
            properties: params["properties"]?.dictionaryValue,
            timestamp: params["timestamp"]?.doubleValue ?? Date().timeIntervalSince1970 * 1000
        )
        
        eventBuffer.append(event)
        print("[Analytics] 记录事件: \(eventName)")
        
        callback(.success(nil))
    }
    
    private func handleSetUserId(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let userId = params["userId"]?.stringValue else {
            callback(.failure(.invalidParams("缺少 userId 参数")))
            return
        }
        
        self.userId = userId
        print("[Analytics] 设置用户 ID: \(userId)")
        
        callback(.success(nil))
    }
    
    private func handleSetUserProperties(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        if let properties = params["properties"]?.dictionaryValue {
            self.userProperties.merge(properties) { _, new in new }
            print("[Analytics] 设置用户属性: \(properties.keys.joined(separator: ", "))")
        }
        
        callback(.success(nil))
    }
    
    private func handleFlush(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        print("[Analytics] 发送 \(eventBuffer.count) 个事件")
        
        // 这里应该调用实际的分析服务 API
        // 模拟网络请求
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.eventBuffer.removeAll()
            callback(.success(nil))
        }
    }
}

// MARK: - 辅助扩展

private extension Encodable {
    func asDictionary() -> [String: Any]? {
        guard let data = try? JSONEncoder().encode(self),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return dict
    }
}

private extension AnyCodable {
    var stringValue: String? {
        return value as? String
    }
    
    var doubleValue: Double? {
        return value as? Double
    }
    
    var dictionaryValue: [String: AnyCodable]? {
        return value as? [String: AnyCodable]
    }
}
