# WebView Bridge SDK

跨平台 WebView 与 Native 通信桥接 SDK，支持 iOS、Android 和 Web。

## 特性

- 🌉 **统一协议** - iOS/Android/Web 三端统一的通信协议
- 📦 **模块化设计** - 8 个内置能力模块，可扩展
- 🔒 **类型安全** - 完整的 TypeScript 类型支持
- 🚀 **零配置** - 开箱即用，最小化集成成本
- 📱 **本地资源加载** - 支持自定义 URL Scheme 加载本地资源

## 架构

```
┌─────────────────────────────────────────────┐
│                  Web 层                      │
│  ┌─────────────────────────────────────┐    │
│  │         WebView Bridge SDK          │    │
│  │  (TypeScript / JavaScript)          │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                     │
                     │ JSON 消息
                     ▼
┌─────────────────────────────────────────────┐
│                Native 层                     │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │   iOS SDK    │    │   Android SDK    │   │
│  │   (Swift)    │    │    (Kotlin)      │   │
│  └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────┘
```

## 内置模块

| 模块 | 说明 | 主要功能 |
|------|------|----------|
| **App** | 应用信息 | 启动参数、生命周期、应用信息 |
| **Device** | 设备信息 | 设备型号、电池、网络、存储 |
| **Permission** | 权限管理 | 查询/请求权限、打开设置 |
| **Clipboard** | 剪贴板 | 读写剪贴板、支持多种格式 |
| **Haptics** | 触觉反馈 | 震动、触觉反馈 |
| **StatusBar** | 状态栏 | 样式、可见性、背景色 |
| **System** | 系统功能 | 打开URL、分享、亮度控制 |
| **Storage** | 存储 | 安全存储、Keychain/加密存储 |

## 快速开始

### Web 端

```bash
# 安装
npm install @aspect/webview-bridge

# 或使用 yarn
yarn add @aspect/webview-bridge
```

```typescript
import { WebViewBridge } from '@aspect/webview-bridge';

// 创建实例
const bridge = new WebViewBridge();

// 获取设备信息
const deviceInfo = await bridge.device.getInfo();
console.log('设备信息:', deviceInfo);

// 请求相机权限
const result = await bridge.permission.request('camera');
console.log('权限状态:', result.status);

// 触发震动反馈
await bridge.haptics.impact('medium');

// 监听事件
bridge.addEventListener('foreground', () => {
  console.log('应用进入前台');
});
```

### iOS 集成

```swift
// Package.swift 添加依赖
dependencies: [
    .package(path: "../webview-bridge-sdk/ios")
]

// 使用
import WebViewBridge
import WebKit

class ViewController: UIViewController {
    var bridge: WebViewBridge!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let webView = WKWebView(frame: view.bounds)
        view.addSubview(webView)
        
        // 初始化 Bridge
        bridge = WebViewBridge(webView: webView)
        
        // 加载本地 HTML
        bridge.loadLocalHTML(path: "www/index.html")
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        bridge.onResume()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        bridge.onPause()
    }
}
```

### Android 集成

```kotlin
// build.gradle.kts
dependencies {
    implementation(project(":webview-bridge"))
}

// 使用
class MainActivity : AppCompatActivity() {
    private lateinit var bridge: WebViewBridge
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val webView = WebView(this)
        setContentView(webView)
        
        // 初始化 Bridge
        bridge = WebViewBridge(this, webView)
        
        // 加载本地 HTML
        bridge.loadLocalHtml("www/index.html")
    }
    
    override fun onResume() {
        super.onResume()
        bridge.onResume()
    }
    
    override fun onPause() {
        super.onPause()
        bridge.onPause()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        bridge.onDestroy()
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        bridge.getModule(PermissionModule::class.java)
            ?.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }
}
```

## 协议规范

### 请求格式

```json
{
  "version": "1.0",
  "type": "Module.Method",
  "params": {},
  "callbackId": "cb_1"
}
```

### 响应格式

```json
{
  "callbackId": "cb_1",
  "code": 0,
  "msg": "success",
  "data": {}
}
```

### 事件格式

```json
{
  "eventName": "foreground",
  "data": {}
}
```

### 错误码

| 范围 | 类型 | 说明 |
|------|------|------|
| 0 | 成功 | 请求成功 |
| 1xxx | 协议错误 | 解析失败、版本不支持等 |
| 2xxx | 能力错误 | 模块/方法不存在等 |
| 3xxx | 权限错误 | 权限被拒绝等 |
| 4xxx | 设备限制 | 设备不支持等 |
| 5xxx | 内部错误 | 内部异常等 |

## API 文档

### App 模块

```typescript
// 获取启动参数
const params = await bridge.app.getLaunchParams();

// 获取应用信息
const info = await bridge.app.getAppInfo();

// 获取生命周期状态
const state = await bridge.app.getLifecycleState();

// 退出应用
await bridge.app.exit();

// 最小化应用
await bridge.app.minimize();
```

### Device 模块

```typescript
// 获取设备信息
const info = await bridge.device.getInfo();

// 获取电池信息
const battery = await bridge.device.getBatteryInfo();

// 获取网络信息
const network = await bridge.device.getNetworkInfo();

// 获取存储信息
const storage = await bridge.device.getStorageInfo();

// 获取设备能力
const caps = await bridge.device.getCapabilities();
```

### Permission 模块

```typescript
// 查询权限状态
const status = await bridge.permission.getStatus('camera');

// 请求权限
const result = await bridge.permission.request('camera');

// 批量请求
const results = await bridge.permission.requestMultiple([
  'camera',
  'microphone'
]);

// 打开设置
await bridge.permission.openSettings();
```

