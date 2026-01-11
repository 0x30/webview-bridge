/**
 * Navigator 模块 - 页面栈管理（类似小程序）
 *
 * 提供多 WebView 页面栈管理，支持页面间通信
 * 
 * 功能：
 * - Push: 打开新页面
 * - Pop: 关闭当前页面
 * - PostMessage: 向其他页面发送消息
 * - GetPages: 获取页面栈信息
 * - GetCurrentPage: 获取当前页面信息
 */

import Foundation
import WebKit

// MARK: - 页面信息

/// 页面信息
public struct PageInfo {
    public let id: String
    public let url: String
    public var title: String?
    public let index: Int
    public let createdAt: Date
    
    public var dictionary: [String: Any] {
        return [
            "id": id,
            "url": url,
            "title": title ?? "",
            "index": index,
            "createdAt": createdAt.timeIntervalSince1970 * 1000
        ]
    }
}

// MARK: - 页面栈管理器

/// 页面栈管理器（单例）
public class PageStackManager {
    
    public static let shared = PageStackManager()
    
    /// 页面栈
    private var pageStack: [(info: PageInfo, bridge: WebViewBridge, viewController: UIViewController)] = []
    
    /// 页面ID计数器
    private var pageIdCounter = 0
    
    /// 根视图控制器（用于 push/pop）
    public weak var rootNavigationController: UINavigationController?
    
    /// WebView 配置工厂（用于创建新的 WebView）
    public var webViewConfigFactory: (() -> WKWebViewConfiguration)?
    
    /// 页面创建回调（用于自定义页面样式）
    public var pageFactory: ((String, String?, [String: Any]?) -> UIViewController)?
    
    private init() {}
    
    // MARK: - 页面栈操作
    
    /// 生成新的页面ID
    private func generatePageId() -> String {
        pageIdCounter += 1
        return "page_\(pageIdCounter)_\(Int(Date().timeIntervalSince1970 * 1000))"
    }
    
    /// 获取当前页面
    public var currentPage: (info: PageInfo, bridge: WebViewBridge, viewController: UIViewController)? {
        return pageStack.last
    }
    
    /// 获取页面栈信息
    public var pages: [PageInfo] {
        return pageStack.map { $0.info }
    }
    
    /// 根据ID获取页面
    public func getPage(byId id: String) -> (info: PageInfo, bridge: WebViewBridge, viewController: UIViewController)? {
        return pageStack.first { $0.info.id == id }
    }
    
    /// 注册根页面（首次加载的页面）
    public func registerRootPage(bridge: WebViewBridge, viewController: UIViewController, url: String, title: String? = nil) {
        let pageId = generatePageId()
        let info = PageInfo(id: pageId, url: url, title: title, index: 0, createdAt: Date())
        pageStack.append((info, bridge, viewController))
        
        // 发送页面创建事件
        bridge.sendEvent("Navigator.PageCreated", data: info.dictionary)
    }
    
