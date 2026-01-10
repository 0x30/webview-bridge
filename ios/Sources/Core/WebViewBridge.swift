/**
 * WebView Bridge SDK - 核心 Bridge 实现
 *
 * 管理 JS ↔ Native 通信、模块注册、请求路由
 */

import Foundation
import WebKit

// MARK: - Bridge 配置

/// URL Scheme 配置
public struct URLSchemeConfiguration {
    /// 自定义 scheme (如 "app")
    public var scheme: String

    /// 主机名 (如 "localhost")
    public var host: String

    /// 本地资源根目录
    public var resourcePath: String

    /// 默认配置
    public static let `default` = URLSchemeConfiguration(
        scheme: "app",
        host: "localhost",
        resourcePath: "www"
    )

    public init(scheme: String, host: String, resourcePath: String) {
        self.scheme = scheme
        self.host = host
        self.resourcePath = resourcePath
    }
}

/// Bridge 配置
public struct BridgeConfiguration {
    /// 是否启用调试模式
    public var debug: Bool

    /// 消息处理器名称（用于 WKWebView）
    public var messageHandlerName: String

    /// URL Scheme 配置（可选，nil 表示不启用自定义 scheme）
    public var urlScheme: URLSchemeConfiguration?

    /// 是否允许加载 HTTP URL（用于开发调试）
    public var allowsHTTPLoading: Bool

    /// 默认配置
    public static let `default` = BridgeConfiguration(
        debug: false,
        messageHandlerName: "bridge",
        urlScheme: nil,
        allowsHTTPLoading: false
    )

    /// 开发调试配置（允许 HTTP 加载）
    public static let development = BridgeConfiguration(
        debug: true,
        messageHandlerName: "bridge",
        urlScheme: nil,
        allowsHTTPLoading: true
    )

    /// 带自定义 Scheme 的配置
    public static func withURLScheme(_ scheme: URLSchemeConfiguration)
        -> BridgeConfiguration
    {
        return BridgeConfiguration(
            debug: false,
            messageHandlerName: "bridge",
            urlScheme: scheme,
            allowsHTTPLoading: false
        )
    }

    public init(
        debug: Bool = false,
        messageHandlerName: String = "bridge",
        urlScheme: URLSchemeConfiguration? = nil,
        allowsHTTPLoading: Bool = false
    ) {
        self.debug = debug
        self.messageHandlerName = messageHandlerName
        self.urlScheme = urlScheme
        self.allowsHTTPLoading = allowsHTTPLoading
    }
}

// MARK: - Bridge 核心

/// WebView Bridge 核心类
public class WebViewBridge: NSObject {

    // MARK: - 属性

    /// 配置
    public let configuration: BridgeConfiguration

    /// 关联的 WebView
    public private(set) weak var webView: WKWebView?

    /// 已注册的模块
    private var modules: [String: BridgeModule] = [:]

    /// 是否已就绪
    public private(set) var isReady: Bool = false

    /// 日志输出
    private var logger: BridgeLogger

    /// URL Scheme Handler（可选）
    private var schemeHandler: LocalResourceLoader?

    /// 启动参数
    private var launchParams: [String: Any] = [:]

    // MARK: - 初始化

    /// 创建 Bridge 实例
    /// - Parameters:
    ///   - webView: 关联的 WKWebView
    ///   - configuration: 配置
    public init(
        webView: WKWebView,
        configuration: BridgeConfiguration = .default
    ) {
        self.webView = webView
        self.configuration = configuration
        self.logger = BridgeLogger(debug: configuration.debug)
        super.init()

        setupMessageHandler()
        setupURLSchemeHandler()
        registerBuiltInModules()
        observeAppLifecycle()
    }

    /// 创建 Bridge 并自动配置 WebView
    /// - Parameters:
    ///   - frame: WebView frame
    ///   - configuration: Bridge 配置
    /// - Returns: 配置好的 Bridge 和 WebView
    public static func create(
        frame: CGRect = .zero,
        configuration: BridgeConfiguration = .default
    ) -> (bridge: WebViewBridge, webView: WKWebView) {
        let webViewConfig = WKWebViewConfiguration()
        webViewConfig.allowsInlineMediaPlayback = true

        // 如果配置了 URL Scheme，添加 handler
        var schemeHandler: LocalResourceLoader?
        if let urlScheme = configuration.urlScheme {
            schemeHandler = LocalResourceLoader(configuration: urlScheme)
            webViewConfig.setURLSchemeHandler(
                schemeHandler,
                forURLScheme: urlScheme.scheme
            )
        }

        let webView = WKWebView(frame: frame, configuration: webViewConfig)

        #if DEBUG
            if #available(iOS 16.4, *) {
                webView.isInspectable = configuration.debug
            }
        #endif

        let bridge = WebViewBridge(
            webView: webView,
            configuration: configuration
        )
        bridge.schemeHandler = schemeHandler

