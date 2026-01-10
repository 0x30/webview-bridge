/**
 * WebView Bridge SDK - 协议层
 *
 * 定义 JS ↔ Native 通信协议的核心类型
 * 协议版本: 1.0
 */

import Foundation

// MARK: - 协议版本

/// 当前协议版本
public let BridgeProtocolVersion = "1.0"

// MARK: - 请求结构

/// Bridge 请求结构
public struct BridgeRequest: Codable {
    /// 协议版本
    public let version: String
    /// 能力标识: Module.Method
    public let type: String
    /// 请求参数
    public let params: [String: AnyCodable]
    /// 唯一回调 ID
    public let callbackId: String
    
    /// 解析模块名
    public var moduleName: String {
        let parts = type.split(separator: ".")
        return parts.count >= 1 ? String(parts[0]) : ""
    }
    
    /// 解析方法名
    public var methodName: String {
        let parts = type.split(separator: ".")
        return parts.count >= 2 ? String(parts[1]) : ""
    }
}

// MARK: - 响应结构

/// Bridge 响应结构
public struct BridgeResponse: Codable {
    /// 对应请求的回调 ID
    public let callbackId: String
    /// 错误码（0 表示成功）
    public let code: Int
    /// 人类可读的错误信息
    public let msg: String
    /// 响应数据
    public let data: AnyCodable?
    
    public init(callbackId: String, code: Int, msg: String, data: AnyCodable? = nil) {
        self.callbackId = callbackId
        self.code = code
        self.msg = msg
        self.data = data
    }
    
    /// 创建成功响应
    public static func success(callbackId: String, data: Any? = nil) -> BridgeResponse {
        return BridgeResponse(
            callbackId: callbackId,
            code: BridgeErrorCode.success.rawValue,
            msg: "",
            data: data.map { AnyCodable($0) }
        )
    }
    
    /// 创建错误响应
    public static func error(callbackId: String, code: BridgeErrorCode, msg: String) -> BridgeResponse {
        return BridgeResponse(
            callbackId: callbackId,
            code: code.rawValue,
            msg: msg,
            data: nil
        )
    }
}

// MARK: - 事件结构

/// Native → Web 事件结构
public struct BridgeEvent: Codable {
    /// 事件名称: Module.EventName
    public let event: String
    /// 事件数据
    public let data: AnyCodable?
    
    public init(event: String, data: Any? = nil) {
        self.event = event
        self.data = data.map { AnyCodable($0) }
    }
}

// MARK: - 错误码

/// Bridge 错误码定义
public enum BridgeErrorCode: Int {
    // 成功
    case success = 0
    
    // 1xxx: 协议错误
    case invalidJson = 1001
    case missingRequiredField = 1002
    case invalidVersion = 1003
    case invalidTypeFormat = 1004
    case invalidParams = 1005
    
    // 2xxx: 能力错误
    case moduleNotFound = 2001
    case methodNotFound = 2002
    case capabilityNotSupported = 2003
    
    // 3xxx: 权限错误
    case permissionDenied = 3001
    case permissionNotDetermined = 3002
    case permissionRestricted = 3003
    case permissionRequired = 3004
    
    // 4xxx: 设备/系统限制
    case deviceNotSupported = 4001
    case osVersionTooLow = 4002
    case systemRestriction = 4003
    case featureDisabled = 4004
    
    // 5xxx: 内部异常
    case internalError = 5001
    case timeout = 5002
    case bridgeNotReady = 5003
    case webViewDestroyed = 5004
    case cancelled = 5005
}

// MARK: - Bridge 错误

/// Bridge 错误
public struct BridgeError: Error, LocalizedError {
    public let code: BridgeErrorCode
    public let message: String
    
    public var errorDescription: String? {
        return "[\(code.rawValue)] \(message)"
    }
    
    public init(code: BridgeErrorCode, message: String) {
        self.code = code
        self.message = message
    }
    
    public static func moduleNotFound(_ name: String) -> BridgeError {
        return BridgeError(code: .moduleNotFound, message: "模块不存在: \(name)")
    }
    
    public static func methodNotFound(_ type: String) -> BridgeError {
        return BridgeError(code: .methodNotFound, message: "方法不存在: \(type)")
    }
    
    public static func invalidParams(_ detail: String) -> BridgeError {
        return BridgeError(code: .invalidParams, message: "参数无效: \(detail)")
    }
}

// MARK: - AnyCodable

/// 用于处理任意类型的 Codable 包装器
public struct AnyCodable: Codable {
    public let value: Any
    
    public init(_ value: Any) {
        self.value = value
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if container.decodeNil() {
            self.value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            self.value = bool
        } else if let int = try? container.decode(Int.self) {
            self.value = int
        } else if let double = try? container.decode(Double.self) {
            self.value = double
        } else if let string = try? container.decode(String.self) {
            self.value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            self.value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            self.value = dictionary.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "无法解码的类型"
            )
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case is NSNull:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(codingPath: [], debugDescription: "无法编码的类型: \(type(of: value))")
            )
        }
    }
    
    /// 获取字符串值
    public var stringValue: String? {
        return value as? String
    }
    
    /// 获取整数值
    public var intValue: Int? {
        return value as? Int
    }
    
    /// 获取布尔值
    public var boolValue: Bool? {
        return value as? Bool
    }
    
    /// 获取字典值
    public var dictionaryValue: [String: Any]? {
        return value as? [String: Any]
    }
    
    /// 获取数组值
    public var arrayValue: [Any]? {
        return value as? [Any]
    }
}

// MARK: - 参数提取扩展

public extension Dictionary where Key == String, Value == AnyCodable {
    /// 获取字符串参数
    func getString(_ key: String) -> String? {
        return self[key]?.stringValue
    }
    
    /// 获取整数参数
    func getInt(_ key: String) -> Int? {
        return self[key]?.intValue
    }
    
    /// 获取布尔参数
    func getBool(_ key: String) -> Bool? {
        return self[key]?.boolValue
    }
    
    /// 获取必填字符串参数
    func requireString(_ key: String) throws -> String {
        guard let value = getString(key) else {
            throw BridgeError.invalidParams("缺少必填参数: \(key)")
        }
        return value
    }
}