### Clipboard 模块

```typescript
// 读取剪贴板
const content = await bridge.clipboard.read('text');

// 写入剪贴板
await bridge.clipboard.write({ type: 'text', content: 'Hello' });

// 清空剪贴板
await bridge.clipboard.clear();

// 检查是否有内容
const has = await bridge.clipboard.hasContent('text');
```

### Haptics 模块

```typescript
// 冲击反馈
await bridge.haptics.impact('medium');

// 通知反馈
await bridge.haptics.notification('success');

// 选择反馈
await bridge.haptics.selection();

// 自定义振动
await bridge.haptics.vibrate({ pattern: [100, 50, 100] });
```

### StatusBar 模块

```typescript
// 获取状态栏信息
const info = await bridge.statusbar.getInfo();

// 设置样式
await bridge.statusbar.setStyle('dark');

// 设置可见性
await bridge.statusbar.setVisible(false);

// 设置背景色
await bridge.statusbar.setBackgroundColor('#FF0000');
```

### System 模块

```typescript
// 打开 URL
await bridge.system.openURL({ url: 'https://example.com' });

// 分享
await bridge.system.share({ text: 'Hello', url: 'https://...' });

// 获取系统信息
const info = await bridge.system.getInfo();

// 获取安全区域
const safeArea = await bridge.system.getSafeArea();

// 获取颜色模式
const scheme = await bridge.system.getColorScheme();

// 保持屏幕常亮
await bridge.system.keepScreenOn(true);
```

### Storage 模块

```typescript
// 存储数据
await bridge.storage.set({ key: 'token', value: 'xxx' });

// 读取数据
const value = await bridge.storage.get({ key: 'token' });

// 删除数据
await bridge.storage.remove({ key: 'token' });

// 清空存储
await bridge.storage.clear();

// 安全存储（Keychain / EncryptedSharedPreferences）
await bridge.storage.set({
  key: 'secret',
  value: 'xxx',
  securityLevel: 'secure'
});
```

### 事件

```typescript
// 应用进入前台
bridge.addEventListener('foreground', () => {});

// 应用进入后台
bridge.addEventListener('background', () => {});

// 外观变化
bridge.addEventListener('appearanceChanged', (data) => {
  console.log('颜色模式:', data.colorScheme);
});

// 网络变化
bridge.addEventListener('networkChanged', (data) => {
  console.log('网络状态:', data.isConnected);
});

// 键盘高度变化
bridge.addEventListener('keyboardHeightChanged', (data) => {
  console.log('键盘高度:', data.height);
});
```

## 本地资源加载

SDK 支持通过自定义 URL Scheme 加载本地资源：

- **iOS**: `app://localhost/path/to/file`
- **Android**: `app://localhost/path/to/file`

资源文件放置位置：
- **iOS**: 项目的 Resources 目录
- **Android**: `assets` 目录

## 扩展模块

### 自定义模块 (iOS)

```swift
class CustomModule: BridgeModule {
    let moduleName = "Custom"
    let methods = ["DoSomething"]
    
    weak var bridge: WebViewBridge?
    
    init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "DoSomething":
            callback(.success(["result": "done"]))
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }
}

// 注册
bridge.registerModule(CustomModule(bridge: bridge))
```

### 自定义模块 (Android)

```kotlin
class CustomModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "Custom"
    override val methods = listOf("DoSomething")
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "DoSomething" -> {
                callback(Result.success(mapOf("result" to "done")))
            }
            else -> {
                callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
            }
        }
    }
}

// 注册
bridge.registerModule(CustomModule(context, bridge))
```

## 目录结构

```
webview-bridge-sdk/
├── web/                    # Web JS SDK
│   ├── src/
│   │   ├── core.ts         # 核心通信层
│   │   ├── types.ts        # 类型定义
│   │   ├── events.ts       # 事件类型
│   │   ├── index.ts        # 入口文件
│   │   └── modules/        # 能力模块
│   │       ├── app.ts
│   │       ├── device.ts
│   │       ├── permission.ts
│   │       ├── clipboard.ts
│   │       ├── haptics.ts
│   │       ├── statusbar.ts
│   │       ├── system.ts
│   │       └── storage.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── rollup.config.js
│
├── ios/                    # iOS SDK
│   ├── Package.swift
│   └── Sources/
│       ├── Protocol/       # 协议层
│       ├── Core/           # 核心类
│       ├── Resource/       # 资源加载
│       └── Modules/        # 能力模块
│
├── android/                # Android SDK
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/com/aspect/webviewbridge/
│           ├── protocol/   # 协议层
│           ├── core/       # 核心类
│           └── modules/    # 能力模块
│
└── example/                # 示例
    └── www/
        └── index.html
```

## 📚 文档

完整文档托管在 GitHub Pages，使用 VitePress 构建。

### 本地查看文档

```bash
cd docs-site
pnpm install
pnpm run dev
```

访问 `http://localhost:5173` 查看文档。

### 在线文档

文档会自动部署到 GitHub Pages：
- 📖 [完整文档](https://aspect.github.io/webview-bridge/)

### 部署流程

使用 GitHub Actions 自动构建和部署：

1. 推送到 `main` 分支时，自动触发构建
2. VitePress 生成静态文件到 `.vitepress/dist`
3. 上传到 `gh-pages` 分支
4. GitHub Pages 自动部署

详见 [GitHub Pages 部署指南](./docs-site/GITHUB_PAGES.md)。

## 许可证

MIT License