    /// Push 新页面
    public func push(
        url: String,
        title: String? = nil,
        data: [String: Any]? = nil,
        animated: Bool = true,
        navigationBarHidden: Bool = false,
        from sourceBridge: WebViewBridge,
        completion: @escaping (Result<PageInfo, Error>) -> Void
    ) {
        guard let navController = rootNavigationController else {
            completion(.failure(BridgeError.unknown("NavigationController 未设置")))
            return
        }
        
        let pageId = generatePageId()
        let index = pageStack.count
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // 创建新的 WebView 和 Bridge
            let config = self.webViewConfigFactory?() ?? WKWebViewConfiguration()
            let webView = WKWebView(frame: .zero, configuration: config)
            webView.translatesAutoresizingMaskIntoConstraints = false
            
            // 创建 Bridge
            let bridge = WebViewBridge(webView: webView)
            
            // 注册 Navigator 模块
            let navigatorModule = NavigatorModule(bridge: bridge)
            bridge.register(module: navigatorModule)
            
            // 创建视图控制器
            let viewController: UIViewController
            if let factory = self.pageFactory {
                viewController = factory(url, title, data)
            } else {
                viewController = NavigatorPageViewController(
                    webView: webView,
                    bridge: bridge,
                    pageId: pageId,
                    initialData: data,
                    navigationBarHidden: navigationBarHidden
                )
            }
            
            viewController.title = title
            
            // 创建页面信息
            let info = PageInfo(id: pageId, url: url, title: title, index: index, createdAt: Date())
            
            // 加入页面栈
            self.pageStack.append((info, bridge, viewController))
            
            // 加载 URL
            if let pageUrl = URL(string: url) {
                webView.load(URLRequest(url: pageUrl))
            }
            
            // Push 视图控制器
            navController.pushViewController(viewController, animated: animated)
            
            // 发送事件给源页面
            sourceBridge.sendEvent("Navigator.PageOpened", data: info.dictionary)
            
            // 发送页面创建事件给新页面
            bridge.sendEvent("Navigator.PageCreated", data: [
                "page": info.dictionary,
                "data": data ?? [:]
            ])
            
            // 发送启动数据给新页面
            if let launchData = data {
                bridge.sendEvent("Navigator.LaunchData", data: launchData)
            }
            
            completion(.success(info))
        }
    }
    
    /// Pop 当前页面
    public func pop(
        result: [String: Any]? = nil,
        delta: Int = 1,
        animated: Bool = true,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        guard pageStack.count > 1 else {
            completion(.failure(BridgeError.unknown("已经是根页面，无法 pop")))
            return
        }
        
        guard let navController = rootNavigationController else {
            completion(.failure(BridgeError.unknown("NavigationController 未设置")))
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let popCount = min(delta, self.pageStack.count - 1)
            
            // 获取要返回的目标页面
            let targetIndex = self.pageStack.count - popCount - 1
            let targetPage = self.pageStack[targetIndex]
            
            // 移除页面
            var poppedPages: [PageInfo] = []
            for _ in 0..<popCount {
                if let popped = self.pageStack.popLast() {
                    poppedPages.append(popped.info)
                    // 发送页面销毁事件
                    popped.bridge.sendEvent("Navigator.PageDestroyed", data: popped.info.dictionary)
                }
            }
            
            // 发送返回结果给目标页面
            if let resultData = result {
                targetPage.bridge.sendEvent("Navigator.Result", data: [
                    "from": poppedPages.first?.dictionary ?? [:],
                    "result": resultData
                ])
            }
            
            // Pop 视图控制器
            if popCount == 1 {
                navController.popViewController(animated: animated)
            } else {
                let targetVC = navController.viewControllers[navController.viewControllers.count - popCount - 1]
                navController.popToViewController(targetVC, animated: animated)
            }
            
            completion(.success(()))
        }
    }
    
    /// 向指定页面发送消息
    public func postMessage(
        to targetPageId: String?,
        message: [String: Any],
        from sourcePageId: String
    ) -> Bool {
        let sourceInfo = pageStack.first { $0.info.id == sourcePageId }?.info
        
        if let targetId = targetPageId {
            // 发送给指定页面
            guard let target = getPage(byId: targetId) else {
                return false
            }
            target.bridge.sendEvent("Navigator.Message", data: [
                "from": sourceInfo?.dictionary ?? [:],
                "message": message
            ])
            return true
        } else {
            // 广播给所有其他页面
            for page in pageStack where page.info.id != sourcePageId {
                page.bridge.sendEvent("Navigator.Message", data: [
                    "from": sourceInfo?.dictionary ?? [:],
                    "message": message
                ])
            }
            return true
        }
    }
    
    /// 移除页面（当页面被系统销毁时调用）
    public func removePage(byId id: String) {
        pageStack.removeAll { $0.info.id == id }
    }
}

