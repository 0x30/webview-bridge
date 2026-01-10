/**
 * WebView Bridge SDK - 模块协议
 *
 * 定义 Bridge 模块的基础协议
 */

import Foundation

// MARK: - 模块协议

/// Bridge 模块协议
/// 所有能力模块都必须实现此协议
public protocol BridgeModule: AnyObject {
    /// 模块名称（必须唯一）
    var moduleName: String { get }
    
    /// 支持的方法列表
    var methods: [String] { get }
    
    /// 处理请求
    /// - Parameters:
    ///   - method: 方法名
    ///   - params: 请求参数
    ///   - callback: 完成回调
    func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    )
}

// MARK: - 默认实现

public extension BridgeModule {
    /// 检查是否支持某个方法
    func supportsMethod(_ method: String) -> Bool {
        return methods.contains(method)
    }
}

// MARK: - 模块上下文

/// 模块上下文，提供对 Bridge 核心功能的访问
public protocol BridgeModuleContext: AnyObject {
    /// 发送事件到 Web
    func sendEvent(_ event: BridgeEvent)
    
    /// 获取当前 WebView（如果需要）
    var webView: Any? { get }
}

// MARK: - 可配置模块

/// 可配置的模块协议
public protocol ConfigurableBridgeModule: BridgeModule {
    associatedtype Configuration
    
    /// 配置模块
    func configure(with configuration: Configuration)
}

// MARK: - 生命周期感知模块

/// 生命周期感知模块协议
public protocol LifecycleAwareBridgeModule: BridgeModule {
    /// Bridge 已准备就绪
    func onBridgeReady()
    
    /// Bridge 即将销毁
    func onBridgeWillDestroy()
    
    /// 应用进入前台
    func onAppWillEnterForeground()
    
    /// 应用进入后台
    func onAppDidEnterBackground()
}

// MARK: - 默认生命周期实现

public extension LifecycleAwareBridgeModule {
    func onBridgeReady() {}
    func onBridgeWillDestroy() {}
    func onAppWillEnterForeground() {}
    func onAppDidEnterBackground() {}
}
