# 快速开始

本指南将帮助你在 5 分钟内开始使用 WebView Bridge SDK。

## 前提条件

- Node.js 18+
- pnpm 或 npm
- iOS 项目 (Xcode 15+) 或 Android 项目 (Android Studio)

## 安装

### Web 端

```bash
# 使用 pnpm
pnpm add @aspect/webview-bridge

# 使用 npm
npm install @aspect/webview-bridge
```

### iOS 端

在 `Package.swift` 中添加依赖：

```swift
dependencies: [
    .package(path: "../ios")
]
```

或使用 CocoaPods：

```ruby
pod 'WebViewBridge', :path => '../ios'
```

### Android 端

在 `build.gradle.kts` 中添加：

```kotlin
dependencies {
    implementation(project(":webview-bridge"))
}
```

## 基本使用

### Web 端

```typescript
import { Bridge } from '@aspect/webview-bridge'

// 检查是否在 Native 环境中
if (Bridge.isNative) {
  // 等待 Bridge 就绪
  await Bridge.whenReady()
  
  // 获取设备信息
  const info = await Bridge.device.getInfo()
  console.log('设备型号:', info.model)
}
```

### iOS 端

```swift
import WebViewBridge

class ViewController: UIViewController {
    private var bridge: WebViewBridge!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 创建 Bridge
        bridge = WebViewBridge(webView: webView)
        
        // 注册模块
        bridge.registerModule(DeviceModule())
        bridge.registerModule(HapticsModule())
        // ...注册其他模块
    }
}
```

### Android 端

```kotlin
import com.aspect.webviewbridge.WebViewBridge

class MainActivity : AppCompatActivity() {
    private lateinit var bridge: WebViewBridge
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 创建 Bridge
        bridge = WebViewBridge(webView, this)
        
        // 注册模块
        bridge.registerModule(DeviceModule(this))
        bridge.registerModule(HapticsModule(this))
        // ...注册其他模块
    }
}
```

## 下一步

- 阅读 [基本用法](/guide/basic-usage) 了解更多用法
- 查看 [API 文档](/api/) 了解所有可用模块
- 了解如何 [创建自定义模块](/extension/overview)
