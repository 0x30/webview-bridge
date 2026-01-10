# 模块扩展开发指南

本文档说明如何为 WebView Bridge SDK 开发自定义扩展模块。

## 目录

- [概述](#概述)
- [模块结构](#模块结构)
- [Web 端模块开发](#web-端模块开发)
- [iOS 端模块开发](#ios-端模块开发)
- [Android 端模块开发](#android-端模块开发)
- [最佳实践](#最佳实践)
- [错误处理](#错误处理)

---

## 概述

WebView Bridge SDK 采用模块化架构,支持在不修改核心代码的情况下扩展自定义能力。每个模块负责一组相关功能,如用户管理、分析埋点等。

### 模块设计原则

1. **独立性** - 每个模块应自包含,不依赖其他业务模块
2. **一致性** - 三端(Web/iOS/Android)模块名和方法名必须一致
3. **类型安全** - 定义清晰的参数和返回值类型
4. **错误规范** - 使用统一的错误码和错误信息格式

---

## 模块结构

### 模块命名规范

```
模块名.方法名
```

示例:
- `User.GetCurrentUser`
- `User.Login`
- `Analytics.Track`

### 消息协议

请求格式:
```json
{
  "version": "1.0",
  "type": "User.Login",
  "params": {
    "type": "password",
    "account": "user@example.com",
    "password": "***"
  },
  "callbackId": "cb_123"
}
```

响应格式:
```json
{
  "version": "1.0",
  "type": "User.Login",
  "result": {
    "success": true,
    "user": { "userId": "123", "username": "test" },
    "token": "xxx"
  },
  "callbackId": "cb_123"
}
```

---

## Web 端模块开发

### 1. 创建模块类

```typescript
// src/modules/custom-module.ts
import { BridgeCore } from '../core'

// 定义类型
export interface MyParams {
  name: string
  value: number
}

export interface MyResult {
  success: boolean
  data?: any
}

// 创建模块类
export class CustomModule {
  readonly moduleName = 'Custom'
  readonly methods = ['DoSomething', 'GetData'] as const

  private bridge: BridgeCore

  constructor(bridge: BridgeCore) {
    this.bridge = bridge
  }

  async doSomething(params: MyParams): Promise<MyResult> {
    return this.bridge.send<MyResult>('Custom.DoSomething', params)
  }

  async getData(): Promise<any> {
    return this.bridge.send<any>('Custom.GetData')
  }
}
```

### 2. 使用模块

```typescript
import { BridgeCore } from '@aspect/webview-bridge'
import { CustomModule } from './modules/custom-module'

const core = BridgeCore.getInstance()
const customModule = new CustomModule(core)

// 调用方法
const result = await customModule.doSomething({
  name: 'test',
  value: 42
})
```

---

## iOS 端模块开发

### 1. 实现 BridgeModule 协议

```swift
// CustomModule.swift
import Foundation

/// 自定义模块
public class CustomModule: BridgeModule {
    
    public let moduleName = "Custom"
    public let methods = ["DoSomething", "GetData"]
    
    public weak var bridge: WebViewBridge?
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "DoSomething":
            handleDoSomething(params: params, callback: callback)
        case "GetData":
            handleGetData(callback: callback)
        default:
            callback(.failure(.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    private func handleDoSomething(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let name = params["name"]?.value as? String else {
            callback(.failure(.invalidParams("缺少 name 参数")))
            return
        }
        
        let value = params["value"]?.value as? Int ?? 0
        
        // 执行业务逻辑...
        let result: [String: Any] = [
            "success": true,
            "data": ["name": name, "value": value]
        ]
        
        callback(.success(result))
    }
    
    private func handleGetData(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        // 返回数据...
        callback(.success(["items": []]))
    }
}
```

### 2. 注册模块

```swift
let bridge = WebViewBridge.create(
    configuration: BridgeConfiguration(
        debug: true,
        allowsHTTPLoading: true
    )
)

// 注册自定义模块
let customModule = CustomModule(bridge: bridge)
bridge.registerModule(customModule)
```

---

## Android 端模块开发

### 1. 实现 BridgeModule 接口

```kotlin
// CustomModule.kt
package com.yourapp.modules

import android.content.Context
import com.aspect.webviewbridge.protocol.*

class CustomModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "Custom"
    override val methods = listOf("DoSomething", "GetData")
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "DoSomething" -> handleDoSomething(request, callback)
            "GetData" -> handleGetData(callback)
            else -> callback(Result.failure(
                BridgeError.methodNotFound("$moduleName.$method")
            ))
        }
    }
    
    private fun handleDoSomething(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val params = request.params
        val name = params["name"] as? String
        
        if (name == null) {
            callback(Result.failure(
                BridgeError.invalidParams("缺少 name 参数")
            ))
            return
        }
        
        val value = (params["value"] as? Number)?.toInt() ?: 0
        
        // 执行业务逻辑...
        val result = mapOf(
            "success" to true,
            "data" to mapOf("name" to name, "value" to value)
        )
        
        callback(Result.success(result))
    }
    
    private fun handleGetData(callback: (Result<Any?>) -> Unit) {
        callback(Result.success(mapOf("items" to emptyList<Any>())))
    }
}
```

### 2. 注册模块

```kotlin
val configuration = BridgeConfiguration.DEVELOPMENT.copy(
    allowsHTTPLoading = true
)

val bridge = WebViewBridge(context, webView, configuration)

// 注册自定义模块
val customModule = CustomModule(context, bridge.moduleContext)
bridge.registerModule(customModule)
```

---

## 最佳实践

### 1. 类型定义

在三端保持一致的类型定义:

| 类型 | TypeScript | Swift | Kotlin |
|------|------------|-------|--------|
| 字符串 | `string` | `String` | `String` |
| 数字 | `number` | `Int/Double` | `Int/Double` |
| 布尔 | `boolean` | `Bool` | `Boolean` |
| 数组 | `T[]` | `[T]` | `List<T>` |
| 对象 | `Record<K,V>` | `[K: V]` | `Map<K, V>` |
| 可选 | `T \| undefined` | `T?` | `T?` |

### 2. 异步处理

- iOS: 使用 `DispatchQueue` 或 `async/await`
- Android: 使用 `Coroutines` 或 `Handler`
- Web: 使用 `Promise` 或 `async/await`

### 3. 资源管理

```swift
// iOS - 使用 weak 引用避免循环引用
public weak var bridge: WebViewBridge?

// 在 deinit 中清理资源
deinit {
    // 清理...
}
```

```kotlin
// Android - 在 onDestroy 中取消协程
private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

fun onDestroy() {
    scope.cancel()
}
```

---

## 错误处理

### 标准错误码

| 错误码 | 说明 | 使用场景 |
|--------|------|----------|
| `METHOD_NOT_FOUND` | 方法不存在 | 调用了未定义的方法 |
| `INVALID_PARAMS` | 参数无效 | 缺少必要参数或类型错误 |
| `PERMISSION_DENIED` | 权限被拒绝 | 用户拒绝授权 |
| `INTERNAL_ERROR` | 内部错误 | 业务逻辑异常 |
| `TIMEOUT` | 超时 | 操作超时 |
| `NETWORK_ERROR` | 网络错误 | 网络请求失败 |

### 错误响应格式

```json
{
  "version": "1.0",
  "type": "Custom.DoSomething",
  "error": {
    "code": "INVALID_PARAMS",
    "message": "缺少 name 参数"
  },
  "callbackId": "cb_123"
}
```

---

## 示例模块

完整的示例模块代码请参考（请在客户端工程中使用，不要放入 SDK 源码）:

- **Web**: [docs/examples/web/example.ts](../docs/examples/web/example.ts)
- **iOS**: [docs/examples/ios/ExampleModule.swift](../docs/examples/ios/ExampleModule.swift)
- **Android**: [docs/examples/android/ExampleModule.kt](../docs/examples/android/ExampleModule.kt)

这些示例包含:
- `UserModule` - 用户管理模块 (登录/登出/资料更新)
- `AnalyticsModule` - 分析埋点模块 (事件跟踪/用户属性)
