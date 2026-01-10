# 架构概述

本文档介绍 WebView Bridge SDK 的整体架构设计。

## 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         Web Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Bridge    │  │   Modules   │  │   Events    │          │
│  │   (Core)    │  │ (Device,...)│  │  (System)   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│              ┌───────────▼───────────┐                       │
│              │    Message Protocol   │                       │
│              │    (JSON over JS)     │                       │
│              └───────────┬───────────┘                       │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Native Message Handler │
              └────────────┬────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   iOS SDK    │   │ Android SDK  │   │   Web Mock   │
│   (Swift)    │   │   (Kotlin)   │   │  (Testing)   │
└──────────────┘   └──────────────┘   └──────────────┘
```

## 通信协议

### 请求格式

```typescript
interface BridgeRequest {
  version: string      // 协议版本 "1.0"
  type: string         // 能力标识 "Module.Method"
  params: object       // 请求参数
  callbackId: string   // 回调标识
}
```

### 响应格式

```typescript
interface BridgeResponse {
  callbackId: string   // 对应的请求 ID
  success: boolean     // 是否成功
  data?: object        // 成功时的数据
  error?: {            // 失败时的错误
    code: number
    message: string
  }
}
```

### 事件格式

```typescript
interface BridgeEvent {
  eventName: string    // 事件名称
  data: object         // 事件数据
}
```

## 消息通道

### iOS (WKWebView)

```swift
// Web → Native
webView.configuration.userContentController.add(self, name: "bridge")

// Native → Web
webView.evaluateJavaScript("window.__bridgeCallback('\(response)')")
```

### Android (WebView)

```kotlin
// Web → Native
@JavascriptInterface
fun postMessage(message: String)

// Native → Web
webView.evaluateJavascript("window.__bridgeCallback('$response')") { }
```

## 模块系统

### 模块接口

所有模块都实现统一的接口：

```typescript
// Web
interface BridgeModule {
  moduleName: string
  methods: readonly string[]
}

// iOS
protocol BridgeModuleProtocol {
  var moduleName: String { get }
  func handle(method: String, params: [String: Any], 
              completion: @escaping (Result<Any, Error>) -> Void)
}

// Android
interface BridgeModule {
  val moduleName: String
  suspend fun handle(method: String, params: JSONObject): Any
}
```

### 模块注册

```swift
// iOS
bridge.registerModule(DeviceModule())
bridge.registerModule(HapticsModule())

// Android
bridge.registerModule(DeviceModule(context))
bridge.registerModule(HapticsModule(context))
```

## 事件系统

### 系统事件

| 事件名 | 描述 | 数据 |
|--------|------|------|
| `App.Foreground` | 应用进入前台 | `{}` |
| `App.Background` | 应用进入后台 | `{}` |
| `App.WillTerminate` | 应用即将终止 | `{}` |
| `Network.StatusChanged` | 网络状态变化 | `NetworkStatus` |

### 自定义事件

```typescript
// 触发事件 (Native)
bridge.dispatchEvent("Custom.Event", data)

// 监听事件 (Web)
Bridge.addEventListener('Custom.Event', (data) => {
  console.log(data)
})
```

## 错误处理

### 错误码

| 代码 | 常量 | 描述 |
|------|------|------|
| -1 | `UNKNOWN` | 未知错误 |
| -2 | `NOT_READY` | Bridge 未就绪 |
| -3 | `NOT_SUPPORTED` | 功能不支持 |
| -4 | `INVALID_PARAMS` | 参数无效 |
| -5 | `TIMEOUT` | 请求超时 |
| -6 | `PERMISSION_DENIED` | 权限被拒绝 |

### 错误处理示例

```typescript
import { BridgeError, ErrorCodes } from '@aspect/webview-bridge'

try {
  await Bridge.camera.takePhoto()
} catch (error) {
  if (error instanceof BridgeError) {
    switch (error.code) {
      case ErrorCodes.PERMISSION_DENIED:
        console.log('请先授权相机权限')
        break
      case ErrorCodes.NOT_SUPPORTED:
        console.log('当前设备不支持此功能')
        break
      default:
        console.log('发生错误:', error.message)
    }
  }
}
```

## 生命周期

```
┌─────────────────────────────────────────────┐
│                  初始化阶段                   │
│  1. 创建 BridgeCore 实例                     │
│  2. 注册全局回调 (__bridgeCallback)           │
│  3. 检测 Native 环境                          │
│  4. 标记就绪状态                              │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│                  运行阶段                     │
│  1. 发送请求 → 等待响应                       │
│  2. 接收事件 → 触发回调                       │
│  3. 管理 pending callbacks                   │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│                  销毁阶段                     │
│  1. 清理 pending callbacks                   │
│  2. 移除事件监听器                            │
│  3. 重置全局回调                              │
└─────────────────────────────────────────────┘
```
