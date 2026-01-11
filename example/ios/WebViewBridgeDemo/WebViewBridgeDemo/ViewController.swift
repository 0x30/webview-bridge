import UIKit
import WebKit
import WebViewBridge

/// 加载模式
enum LoadMode: String, CaseIterable {
    case remoteURL = "remoteURL"
    case localAssets = "localAssets"
    case downloadZip = "downloadZip"

    var displayName: String {
        switch self {
        case .remoteURL: return "远程 URL"
        case .localAssets: return "本地资源"
        case .downloadZip: return "下载 ZIP"
        }
    }
}

/// 主视图控制器
/// 演示 WebViewBridge SDK 的使用
class ViewController: UIViewController {

    // MARK: - Properties

    /// WebView 实例
    private var webView: WKWebView!

    /// Bridge 实例
    private var bridge: WebViewBridge!

    /// 当前加载模式
    private var loadMode: LoadMode = .remoteURL

    /// 远程 URL 地址
    private let remoteURL = "http://localhost:5173"

    /// ZIP 下载地址
    private let zipURL = "http://localhost:5173/web-bundle.zip"

    /// UserDefaults key
    private let loadModeKey = "webview_load_mode"
    private let firstLaunchKey = "has_launched_before"

    /// 是否首次启动
    private var isFirstLaunch: Bool {
        return !UserDefaults.standard.bool(forKey: firstLaunchKey)
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        setupWebView()
        setupBridge()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.showLoadModeSelector()
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        onResume()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        onPause()
    }

    // MARK: - Setup

    /// 配置 WebView
    private func setupWebView() {
        // 创建 WebView 配置
        let configuration = WKWebViewConfiguration()

        // 允许内联播放视频
        configuration.allowsInlineMediaPlayback = true

        // 创建 WebView
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        // 允许调试（iOS 16.4+）
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        // 设置背景色
        webView.backgroundColor = .systemBackground
        webView.scrollView.backgroundColor = .systemBackground

        // 添加到视图
        view.addSubview(webView)
    }

    /// 配置 Bridge
    private func setupBridge() {
        // 初始化 Bridge
        bridge = WebViewBridge(
            webView: webView,
            configuration: BridgeConfiguration(
                debug: true,
                allowsHTTPLoading: true
            )
        )

        // 配置 Navigator 模块的导航控制器
        PageStackManager.shared.rootNavigationController =
            self.navigationController

        // 配置 WebView 工厂
        PageStackManager.shared.webViewConfigFactory = {
            let config = WKWebViewConfiguration()
            config.allowsInlineMediaPlayback = true
            return config
        }

        // 注册自定义模块
        let customModule = CustomModule(viewController: self)
        bridge.register(module: customModule)

        // 设置启动参数（可选）
        bridge.setLaunchParams([
            "source": "demo",
            "version": "1.0.0",
            "loadMode": loadMode.rawValue,
        ])

        print("✅ WebViewBridge 已初始化")
    }

    /// 加载内容
    private func loadContent() {
        switch loadMode {
        case .remoteURL:
            print("📡 加载远程 URL: \(remoteURL)")
            bridge.loadURL(remoteURL)
        case .localAssets:
            print("📦 加载本地资源")
            if let wwwPath = Bundle.main.path(forResource: "www", ofType: nil),
                FileManager.default.fileExists(atPath: wwwPath)
            {
                bridge.loadLocalHTML(path: "www/index.html")
            } else {
                showError(
                    title: "本地资源不存在",
                    message: "请将 web-example 的 dist 目录复制到项目的 www 文件夹"
                )
            }
        case .downloadZip:
            print("⬇️ 下载并解压 ZIP...")
            downloadAndExtractZip()
        }
    }

    // MARK: - ZIP 下载和解压

    /// 下载并解压 ZIP 文件
    private func downloadAndExtractZip() {
        showLoadingIndicator()

        guard let url = URL(string: zipURL) else {
            hideLoadingIndicator()
            showError(title: "错误", message: "无效的 ZIP URL")
            return
        }

        let task = URLSession.shared.downloadTask(with: url) {
            [weak self] localURL, response, error in
            DispatchQueue.main.async {
                self?.hideLoadingIndicator()
            }

            if let error = error {
                DispatchQueue.main.async {
                    self?.showError(
                        title: "下载失败",
                        message: error.localizedDescription
                    )
                }
                return
            }

            guard let localURL = localURL else {
                DispatchQueue.main.async {
                    self?.showError(title: "下载失败", message: "未获取到文件")
                }
                return
            }

            // 解压 ZIP
            self?.extractZip(from: localURL)
        }

        task.resume()
    }

