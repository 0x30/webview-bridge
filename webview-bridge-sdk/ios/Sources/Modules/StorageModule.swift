/**
 * Storage 模块 - 安全存储
 *
 * 提供 UserDefaults 和 Keychain 存储功能
 */

import Foundation
import Security

// MARK: - 存储安全级别

/// 存储安全级别
public enum StorageSecurityLevel: String {
    case standard    // UserDefaults
    case secure      // Keychain
}

/// Keychain 可访问性
public enum KeychainAccessibility: String {
    case afterFirstUnlock
    case afterFirstUnlockThisDeviceOnly
    case whenUnlocked
    case whenUnlockedThisDeviceOnly
    case whenPasscodeSetThisDeviceOnly
}

// MARK: - Storage 模块

public class StorageModule: BridgeModule {
    
    public let moduleName = "Storage"
    public let methods = [
        "Get", "Set", "Remove", "Clear", "GetKeys",
        "Has", "GetMultiple", "SetMultiple", "GetSize"
    ]
    
    private weak var bridge: WebViewBridge?
    
    /// 存储命名空间前缀
    private let storagePrefix = "webview_bridge_"
    
    /// Keychain 服务名称
    private let keychainService = "com.webview.bridge.storage"
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Get":
            get(params: params, callback: callback)
        case "Set":
            set(params: params, callback: callback)
        case "Remove":
            remove(params: params, callback: callback)
        case "Clear":
            clear(params: params, callback: callback)
        case "GetKeys":
            getKeys(params: params, callback: callback)
        case "Has":
            has(params: params, callback: callback)
        case "GetMultiple":
            getMultiple(params: params, callback: callback)
        case "SetMultiple":
            setMultiple(params: params, callback: callback)
        case "GetSize":
            getSize(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - Get
    
    private func get(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let key = params.getString("key") else {
            callback(.failure(BridgeError.invalidParams("key")))
            return
        }
        
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        let fullKey = storagePrefix + key
        
        switch securityLevel {
        case .standard:
            let value = UserDefaults.standard.string(forKey: fullKey)
            callback(.success([
                "key": key,
                "value": value ?? NSNull()
            ]))
            
        case .secure:
            if let value = keychainGet(key: fullKey) {
                callback(.success([
                    "key": key,
                    "value": value
                ]))
            } else {
                callback(.success([
                    "key": key,
                    "value": NSNull()
                ]))
            }
        }
    }
    
    // MARK: - Set
    
    private func set(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let key = params.getString("key") else {
            callback(.failure(BridgeError.invalidParams("key")))
            return
        }
        
        guard let value = params.getString("value") else {
            callback(.failure(BridgeError.invalidParams("value")))
            return
        }
        
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        let fullKey = storagePrefix + key
        
        switch securityLevel {
        case .standard:
            UserDefaults.standard.set(value, forKey: fullKey)
            UserDefaults.standard.synchronize()
            callback(.success(nil))
            
        case .secure:
            let accessibilityString = params.getString("accessibility") ?? "afterFirstUnlock"
            let accessibility = KeychainAccessibility(rawValue: accessibilityString) ?? .afterFirstUnlock
            
            if keychainSet(key: fullKey, value: value, accessibility: accessibility) {
                callback(.success(nil))
            } else {
                callback(.failure(BridgeError(code: .internalError, message: "Keychain 写入失败")))
            }
        }
    }
    
    // MARK: - Remove
    
    private func remove(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let key = params.getString("key") else {
            callback(.failure(BridgeError.invalidParams("key")))
            return
        }
        
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        let fullKey = storagePrefix + key
        
        switch securityLevel {
        case .standard:
            UserDefaults.standard.removeObject(forKey: fullKey)
            UserDefaults.standard.synchronize()
            callback(.success(nil))
            
        case .secure:
            keychainDelete(key: fullKey)
            callback(.success(nil))
        }
    }
    
    // MARK: - Clear
    
    private func clear(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        switch securityLevel {
        case .standard:
            let defaults = UserDefaults.standard
            let keys = defaults.dictionaryRepresentation().keys.filter { $0.hasPrefix(storagePrefix) }
            for key in keys {
                defaults.removeObject(forKey: key)
            }
            defaults.synchronize()
            callback(.success([
                "clearedCount": keys.count
            ]))
            
        case .secure:
            let count = keychainClearAll()
            callback(.success([
                "clearedCount": count
            ]))
        }
    }
    
    // MARK: - GetKeys
    
    private func getKeys(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        switch securityLevel {
        case .standard:
            let defaults = UserDefaults.standard
            let keys = defaults.dictionaryRepresentation().keys
                .filter { $0.hasPrefix(storagePrefix) }
                .map { String($0.dropFirst(storagePrefix.count)) }
            callback(.success([
                "keys": Array(keys)
            ]))
            
        case .secure:
            let keys = keychainGetAllKeys()
            callback(.success([
                "keys": keys
            ]))
        }
    }
    
    // MARK: - Has
    
    private func has(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let key = params.getString("key") else {
            callback(.failure(BridgeError.invalidParams("key")))
            return
        }
        
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        let fullKey = storagePrefix + key
        var exists = false
        
        switch securityLevel {
        case .standard:
            exists = UserDefaults.standard.object(forKey: fullKey) != nil
            
        case .secure:
            exists = keychainGet(key: fullKey) != nil
        }
        
        callback(.success([
            "key": key,
            "exists": exists
        ]))
    }
    
    // MARK: - GetMultiple
    
    private func getMultiple(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let keys = params["keys"]?.arrayValue as? [String] else {
            callback(.failure(BridgeError.invalidParams("keys")))
            return
        }
        
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        var results: [String: Any] = [:]
        
        for key in keys {
            let fullKey = storagePrefix + key
            
            switch securityLevel {
            case .standard:
                if let value = UserDefaults.standard.string(forKey: fullKey) {
                    results[key] = value
                } else {
                    results[key] = NSNull()
                }
                
            case .secure:
                if let value = keychainGet(key: fullKey) {
                    results[key] = value
                } else {
                    results[key] = NSNull()
                }
            }
        }
        
        callback(.success([
            "values": results
        ]))
    }
    
    // MARK: - SetMultiple
    
    private func setMultiple(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let items = params["items"]?.dictValue as? [String: String] else {
            callback(.failure(BridgeError.invalidParams("items")))
            return
        }
        
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        var successCount = 0
        var failedKeys: [String] = []
        
        for (key, value) in items {
            let fullKey = storagePrefix + key
            
            switch securityLevel {
            case .standard:
                UserDefaults.standard.set(value, forKey: fullKey)
                successCount += 1
                
            case .secure:
                if keychainSet(key: fullKey, value: value, accessibility: .afterFirstUnlock) {
                    successCount += 1
                } else {
                    failedKeys.append(key)
                }
            }
        }
        
        if securityLevel == .standard {
            UserDefaults.standard.synchronize()
        }
        
        callback(.success([
            "successCount": successCount,
            "failedKeys": failedKeys
        ]))
    }
    
    // MARK: - GetSize
    
    private func getSize(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let securityLevelString = params.getString("securityLevel") ?? "standard"
        let securityLevel = StorageSecurityLevel(rawValue: securityLevelString) ?? .standard
        
        switch securityLevel {
        case .standard:
            // 计算 UserDefaults 中存储的数据大小
            let defaults = UserDefaults.standard
            var totalSize = 0
            
            for (key, value) in defaults.dictionaryRepresentation() {
                if key.hasPrefix(storagePrefix) {
                    if let stringValue = value as? String {
                        totalSize += stringValue.utf8.count
                    }
                }
            }
            
            callback(.success([
                "bytes": totalSize,
                "formatted": formatBytes(totalSize)
            ]))
            
        case .secure:
            // Keychain 大小估算
            let keys = keychainGetAllKeys()
            var totalSize = 0
            
            for key in keys {
                if let value = keychainGet(key: storagePrefix + key) {
                    totalSize += value.utf8.count
                }
            }
            
            callback(.success([
                "bytes": totalSize,
                "formatted": formatBytes(totalSize)
            ]))
        }
    }
    
    // MARK: - Keychain 操作
    
    private func keychainGet(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess,
           let data = result as? Data,
           let string = String(data: data, encoding: .utf8) {
            return string
        }
        
        return nil
    }
    
    private func keychainSet(key: String, value: String, accessibility: KeychainAccessibility) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        
        // 先删除已存在的
        keychainDelete(key: key)
        
        let accessibilityAttr: CFString
        switch accessibility {
        case .afterFirstUnlock:
            accessibilityAttr = kSecAttrAccessibleAfterFirstUnlock
        case .afterFirstUnlockThisDeviceOnly:
            accessibilityAttr = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        case .whenUnlocked:
            accessibilityAttr = kSecAttrAccessibleWhenUnlocked
        case .whenUnlockedThisDeviceOnly:
            accessibilityAttr = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        case .whenPasscodeSetThisDeviceOnly:
            accessibilityAttr = kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
        }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: accessibilityAttr
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    private func keychainDelete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
    
    private func keychainClearAll() -> Int {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService
        ]
        
        // 获取所有项目数量
        let countQuery = query.merging([
            kSecMatchLimit as String: kSecMatchLimitAll,
            kSecReturnAttributes as String: true
        ]) { $1 }
        
        var result: AnyObject?
        let countStatus = SecItemCopyMatching(countQuery as CFDictionary, &result)
        
        var count = 0
        if countStatus == errSecSuccess, let items = result as? [[String: Any]] {
            count = items.count
        }
        
        // 删除所有项目
        SecItemDelete(query as CFDictionary)
        
        return count
    }
    
    private func keychainGetAllKeys() -> [String] {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecMatchLimit as String: kSecMatchLimitAll,
            kSecReturnAttributes as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, let items = result as? [[String: Any]] {
            return items.compactMap { item in
                if let account = item[kSecAttrAccount as String] as? String,
                   account.hasPrefix(storagePrefix) {
                    return String(account.dropFirst(storagePrefix.count))
                }
                return nil
            }
        }
        
        return []
    }
    
    // MARK: - 辅助方法
    
    private func formatBytes(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .binary
        return formatter.string(fromByteCount: Int64(bytes))
    }
}
