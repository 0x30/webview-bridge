# iOS SDK

WebView Bridge SDK 的 iOS 端提供了将 Web 应用与 iOS 原生能力连接的桥接功能。

## 系统要求

- iOS 13.0+
- Swift 5.5+
- Xcode 14.0+

## 安装

### Swift Package Manager

在 `Package.swift` 中添加：

```swift
dependencies: [
    .package(url: "https://github.com/aspect/webview-bridge-ios.git", from: "1.0.0")
]
```

或在 Xcode 中：

1. File → Add Packages...
2. 输入仓库 URL
3. 选择版本并添加

### CocoaPods

```ruby
pod 'WebViewBridge', '~> 1.0'
```

## 快速开始

### 1. 导入框架

```swift
import WebViewBridge
```

### 2. 创建 Bridge

```swift
import UIKit
import WebKit
import WebViewBridge

class ViewController: UIViewController {
    
    private var webView: WKWebView!
    private var bridge: WebViewBridge!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 创建 WebView
        webView = WKWebView(frame: view.bounds)
        view.addSubview(webView)
        
        // 创建 Bridge
        bridge = WebViewBridge(webView: webView)
        
        // 注册模块
        registerModules()
        
        // 加载页面
        if let url = URL(string: "https://your-webapp.com") {
            webView.load(URLRequest(url: url))
        }
    }
    
    private func registerModules() {
        bridge.registerModule(DeviceModule())
        bridge.registerModule(HapticsModule())
        bridge.registerModule(StorageModule())
        bridge.registerModule(ClipboardModule())
        bridge.registerModule(StatusBarModule(viewController: self))
        bridge.registerModule(ContactsModule())
        bridge.registerModule(MediaModule(viewController: self))
        bridge.registerModule(LocationModule())
        bridge.registerModule(BiometricsModule())
        bridge.registerModule(NFCModule())
        bridge.registerModule(NetworkModule())
    }
}
```

## 内置模块

| 模块 | 说明 | 权限 |
|------|------|------|
| DeviceModule | 设备信息 | - |
| HapticsModule | 触觉反馈 | - |
| StorageModule | 本地存储 | - |
| ClipboardModule | 剪贴板 | - |
| StatusBarModule | 状态栏 | - |
| AppModule | 应用信息 | - |
| SystemModule | 系统功能 | - |
| PermissionModule | 权限管理 | - |
| ContactsModule | 联系人 | NSContactsUsageDescription |
| MediaModule | 相机/相册 | NSCameraUsageDescription, NSPhotoLibraryUsageDescription |
| LocationModule | 位置 | NSLocationWhenInUseUsageDescription |
| BiometricsModule | 生物识别 | NSFaceIDUsageDescription |
| NFCModule | NFC | NFCReaderUsageDescription |
| NetworkModule | 网络状态 | - |

## Info.plist 配置

根据使用的模块，添加相应的权限描述：

```xml
<key>NSContactsUsageDescription</key>
<string>需要访问通讯录以选择联系人</string>

<key>NSCameraUsageDescription</key>
<string>需要访问相机以拍摄照片</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册以选择照片</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>需要获取您的位置以提供相关服务</string>

<key>NSFaceIDUsageDescription</key>
<string>需要使用 Face ID 进行身份验证</string>

<key>NFCReaderUsageDescription</key>
<string>需要读取 NFC 标签</string>
```

## 自定义模块

### 实现协议

```swift
class MyModule: BridgeModuleProtocol {
    
    let moduleName = "MyModule"
    
    func handle(method: String, 
                params: [String: Any], 
                completion: @escaping (Result<Any, Error>) -> Void) {
        switch method {
        case "DoSomething":
            handleDoSomething(params: params, completion: completion)
        default:
            completion(.failure(BridgeError.methodNotFound(method)))
        }
    }
    
    private func handleDoSomething(params: [String: Any], 
                                   completion: @escaping (Result<Any, Error>) -> Void) {
        let value = params["value"] as? String ?? ""
        completion(.success(["result": value.uppercased()]))
    }
}
```

### 注册模块

```swift
bridge.registerModule(MyModule())
```

## 发送事件

```swift
// 在模块中发送事件到 Web
bridge.dispatchEvent("MyModule.SomethingHappened", data: [
    "key": "value"
])
```

## 加载本地资源

```swift
// 加载本地 HTML
let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html")!
webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())

// 或使用 LocalResourceLoader
let loader = LocalResourceLoader(webView: webView, bundle: .main)
loader.load(path: "www/index.html")
```

## SwiftUI 集成

```swift
import SwiftUI
import WebKit
import WebViewBridge

struct BridgeWebView: UIViewRepresentable {
    @Binding var bridge: WebViewBridge?
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        let bridge = WebViewBridge(webView: webView)
        
        // 注册模块
        bridge.registerModule(DeviceModule())
        bridge.registerModule(HapticsModule())
        // ...
        
        DispatchQueue.main.async {
            self.bridge = bridge
        }
        
        webView.load(URLRequest(url: url))
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    @State private var bridge: WebViewBridge?
    
    var body: some View {
        BridgeWebView(
            bridge: $bridge,
            url: URL(string: "https://your-webapp.com")!
        )
    }
}
```

## 调试

### 启用日志

```swift
WebViewBridge.logLevel = .verbose
```

### Safari Web Inspector

1. 设备：设置 → Safari → 高级 → Web 检查器
2. Mac：Safari → 偏好设置 → 高级 → 显示开发菜单
3. 连接设备，Safari → 开发 → [设备] → [WebView]

## 常见问题

### Q: WKWebView 白屏

A: 检查 App Transport Security 设置，或使用 HTTPS。

### Q: JavaScript 不执行

A: 确保在 WKWebViewConfiguration 中启用了 JavaScript：

```swift
let config = WKWebViewConfiguration()
config.preferences.javaScriptEnabled = true
```

### Q: 无法读取本地文件

A: 使用 `loadFileURL(_:allowingReadAccessTo:)` 方法加载。
