# Workspace 开发指南

本文档说明如何在 monorepo 工作区中进行 WebView Bridge SDK 的开发和调试。

## 目录

- [环境要求](#环境要求)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [开发工作流](#开发工作流)
- [SDK 配置说明](#sdk-配置说明)
- [常见问题](#常见问题)

---

## 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0 (推荐) 或 npm/yarn
- **iOS**: Xcode 15+, iOS 14+
- **Android**: Android Studio, API 24+

---

## 项目结构

```
webview-bridge-sdk/
├── packages/
│   ├── web-sdk/               # Web SDK 源码
│   │   ├── src/
│   │   │   ├── core/          # 核心通信
│   │   │   ├── modules/       # 功能模块
│   │   │   └── index.ts       # 入口
│   │   └── package.json
│   │
│   └── web-example/           # Web 示例应用
│       ├── src/
│       │   ├── components/    # Vue 组件 (JSX)
│       │   └── main.ts
│       ├── vite.config.ts
│       └── package.json
│
├── ios/                       # iOS SDK
│   └── Sources/
│       ├── Core/              # 核心
│       ├── Modules/           # 模块
│       └── Resource/          # 资源加载
│
├── android/                   # Android SDK
│   └── src/main/java/
│       └── com/aspect/webviewbridge/
│
├── docs/                      # 文档
├── pnpm-workspace.yaml        # Workspace 配置
└── .gitignore
```

---

## 快速开始

### 1. 克隆和安装

```bash
# 克隆项目
git clone <repository-url>
cd webview-bridge-sdk

# 安装依赖 (使用 pnpm)
pnpm install
```

### 2. 启动 Web 开发服务器

```bash
# 进入示例项目
cd packages/web-example

# 启动开发服务器
pnpm dev
```

访问 `http://localhost:5173` 查看 Web 示例。

### 3. 在原生端加载

#### iOS 配置

```swift
import WebViewBridgeSDK

// 开发模式 - 加载 HTTP URL
let config = BridgeConfiguration(
    debug: true,
    allowsHTTPLoading: true  // 允许 HTTP
)

let bridge = WebViewBridge.create(configuration: config)
bridge.loadURL(URL(string: "http://localhost:5173")!)
```

#### Android 配置

```kotlin
// 开发模式 - 加载 HTTP URL
val config = BridgeConfiguration.DEVELOPMENT.copy(
    allowsHTTPLoading = true
)

val bridge = WebViewBridge(context, webView, config)
bridge.loadUrl("http://localhost:5173")
```

---

## 开发工作流

### Workspace 依赖

Web 示例通过 workspace 协议直接引用 SDK 源码:

```json
// packages/web-example/package.json
{
  "dependencies": {
    "@aspect/webview-bridge": "workspace:*"
  }
}
```

这意味着:
- ✅ SDK 代码修改立即生效 (HMR)
- ✅ 无需先构建 SDK
- ✅ 可直接调试 SDK 源码

### 修改 SDK

1. 修改 `packages/web-sdk/src/` 下的代码
2. 浏览器自动热更新
3. 测试验证后提交

### 添加新模块

参考 [模块扩展开发指南](./MODULE_EXTENSION_GUIDE.md)

---

## SDK 配置说明

### Web SDK

```typescript
import { Bridge, BridgeCore } from '@aspect/webview-bridge'

// 直接使用默认实例
const device = await Bridge.Device.getInfo()

// 或获取核心实例进行自定义
const core = BridgeCore.getInstance()
```

### iOS SDK

```swift
// 配置选项
struct BridgeConfiguration {
    var debug: Bool = false
    var messageHandlerName: String = "bridge"
    var urlScheme: URLSchemeConfiguration?  // 可选
    var allowsHTTPLoading: Bool = false
}

// URL Scheme 配置 (可选)
struct URLSchemeConfiguration {
    var scheme: String = "app"
    var host: String = "local"
}
```

#### 生产模式 (自定义 Scheme)

```swift
let config = BridgeConfiguration(
    debug: false,
    urlScheme: URLSchemeConfiguration(
        scheme: "myapp",
        host: "webview"
    )
)

let bridge = WebViewBridge.create(configuration: config)
bridge.loadLocalHTML(named: "index")  // 加载 myapp://webview/index.html
```

#### 开发模式 (HTTP)

```swift
let config = BridgeConfiguration(
    debug: true,
    allowsHTTPLoading: true
)

let bridge = WebViewBridge.create(configuration: config)
bridge.loadURL(URL(string: "http://localhost:5173")!)
```

### Android SDK

```kotlin
// 配置选项
data class BridgeConfiguration(
    val debug: Boolean = false,
    val jsInterfaceName: String = "NativeBridge",
    val urlScheme: URLSchemeConfiguration? = null,  // 可选
    val allowsHTTPLoading: Boolean = false
)

// URL Scheme 配置 (可选)
data class URLSchemeConfiguration(
    val scheme: String = "app",
    val host: String = "local"
)

// 预设配置
companion object {
    val DEFAULT = BridgeConfiguration()
    val DEVELOPMENT = BridgeConfiguration(
        debug = true,
        allowsHTTPLoading = true
    )
}
```

#### 生产模式

```kotlin
val config = BridgeConfiguration(
    debug = false,
    urlScheme = URLSchemeConfiguration(
        scheme = "myapp",
        host = "webview"
    )
)

val bridge = WebViewBridge(context, webView, config)
bridge.loadLocalHtml("index.html")  // myapp://webview/index.html
```

#### 开发模式

```kotlin
val config = BridgeConfiguration.DEVELOPMENT

val bridge = WebViewBridge(context, webView, config)
bridge.loadUrl("http://10.0.2.2:5173")  // Android 模拟器访问 localhost
```

---

## 常见问题

### Q: Android 模拟器无法访问 localhost?

**A:** Android 模拟器需要使用 `10.0.2.2` 代替 `localhost`:

```kotlin
bridge.loadUrl("http://10.0.2.2:5173")
```

### Q: iOS 模拟器 HTTP 加载失败?

**A:** 确保配置了 `allowsHTTPLoading = true`,并检查 Info.plist 的 ATS 设置:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

### Q: pnpm install 失败?

**A:** 确保使用 pnpm 8.x 以上版本:

```bash
npm install -g pnpm@latest
pnpm install
```

### Q: TypeScript 类型错误?

**A:** SDK 使用 TypeScript 源码入口,确保 tsconfig.json 配置正确:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### Q: HMR 不生效?

**A:** 确保使用 workspace 协议依赖,而不是版本号:

```json
{
  "dependencies": {
    "@aspect/webview-bridge": "workspace:*"  // ✅ 正确
    // "@aspect/webview-bridge": "^1.0.0"    // ❌ 错误
  }
}
```

---

## 相关文档

- [模块扩展开发指南](./MODULE_EXTENSION_GUIDE.md)
- [API 文档](./API.md)
- [协议规范](./PROTOCOL.md)