        return (bridge, webView)
    }

    deinit {
        cleanup()
    }

    // MARK: - 设置

    /// 设置消息处理器
    private func setupMessageHandler() {
        guard let webView = webView else { return }

        // 添加消息处理器
        webView.configuration.userContentController.add(
            self,
            name: configuration.messageHandlerName
        )

        logger.log("消息处理器已设置: \(configuration.messageHandlerName)")
    }

    /// 设置 URL Scheme Handler
    private func setupURLSchemeHandler() {
        guard let webView = webView,
            let urlScheme = configuration.urlScheme
        else { return }

        // 检查是否已注册（避免重复注册）
        if schemeHandler == nil {
            schemeHandler = LocalResourceLoader(configuration: urlScheme)
            // 注意：如果 webView 已创建，无法在此添加 scheme handler
            // 需要使用 create() 工厂方法
            logger.log("URL Scheme 配置: \(urlScheme.scheme)://\(urlScheme.host)")
        }
    }

    /// 注册内置模块
    private func registerBuiltInModules() {
        register(module: AppModule(bridge: self))
        register(module: BiometricsModule(bridge: self))
        register(module: ClipboardModule(bridge: self))
        register(module: ContactsModule(bridge: self))
        register(module: DeviceModule(bridge: self))
        register(module: HapticsModule(bridge: self))
        register(module: LocationModule(bridge: self))
        register(module: MediaModule(bridge: self))
        register(module: NetworkModule(bridge: self))
        register(module: NFCModule(bridge: self))
        register(module: PermissionModule(bridge: self))
        register(module: StatusBarModule(bridge: self))
        register(module: StorageModule(bridge: self))
        register(module: SystemModule(bridge: self))

        logger.log("已注册 \(modules.count) 个内置模块")
    }

    /// 监听应用生命周期
    private func observeAppLifecycle() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
    }

    // MARK: - 模块管理

    /// 注册模块
    /// - Parameter module: 要注册的模块
    public func register(module: BridgeModule) {
        modules[module.moduleName] = module
        logger.log("注册模块: \(module.moduleName), 方法: \(module.methods)")
    }

    /// 注销模块
    /// - Parameter moduleName: 模块名称
    public func unregister(moduleName: String) {
        modules.removeValue(forKey: moduleName)
        logger.log("注销模块: \(moduleName)")
    }

    /// 获取已注册的模块
    /// - Parameter name: 模块名称
    /// - Returns: 模块实例
    public func getModule(_ name: String) -> BridgeModule? {
        return modules[name]
    }

    /// 获取所有已注册的模块名称
    public var registeredModuleNames: [String] {
        return Array(modules.keys)
    }

    // MARK: - 请求处理

    /// 处理来自 JS 的请求
    /// - Parameter messageBody: 消息内容
    private func handleMessage(_ messageBody: Any) {
        guard let messageString = messageBody as? String else {
            logger.error("无效的消息格式")
            return
        }

        logger.log("收到请求: \(messageString)")

        // 解析请求
        guard let data = messageString.data(using: .utf8),
            let request = try? JSONDecoder().decode(
                BridgeRequest.self,
                from: data
            )
        else {
            logger.error("JSON 解析失败")
            return
        }

        // 验证协议版本
        guard request.version == BridgeProtocolVersion else {
            sendResponse(
                .error(
                    callbackId: request.callbackId,
                    code: .invalidVersion,
                    msg: "不支持的协议版本: \(request.version)"
                )
            )
            return
        }

        // 查找模块
        guard let module = modules[request.moduleName] else {
            sendResponse(
                .error(
                    callbackId: request.callbackId,
                    code: .moduleNotFound,
                    msg: "模块不存在: \(request.moduleName)"
                )
            )
            return
        }

        // 检查方法是否支持
        guard module.supportsMethod(request.methodName) else {
            sendResponse(
                .error(
                    callbackId: request.callbackId,
                    code: .methodNotFound,
                    msg: "方法不存在: \(request.type)"
                )
            )
            return
        }

        // 调用模块处理请求
        module.handleRequest(
            method: request.methodName,
            params: request.params
        ) { [weak self] result in
            switch result {
            case .success(let data):
                self?.sendResponse(
                    .success(callbackId: request.callbackId, data: data)
                )
            case .failure(let error):
                self?.sendResponse(
                    .error(
                        callbackId: request.callbackId,
                        code: error.code,
                        msg: error.message
                    )
                )
            }
        }
    }

    // MARK: - 响应发送

    /// 发送响应到 JS
    /// - Parameter response: 响应对象
    public func sendResponse(_ response: BridgeResponse) {
        guard let jsonData = try? JSONEncoder().encode(response),
            let jsonString = String(data: jsonData, encoding: .utf8)
        else {
            logger.error("响应序列化失败")
            return
        }

        let escapedJson =
            jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")

        let script =
            "window.__bridgeCallback && window.__bridgeCallback('\(escapedJson)')"

        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(script) { _, error in
                if let error = error {
                    self?.logger.error("响应发送失败: \(error)")
                } else {
                    self?.logger.log("响应已发送: \(response.callbackId)")
                }
            }
        }
    }

    // MARK: - 事件发送

    /// 发送事件到 JS
    /// - Parameter event: 事件对象
    public func sendEvent(_ event: BridgeEvent) {
        guard let jsonData = try? JSONEncoder().encode(event),
            let jsonString = String(data: jsonData, encoding: .utf8)
        else {
            logger.error("事件序列化失败")
            return
        }

        let escapedJson =
            jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")

        let script =
            "window.__bridgeEvent && window.__bridgeEvent('\(escapedJson)')"

        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(script) { _, error in
                if let error = error {
                    self?.logger.error("事件发送失败: \(error)")
                } else {
                    self?.logger.log("事件已发送: \(event.event)")
                }
            }
        }
    }

    // MARK: - 生命周期

    /// 标记 Bridge 就绪
    public func markReady() {
        guard !isReady else { return }
        isReady = true

        // 通知所有生命周期感知模块
        modules.values.compactMap { $0 as? LifecycleAwareBridgeModule }.forEach
        {
            $0.onBridgeReady()
        }

        logger.log("Bridge 已就绪")
    }

    @objc private func appWillEnterForeground() {
        sendEvent(
            BridgeEvent(
                event: "App.Foreground",
                data: ["timestamp": Date().timeIntervalSince1970]
            )
        )

        modules.values.compactMap { $0 as? LifecycleAwareBridgeModule }.forEach
        {
            $0.onAppWillEnterForeground()
        }
    }

    @objc private func appDidEnterBackground() {
        sendEvent(
            BridgeEvent(
                event: "App.Background",
                data: ["timestamp": Date().timeIntervalSince1970]
            )
        )

        modules.values.compactMap { $0 as? LifecycleAwareBridgeModule }.forEach
        {
            $0.onAppDidEnterBackground()
        }
    }

    /// 清理资源
    private func cleanup() {
        NotificationCenter.default.removeObserver(self)

        // 通知所有生命周期感知模块
        modules.values.compactMap { $0 as? LifecycleAwareBridgeModule }.forEach
        {
            $0.onBridgeWillDestroy()
        }

        // 移除消息处理器
        webView?.configuration.userContentController.removeScriptMessageHandler(
            forName: configuration.messageHandlerName
        )

        modules.removeAll()
        logger.log("Bridge 已清理")
    }

    // MARK: - 启动参数

    /// 设置启动参数
    /// - Parameter params: 参数字典
    public func setLaunchParams(_ params: [String: Any]) {
        self.launchParams = params
    }

    /// 获取启动参数
    public func getLaunchParams() -> [String: Any] {
        return launchParams
    }

    // MARK: - 页面加载

    /// 加载本地 HTML 文件（使用自定义 URL Scheme）
    /// - Parameter path: 相对于 resourcePath 的路径
    public func loadLocalHTML(path: String) {
        guard let webView = webView else {
            logger.error("WebView 未设置")
            return
        }

        if let urlScheme = configuration.urlScheme {
            // 使用自定义 scheme 加载
            let urlString = "\(urlScheme.scheme)://\(urlScheme.host)/\(path)"
            if let url = URL(string: urlString) {
                webView.load(URLRequest(url: url))
                logger.log("加载本地资源: \(urlString)")
            }
        } else {
            // 直接从 Bundle 加载
            if let url = Bundle.main.url(forResource: path, withExtension: nil)
            {
                webView.loadFileURL(
                    url,
                    allowingReadAccessTo: url.deletingLastPathComponent()
                )
                logger.log("从 Bundle 加载: \(path)")
            } else {
                logger.error("找不到资源: \(path)")
            }
        }
    }

    /// 加载远程 URL（用于开发调试）
    /// - Parameter urlString: 远程 URL 字符串
    public func loadURL(_ urlString: String) {
        guard let webView = webView else {
            logger.error("WebView 未设置")
            return
        }

        guard let url = URL(string: urlString) else {
            logger.error("无效的 URL: \(urlString)")
            return
        }

        // 检查是否允许 HTTP 加载
        if url.scheme == "http" && !configuration.allowsHTTPLoading {
            logger.error("不允许加载 HTTP URL，请使用 HTTPS 或启用 allowsHTTPLoading")
            return
        }

        webView.load(URLRequest(url: url))
        logger.log("加载远程 URL: \(urlString)")
    }

    /// 重新加载当前页面
    public func reload() {
        webView?.reload()
        logger.log("重新加载页面")
    }

    // MARK: - 生命周期通知（供宿主调用）

    /// 应用进入前台时调用
    public func onResume() {
        appWillEnterForeground()
    }

    /// 应用进入后台时调用
    public func onPause() {
        appDidEnterBackground()
    }
}

// MARK: - WKScriptMessageHandler

extension WebViewBridge: WKScriptMessageHandler {
    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == configuration.messageHandlerName else { return }
        handleMessage(message.body)
    }
}

// MARK: - BridgeModuleContext

extension WebViewBridge: BridgeModuleContext {
    public var webViewInstance: Any? {
        return webView
    }
}

// MARK: - 日志

/// Bridge 日志器
private struct BridgeLogger {
    let debug: Bool

    func log(_ message: String) {
        guard debug else { return }
        print("[Bridge] \(message)")
    }

    func error(_ message: String) {
        print("[Bridge Error] \(message)")
    }
}