// MARK: - Navigator 模块

/// Navigator 模块
public class NavigatorModule: NSObject, BridgeModule {
    
    public var moduleName: String { "Navigator" }
    
    public var methods: [String] {
        [
            "Push",
            "Pop",
            "PopToRoot",
            "Replace",
            "PostMessage",
            "GetPages",
            "GetCurrentPage",
            "SetTitle",
            "Close"
        ]
    }
    
    weak var bridge: WebViewBridge?
    private var currentPageId: String?
    
    public init(bridge: WebViewBridge? = nil) {
        self.bridge = bridge
        super.init()
    }
    
    /// 设置当前页面ID
    public func setCurrentPageId(_ id: String) {
        self.currentPageId = id
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Push":
            push(params: params, callback: callback)
        case "Pop":
            pop(params: params, callback: callback)
        case "PopToRoot":
            popToRoot(params: params, callback: callback)
        case "Replace":
            replace(params: params, callback: callback)
        case "PostMessage":
            postMessage(params: params, callback: callback)
        case "GetPages":
            getPages(callback: callback)
        case "GetCurrentPage":
            getCurrentPage(callback: callback)
        case "SetTitle":
            setTitle(params: params, callback: callback)
        case "Close":
            close(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - Push
    
    private func push(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let url = params.getString("url") else {
            callback(.failure(BridgeError.invalidParams("url 参数必需")))
            return
        }
        
        guard let sourceBridge = bridge else {
            callback(.failure(BridgeError.unknown("Bridge 未初始化")))
            return
        }
        
        let title = params.getString("title")
        let data = params["data"]?.dictionaryValue
        let animated = params.getBool("animated") ?? true
        let navigationBarHidden = params.getBool("navigationBarHidden") ?? false
        
        PageStackManager.shared.push(
            url: url,
            title: title,
            data: data,
            animated: animated,
            navigationBarHidden: navigationBarHidden,
            from: sourceBridge
        ) { result in
            switch result {
            case .success(let pageInfo):
                callback(.success(pageInfo.dictionary))
            case .failure(let error):
                callback(.failure(BridgeError.unknown(error.localizedDescription)))
            }
        }
    }
    
    // MARK: - Pop
    
    private func pop(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let result = params["result"]?.dictionaryValue
        let delta = params.getInt("delta") ?? 1
        let animated = params.getBool("animated") ?? true
        
        PageStackManager.shared.pop(
            result: result,
            delta: delta,
            animated: animated
        ) { popResult in
            switch popResult {
            case .success:
                callback(.success(["popped": true]))
            case .failure(let error):
                callback(.failure(BridgeError.unknown(error.localizedDescription)))
            }
        }
    }
    
    // MARK: - PopToRoot
    
    private func popToRoot(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let animated = params.getBool("animated") ?? true
        let pages = PageStackManager.shared.pages
        
        if pages.count <= 1 {
            callback(.success(["popped": false, "reason": "已经是根页面"]))
            return
        }
        
        PageStackManager.shared.pop(
            result: nil,
            delta: pages.count - 1,
            animated: animated
        ) { result in
            switch result {
            case .success:
                callback(.success(["popped": true]))
            case .failure(let error):
                callback(.failure(BridgeError.unknown(error.localizedDescription)))
            }
        }
    }
    
    // MARK: - Replace
    
    private func replace(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let url = params.getString("url") else {
            callback(.failure(BridgeError.invalidParams("url 参数必需")))
            return
        }
        
        // 先 pop 当前页面，再 push 新页面
        // 这是简化实现，实际可能需要更复杂的逻辑
        guard let sourceBridge = bridge else {
            callback(.failure(BridgeError.unknown("Bridge 未初始化")))
            return
        }
        
        let title = params.getString("title")
        let data = params["data"]?.dictionaryValue
        
        // 先 push 新页面
        PageStackManager.shared.push(
            url: url,
            title: title,
            data: data,
            animated: false,
            from: sourceBridge
        ) { result in
            switch result {
            case .success(let pageInfo):
                // TODO: 移除旧页面
                callback(.success(pageInfo.dictionary))
            case .failure(let error):
                callback(.failure(BridgeError.unknown(error.localizedDescription)))
            }
        }
    }
    
    // MARK: - PostMessage
    
    private func postMessage(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let message = params["message"]?.dictionaryValue else {
            callback(.failure(BridgeError.invalidParams("message 参数必需")))
            return
        }
        
        let targetPageId = params.getString("targetPageId")
        let sourcePageId = currentPageId ?? PageStackManager.shared.currentPage?.info.id ?? ""
        
        let success = PageStackManager.shared.postMessage(
            to: targetPageId,
            message: message,
            from: sourcePageId
        )
        
        callback(.success(["sent": success]))
    }
    
    // MARK: - GetPages
    
    private func getPages(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let pages = PageStackManager.shared.pages.map { $0.dictionary }
        callback(.success(["pages": pages, "count": pages.count]))
    }
    
    // MARK: - GetCurrentPage
    
    private func getCurrentPage(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        if let current = PageStackManager.shared.currentPage {
            callback(.success(current.info.dictionary))
        } else {
            callback(.failure(BridgeError.unknown("没有当前页面")))
        }
    }
    
    // MARK: - SetTitle
    
    private func setTitle(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let title = params.getString("title") else {
            callback(.failure(BridgeError.invalidParams("title 参数必需")))
            return
        }
        
        DispatchQueue.main.async {
            if let current = PageStackManager.shared.currentPage {
                current.viewController.title = title
                callback(.success(["set": true]))
            } else {
                callback(.failure(BridgeError.unknown("没有当前页面")))
            }
        }
    }
    
    // MARK: - Close
    
    private func close(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let result = params["result"]?.dictionaryValue
        let animated = params.getBool("animated") ?? true
        
        // Close 就是 Pop 当前页面
        PageStackManager.shared.pop(
            result: result,
            delta: 1,
            animated: animated
        ) { popResult in
            switch popResult {
            case .success:
                callback(.success(["closed": true]))
            case .failure(let error):
                callback(.failure(BridgeError.unknown(error.localizedDescription)))
            }
        }
    }
}

// MARK: - Navigator 页面视图控制器

/// Navigator 页面视图控制器
public class NavigatorPageViewController: UIViewController {
    
    public let webView: WKWebView
    public let bridge: WebViewBridge
    public let pageId: String
    public var initialData: [String: Any]?
    public let navigationBarHidden: Bool
    
    public init(
        webView: WKWebView,
        bridge: WebViewBridge,
        pageId: String,
        initialData: [String: Any]? = nil,
        navigationBarHidden: Bool = false
    ) {
        self.webView = webView
        self.bridge = bridge
        self.pageId = pageId
        self.initialData = initialData
        self.navigationBarHidden = navigationBarHidden
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        
        view.backgroundColor = .systemBackground
        view.addSubview(webView)
        
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        // 添加返回按钮（仅在显示导航栏时）
        if !navigationBarHidden {
            navigationItem.leftBarButtonItem = UIBarButtonItem(
                title: "返回",
                style: .plain,
                target: self,
                action: #selector(handleBack)
            )
        }
    }
    
    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // 隐藏或显示导航栏
        navigationController?.setNavigationBarHidden(navigationBarHidden, animated: animated)
    }
    
    @objc private func handleBack() {
        // 通过 Navigator.Pop 返回
        PageStackManager.shared.pop(result: nil, delta: 1, animated: true) { _ in }
    }
    
    public override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // 如果是被 pop，从页面栈中移除
        if isMovingFromParent {
            PageStackManager.shared.removePage(byId: pageId)
        }
    }
    
    deinit {
        PageStackManager.shared.removePage(byId: pageId)
    }
}