    /// 解压 ZIP 文件
    private func extractZip(from zipURL: URL) {
        let fileManager = FileManager.default
        let documentsPath = fileManager.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]
        let extractPath = documentsPath.appendingPathComponent("web-content")

        // 删除旧内容
        try? fileManager.removeItem(at: extractPath)

        do {
            // 创建目标目录
            try fileManager.createDirectory(
                at: extractPath,
                withIntermediateDirectories: true
            )

            // 使用 ZIPHelper 解压（ZIPFoundation 实现，模拟器和真机都可用）
            try ZIPHelper.unzip(zipURL, to: extractPath)

            print("✅ ZIP 解压成功: \(extractPath.path)")
            DispatchQueue.main.async { [weak self] in
                self?.loadExtractedContent(from: extractPath)
            }
        } catch {
            print("❌ 解压失败: \(error)")
            DispatchQueue.main.async { [weak self] in
                self?.showError(
                    title: "解压失败",
                    message: error.localizedDescription
                )
            }
        }
    }

    /// 加载解压后的内容
    private func loadExtractedContent(from path: URL) {
        // 查找 index.html（现在应该直接在根目录）
        let indexPath = path.appendingPathComponent("index.html")

        if FileManager.default.fileExists(atPath: indexPath.path) {
            webView.loadFileURL(indexPath, allowingReadAccessTo: path)
            print("✅ 已加载: \(indexPath.path)")
        } else {
            showError(title: "加载失败", message: "未找到 index.html")
        }
    }

    /// 显示加载指示器
    private var loadingView: UIView?

    private func showLoadingIndicator() {
        let overlay = UIView(frame: view.bounds)
        overlay.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        let indicator = UIActivityIndicatorView(style: .large)
        indicator.color = .white
        indicator.center = overlay.center
        indicator.startAnimating()

        let label = UILabel()
        label.text = "下载中..."
        label.textColor = .white
        label.sizeToFit()
        label.center = CGPoint(x: overlay.center.x, y: overlay.center.y + 40)

        overlay.addSubview(indicator)
        overlay.addSubview(label)
        view.addSubview(overlay)

        loadingView = overlay
    }

    private func hideLoadingIndicator() {
        loadingView?.removeFromSuperview()
        loadingView = nil
    }

    // MARK: - Load Mode Selector

    private func showLoadModeSelector() {
        let alert = UIAlertController(
            title: "选择加载模式",
            message:
                "当前: \(loadMode.displayName)\n\n🌐 远程 URL - 开发调试\n📦 本地资源 - 正式发布\n⬇️ 下载 ZIP - 热更新测试",
            preferredStyle: .actionSheet
        )

        for mode in LoadMode.allCases {
            let emoji: String
            switch mode {
            case .remoteURL: emoji = "🌐 "
            case .localAssets: emoji = "📦 "
            case .downloadZip: emoji = "⬇️ "
            }
            let action = UIAlertAction(
                title: emoji + mode.displayName,
                style: .default
            ) { [weak self] _ in
                self?.switchLoadMode(to: mode)
            }
            if mode == loadMode {
                action.setValue(true, forKey: "checked")
            }
            alert.addAction(action)
        }

        // 快速启动按钮（使用当前配置）
        let quickStart = UIAlertAction(title: "🚀 快速启动", style: .default) {
            [weak self] _ in
            UserDefaults.standard.set(true, forKey: self?.firstLaunchKey ?? "")
            self?.loadContent()
        }
        alert.addAction(quickStart)

        alert.addAction(
            UIAlertAction(title: "取消", style: .cancel) { [weak self] _ in
                // 如果是首次启动且用户取消，仍然加载内容
                if self?.isFirstLaunch == true {
                    UserDefaults.standard.set(
                        true,
                        forKey: self?.firstLaunchKey ?? ""
                    )
                    self?.loadContent()
                }
            }
        )

        if let popover = alert.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(
                x: view.bounds.midX,
                y: view.bounds.midY,
                width: 0,
                height: 0
            )
            popover.permittedArrowDirections = []
        }

        present(alert, animated: true)
    }

    private func switchLoadMode(to mode: LoadMode) {
        loadMode = mode
        UserDefaults.standard.set(mode.rawValue, forKey: loadModeKey)
        UserDefaults.standard.set(true, forKey: firstLaunchKey)

        // 更新启动参数
        bridge.setLaunchParams([
            "source": "demo",
            "version": "1.0.0",
            "loadMode": loadMode.rawValue,
        ])

        loadContent()
    }

    private func showError(title: String, message: String?) {
        let alert = UIAlertController(
            title: title,
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }

    /// 加载内嵌的 HTML（用于演示）
    private func loadEmbeddedHTML() {
        let html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
                <title>WebView Bridge Demo</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                        font-family: -apple-system, system-ui, sans-serif; 
                        padding: 20px;
                        padding-top: max(20px, env(safe-area-inset-top));
                        padding-bottom: max(20px, env(safe-area-inset-bottom));
                        background: #f5f5f5;
                    }
                    h1 { color: #333; margin-bottom: 20px; }
                    .card {
                        background: white;
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    button {
                        background: #007AFF;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-size: 16px;
                        width: 100%;
                        margin-top: 8px;
                    }
                    button:active { opacity: 0.7; }
                    #result {
                        background: #f0f0f0;
                        padding: 12px;
                        border-radius: 8px;
                        margin-top: 12px;
                        font-family: monospace;
                        font-size: 12px;
                        white-space: pre-wrap;
                        word-break: break-all;
                    }
                </style>
            </head>
            <body>
                <h1>🌉 WebView Bridge</h1>
                
                <div class="card">
                    <h3>设备信息</h3>
                    <button onclick="getDeviceInfo()">获取设备信息</button>
                </div>
                
                <div class="card">
                    <h3>触觉反馈</h3>
                    <button onclick="haptics('light')">轻触反馈</button>
                    <button onclick="haptics('medium')">中等反馈</button>
                    <button onclick="haptics('heavy')">重度反馈</button>
                </div>
                
                <div class="card">
                    <h3>剪贴板</h3>
                    <button onclick="copyText()">复制文本</button>
                    <button onclick="readClipboard()">读取剪贴板</button>
                </div>
                
                <div class="card">
                    <h3>结果</h3>
                    <div id="result">点击按钮查看结果...</div>
                </div>
                
                <script>
                    // 检查 Bridge 是否可用
                    function getBridge() {
                        if (window.NativeBridge) {
                            return window.NativeBridge;
                        }
                        showResult('Bridge 未初始化');
                        return null;
                    }
                    
                    // 发送消息到 Native
                    function sendMessage(type, params = {}) {
                        return new Promise((resolve, reject) => {
                            const callbackId = 'cb_' + Date.now();
                            
                            // 注册回调
                            window['__bridge_callback_' + callbackId] = (response) => {
                                if (response.code === 0) {
                                    resolve(response.data);
                                } else {
                                    reject(new Error(response.msg));
                                }
                                delete window['__bridge_callback_' + callbackId];
                            };
                            
                            // 发送消息
                            const message = JSON.stringify({
                                version: '1.0',
                                type: type,
                                params: params,
                                callbackId: callbackId
                            });
                            
                            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.NativeBridge) {
                                window.webkit.messageHandlers.NativeBridge.postMessage(message);
                            } else {
                                reject(new Error('Bridge 不可用'));
                            }
                        });
                    }
                    
                    // 显示结果
                    function showResult(data) {
                        document.getElementById('result').textContent = 
                            typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
                    }
                    
                    // 获取设备信息
                    async function getDeviceInfo() {
                        try {
                            const info = await sendMessage('Device.GetInfo');
                            showResult(info);
                        } catch (e) {
                            showResult('错误: ' + e.message);
                        }
                    }
                    
                    // 触觉反馈
                    async function haptics(style) {
                        try {
                            await sendMessage('Haptics.Impact', { style: style });
                            showResult('触觉反馈已触发: ' + style);
                        } catch (e) {
                            showResult('错误: ' + e.message);
                        }
                    }
                    
                    // 复制文本
                    async function copyText() {
                        try {
                            await sendMessage('Clipboard.Write', { 
                                type: 'text', 
                                content: 'Hello from WebView Bridge!' 
                            });
                            showResult('已复制到剪贴板');
                        } catch (e) {
                            showResult('错误: ' + e.message);
                        }
                    }
                    
                    // 读取剪贴板
                    async function readClipboard() {
                        try {
                            const result = await sendMessage('Clipboard.Read', { type: 'text' });
                            showResult(result);
                        } catch (e) {
                            showResult('错误: ' + e.message);
                        }
                    }
                    
                    // 页面加载完成
                    showResult('✅ 页面已加载，Bridge 已准备就绪');
                </script>
            </body>
            </html>
            """

        webView.loadHTMLString(html, baseURL: nil)
    }

    // MARK: - Lifecycle Events

    /// 应用进入前台
    func onResume() {
        bridge?.onResume()
    }

    /// 应用进入后台
    func onPause() {
        bridge?.onPause()
    }
}
