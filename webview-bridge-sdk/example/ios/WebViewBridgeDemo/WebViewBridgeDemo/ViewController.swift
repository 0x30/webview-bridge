import UIKit
import WebKit
import WebViewBridge

/// 主视图控制器
/// 演示 WebViewBridge SDK 的使用
class ViewController: UIViewController {
    
    // MARK: - Properties
    
    /// WebView 实例
    private var webView: WKWebView!
    
    /// Bridge 实例
    private var bridge: WebViewBridge!
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupWebView()
        setupBridge()
        loadContent()
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
        bridge = WebViewBridge(webView: webView)
        
        // 设置启动参数（可选）
        bridge.setLaunchParams([
            "source": "demo",
            "version": "1.0.0"
        ])
        
        print("✅ WebViewBridge 已初始化")
    }
    
    /// 加载内容
    private func loadContent() {
        // 方式一：加载本地 HTML 文件
        // 将 example/www/index.html 复制到项目的 www 文件夹
        bridge.loadLocalHTML(path: "www/index.html")
        
        // 方式二：直接加载 URL（调试用）
        // 如果本地文件不存在，尝试加载内嵌 HTML
        // loadEmbeddedHTML()
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
