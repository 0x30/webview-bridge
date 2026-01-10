/**
 * Network 模块 - 网络状态监控
 *
 * 提供网络连接状态检查和监听功能
 */

import Foundation
import Network

// MARK: - Network 模块

@available(iOS 12.0, *)
public class NetworkModule: BridgeModule {
    
    public let moduleName = "Network"
    public let methods = [
        "GetStatus",
        "StartMonitoring",
        "StopMonitoring"
    ]
    
    private weak var bridge: WebViewBridge?
    private var monitor: NWPathMonitor?
    private var isMonitoring = false
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetStatus":
            getStatus(callback: callback)
        case "StartMonitoring":
            startMonitoring(callback: callback)
        case "StopMonitoring":
            stopMonitoring(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - GetStatus
    
    /// 获取当前网络状态
    private func getStatus(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let monitor = NWPathMonitor()
        let queue = DispatchQueue(label: "NetworkStatusCheck")
        
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            
            let status = self.pathToStatus(path)
            monitor.cancel()
            
            DispatchQueue.main.async {
                callback(.success(status))
            }
        }
        
        monitor.start(queue: queue)
    }
    
    // MARK: - StartMonitoring
    
    /// 开始监听网络状态变化
    private func startMonitoring(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard !isMonitoring else {
            callback(.success(["monitoring": true, "message": "已在监听中"]))
            return
        }
        
        monitor = NWPathMonitor()
        let queue = DispatchQueue(label: "NetworkMonitor")
        
        monitor?.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            
            let status = self.pathToStatus(path)
            
            DispatchQueue.main.async {
                self.bridge?.sendEvent(BridgeEvent(
                    event: "Network.StatusChanged",
                    data: status
                ))
            }
        }
        
        monitor?.start(queue: queue)
        isMonitoring = true
        
        callback(.success(["monitoring": true]))
    }
    
    // MARK: - StopMonitoring
    
    /// 停止监听网络状态
    private func stopMonitoring(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        monitor?.cancel()
        monitor = nil
        isMonitoring = false
        
        callback(.success(["monitoring": false]))
    }
    
    // MARK: - 辅助方法
    
    private func pathToStatus(_ path: NWPath) -> [String: Any] {
        let isConnected = path.status == .satisfied
        
        var connectionType = "unknown"
        var isExpensive = false
        var isConstrained = false
        var supportsIPv4 = false
        var supportsIPv6 = false
        var supportsDNS = false
        
        if path.usesInterfaceType(.wifi) {
            connectionType = "wifi"
        } else if path.usesInterfaceType(.cellular) {
            connectionType = "cellular"
        } else if path.usesInterfaceType(.wiredEthernet) {
            connectionType = "ethernet"
        } else if path.usesInterfaceType(.loopback) {
            connectionType = "loopback"
        } else if path.usesInterfaceType(.other) {
            connectionType = "other"
        } else if !isConnected {
            connectionType = "none"
        }
        
        isExpensive = path.isExpensive
        if #available(iOS 13.0, *) {
            isConstrained = path.isConstrained
        }
        supportsIPv4 = path.supportsIPv4
        supportsIPv6 = path.supportsIPv6
        supportsDNS = path.supportsDNS
        
        return [
            "isConnected": isConnected,
            "type": connectionType,
            "isExpensive": isExpensive,
            "isConstrained": isConstrained,
            "supportsIPv4": supportsIPv4,
            "supportsIPv6": supportsIPv6,
            "supportsDNS": supportsDNS
        ]
    }
    
    deinit {
        monitor?.cancel()
    }
}
