// Example iOS Modules (client-side)
// Place this in your app target, not inside the SDK.

import Foundation
import WebViewBridge

public struct UserInfo: Codable {
    public var userId: String
    public var username: String
    public var avatar: String?
    public var email: String?
    public var phone: String?
    public var extra: [String: AnyCodable]?
}

public enum LoginType: String, Codable { case password, sms, oauth }
public enum OAuthProvider: String, Codable { case wechat, apple, google }

public struct LoginParams: Codable {
    public var type: LoginType
    public var account: String?
    public var password: String?
    public var code: String?
    public var provider: OAuthProvider?
}

public struct LoginResult: Codable {
    public var success: Bool
    public var user: UserInfo?
    public var token: String?
    public var error: String?
}

public class UserModule: BridgeModule {
    public let moduleName = "User"
    public let methods = ["GetCurrentUser", "Login", "Logout", "UpdateProfile"]
    public weak var bridge: WebViewBridge?
    private var currentUser: UserInfo?
    
    public init(bridge: WebViewBridge) { self.bridge = bridge }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetCurrentUser":
            callback(.success(currentUser?.asDictionary()))
        case "Login":
            DispatchQueue.global().asyncAfter(deadline: .now() + 0.5) { [weak self] in
                let user = UserInfo(userId: "user_\(Int.random(in: 1000...9999))",
                                     username: params["account"]?.stringValue ?? "TestUser",
                                     avatar: nil, email: nil, phone: nil, extra: nil)
                self?.currentUser = user
                let result = LoginResult(success: true, user: user, token: "mock_\(UUID().uuidString)", error: nil)
                callback(.success(result.asDictionary()))
            }
        case "Logout":
            currentUser = nil
            callback(.success(nil))
        case "UpdateProfile":
            guard var user = currentUser else { callback(.failure(.internalError("用户未登录"))); return }
            if let username = params["username"]?.stringValue { user.username = username }
            if let avatar = params["avatar"]?.stringValue { user.avatar = avatar }
            if let email = params["email"]?.stringValue { user.email = email }
            if let phone = params["phone"]?.stringValue { user.phone = phone }
            currentUser = user
            callback(.success(user.asDictionary()))
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }
}

public struct AnalyticsEvent: Codable {
    public var event: String
    public var properties: [String: Any]?
    public var timestamp: Double?
}

public class AnalyticsModule: BridgeModule {
    public let moduleName = "Analytics"
    public let methods = ["Track", "SetUserId", "SetUserProperties", "Flush"]
    public weak var bridge: WebViewBridge?
    private var eventBuffer: [AnalyticsEvent] = []
    private var userId: String?
    private var userProperties: [String: Any] = [:]
    
    public init(bridge: WebViewBridge) { self.bridge = bridge }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Track":
            guard let eventName = params["event"]?.stringValue else {
                callback(.failure(.invalidParams("缺少 event 参数"))); return
            }
            let event = AnalyticsEvent(
                event: eventName,
                properties: params["properties"]?.dictionaryValue,
                timestamp: params["timestamp"]?.doubleValue ?? Date().timeIntervalSince1970 * 1000
            )
            eventBuffer.append(event)
            callback(.success(nil))
        case "SetUserId":
            guard let id = params["userId"]?.stringValue else {
                callback(.failure(.invalidParams("缺少 userId 参数"))); return
            }
            userId = id
            callback(.success(nil))
        case "SetUserProperties":
            if let props = params["properties"]?.dictionaryValue {
                userProperties.merge(props) { _, new in new }
            }
            callback(.success(nil))
        case "Flush":
            eventBuffer.removeAll()
            callback(.success(nil))
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }
}

private extension Encodable {
    func asDictionary() -> [String: Any]? {
        guard let data = try? JSONEncoder().encode(self),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return dict
    }
}
