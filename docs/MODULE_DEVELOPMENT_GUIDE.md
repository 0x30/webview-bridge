# WebView Bridge 模块开发指南

> 本文档用于指导 AI 或开发者如何为 WebView Bridge 项目添加新的原生模块。以 InAppReview 模块为参考模板。

## 📁 项目结构概览

```
webview-bridge/
├── android/                           # Android 原生代码
│   ├── build.gradle.kts               # Android 依赖配置
│   └── src/main/java/com/aspect/webviewbridge/
│       ├── core/WebViewBridge.kt      # Bridge 核心（注册模块）
│       └── modules/                   # 模块目录
│           └── [ModuleName]Module.kt  # 新模块文件
│
├── ios/                               # iOS 原生代码
│   ├── Package.swift                  # Swift 包配置
│   └── Sources/
│       ├── Core/WebViewBridge.swift   # Bridge 核心（注册模块）
│       └── Modules/                   # 模块目录
│           └── [ModuleName]Module.swift # 新模块文件
│
├── packages/
│   ├── web-sdk/                       # Web SDK TypeScript
│   │   └── src/
│   │       ├── index.ts               # 导出入口
│   │       └── modules/
│   │           ├── index.ts           # 模块类型导出
│   │           └── [moduleName].ts    # 新模块文件
│   │
│   └── web-example/                   # Web 示例应用
│       └── src/
│           ├── App.tsx                # 主应用（Tab 配置）
│           └── components/
│               └── [ModuleName]Demo.tsx # 新模块演示组件
│
├── docs-site/                         # 文档站点
│   └── api/modules/
│       └── [module-name].md           # 新模块文档
│
└── example/                           # 原生示例项目
    ├── android/                       # Android 示例（用于编译测试）
    └── ios/                           # iOS 示例（用于编译测试）
```

---

## 🔧 开发新模块的完整步骤

### 步骤 1: iOS 模块实现

**文件路径**: `ios/Sources/Modules/[ModuleName]Module.swift`

```swift
import Foundation
import UIKit
// 导入所需的框架
// import StoreKit // 例如 InAppReview 需要

/// [ModuleName] 模块 - 功能描述
public class [ModuleName]Module: BridgeModule {
    
    // MARK: - BridgeModule Protocol
    
    public static let moduleName = "[moduleName]"  // 小驼峰命名
    
    public weak var bridge: BridgeProtocol?
    
    public required init() {}
    
    public func handle(
        method: String,
        params: [String: Any],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "methodOne":
            methodOne(params: params, callback: callback)
        case "methodTwo":
            methodTwo(params: params, callback: callback)
        default:
            callback(.failure(.methodNotFound(method)))
        }
    }
    
    // MARK: - 私有方法实现
    
    private func methodOne(
        params: [String: Any],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        // 参数解析
        let param1 = params["param1"] as? String ?? "default"
        
        // 主线程执行 UI 操作
        DispatchQueue.main.async {
            // 实现逻辑
            callback(.success(["result": true]))
        }
    }
    
    private func methodTwo(
        params: [String: Any],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        // 异步操作示例
        callback(.success(nil))
    }
}
```

**关键点**:
- 实现 `BridgeModule` 协议
- `moduleName` 使用小驼峰命名（如 `inAppReview`）
- `handle` 方法分发具体方法调用
- UI 操作必须在主线程执行
- 使用 `Result<Any?, BridgeError>` 返回结果

---

### 步骤 2: Android 模块实现

**文件路径**: `android/src/main/java/com/aspect/webviewbridge/modules/[ModuleName]Module.kt`

```kotlin
package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
// 导入所需的库
import com.aspect.webviewbridge.protocol.BridgeModule
import com.aspect.webviewbridge.protocol.BridgeModuleContext
import com.aspect.webviewbridge.protocol.BridgeError
import kotlinx.coroutines.*

/**
 * [ModuleName] 模块 - 功能描述
 */
class [ModuleName]Module : BridgeModule {
    
    override val moduleName: String = "[moduleName]"  // 小驼峰命名
    
    private lateinit var bridgeContext: BridgeModuleContext
    private val context: Context get() = bridgeContext.getActivity()?.applicationContext 
        ?: throw IllegalStateException("Context not available")
    
    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    override fun initialize(context: BridgeModuleContext) {
        bridgeContext = context
    }
    
    override fun handle(
        method: String,
        params: Map<String, Any?>,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "methodOne" -> methodOne(params, callback)
            "methodTwo" -> methodTwo(params, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound(method)))
        }
    }
    
    override fun destroy() {
        mainScope.cancel()
    }
    
    // MARK: - 方法实现
    
    private fun methodOne(
        params: Map<String, Any?>,
        callback: (Result<Any?>) -> Unit
    ) {
        // 参数解析
        val param1 = params["param1"] as? String ?: "default"
        
        mainScope.launch {
            try {
                // 实现逻辑
                callback(Result.success(mapOf("result" to true)))
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message ?: "Unknown error")))
            }
        }
    }
    
    private fun methodTwo(
        params: Map<String, Any?>,
        callback: (Result<Any?>) -> Unit
    ) {
        // 实现逻辑
        callback(Result.success(null))
    }
    
    /**
     * 获取当前 Activity
     */
    private fun getActivity(): Activity? {
        return bridgeContext.getActivity()
    }
}
```

**关键点**:
- 实现 `BridgeModule` 接口
- 使用 `lateinit var bridgeContext` 保存上下文
- 通过 `bridgeContext.getActivity()` 获取 Activity
- 使用协程处理异步操作
- 在 `destroy()` 中取消协程

---

### 步骤 3: 添加 Android 依赖（如需要）

**文件路径**: `android/build.gradle.kts`

```kotlin
dependencies {
    // 现有依赖...
    
    // 添加新模块依赖
    implementation("com.example:library:1.0.0")
}
```

---

### 步骤 4: 注册模块到 Bridge

#### iOS 注册

**文件路径**: `ios/Sources/Core/WebViewBridge.swift`

在 `registerBuiltInModules()` 方法中添加：

```swift
private func registerBuiltInModules() {
    // 现有模块...
    register(module: [ModuleName]Module())
}
```

#### Android 注册

**文件路径**: `android/src/main/java/com/aspect/webviewbridge/core/WebViewBridge.kt`

在 `registerBuiltInModules()` 方法中添加：

```kotlin
private fun registerBuiltInModules() {
    // 现有模块...
    registerModule([ModuleName]Module())
}
```

---

### 步骤 5: Web SDK TypeScript 模块

**文件路径**: `packages/web-sdk/src/modules/[moduleName].ts`

```typescript
import { BridgeModule, BridgeCore } from '../core'

// ============ 类型定义 ============

/**
 * MethodOne 请求参数
 */
export interface MethodOneParams {
  param1?: string
  param2?: number
}

/**
 * MethodOne 响应结果
 */
export interface MethodOneResult {
  success: boolean
  data?: string
}

/**
 * MethodTwo 响应结果
 */
export interface MethodTwoResult {
  available: boolean
  reason?: string
}

// ============ 模块实现 ============

/**
 * [ModuleName] 模块
 * 
 * 功能描述...
 * 
 * @example
 * ```typescript
 * import { [ModuleName]Module } from '@aspect/web-sdk'
 * 
 * // 调用方法一
 * const result = await [ModuleName]Module.methodOne({ param1: 'value' })
 * 
 * // 调用方法二
 * const status = await [ModuleName]Module.methodTwo()
 * ```
 * 
 * @platform iOS, Android
 */
export const [ModuleName]Module: BridgeModule = {
  name: '[moduleName]',  // 与原生 moduleName 一致
  
  methods: ['methodOne', 'methodTwo'],  // 列出所有方法
  
  /**
   * 方法一 - 功能描述
   * @param params 请求参数
   * @returns 响应结果
   */
  async methodOne(params: MethodOneParams = {}): Promise<MethodOneResult> {
    const bridge = BridgeCore.getInstance()
    return bridge.send<MethodOneResult>('[moduleName]', 'methodOne', params)
  },
  
  /**
   * 方法二 - 功能描述
   * @returns 响应结果
   */
  async methodTwo(): Promise<MethodTwoResult> {
    const bridge = BridgeCore.getInstance()
    return bridge.send<MethodTwoResult>('[moduleName]', 'methodTwo', {})
  }
}

export default [ModuleName]Module
```

**关键点**:
- 模块名称必须与原生端一致（小驼峰）
- `methods` 数组列出所有可用方法
- 使用 `BridgeCore.getInstance().send()` 调用原生方法
- 完整的 JSDoc 注释和类型定义

---

### 步骤 6: 导出 Web SDK 模块

#### 导出模块类

**文件路径**: `packages/web-sdk/src/index.ts`

```typescript
// 现有导出...
export { [ModuleName]Module } from './modules/[moduleName]'
```

#### 导出类型定义

**文件路径**: `packages/web-sdk/src/modules/index.ts`

```typescript
// 现有导出...
export type {
  MethodOneParams,
  MethodOneResult,
  MethodTwoResult
} from './[moduleName]'
```

---

### 步骤 7: 创建示例组件

**文件路径**: `packages/web-example/src/components/[ModuleName]Demo.tsx`

```tsx
import { defineComponent, ref } from 'vue'
import { Cell, CellGroup, Button, showToast, showLoadingToast, closeToast } from 'vant'
import { [ModuleName]Module } from '@aspect/web-sdk'
import type { MethodOneResult, MethodTwoResult } from '@aspect/web-sdk'

export default defineComponent({
  name: '[ModuleName]Demo',
  
  setup() {
    const result = ref<string>('')
    
    const handleMethodOne = async () => {
      showLoadingToast({ message: '请求中...', forbidClick: true })
      try {
        const res: MethodOneResult = await [ModuleName]Module.methodOne({
          param1: 'test'
        })
        closeToast()
        result.value = JSON.stringify(res, null, 2)
        showToast(res.success ? '成功' : '失败')
      } catch (error) {
        closeToast()
        showToast(`错误: ${(error as Error).message}`)
      }
    }
    
    const handleMethodTwo = async () => {
      try {
        const res: MethodTwoResult = await [ModuleName]Module.methodTwo()
        result.value = JSON.stringify(res, null, 2)
      } catch (error) {
        showToast(`错误: ${(error as Error).message}`)
      }
    }
    
    return () => (
      <div class="demo-container">
        <CellGroup title="[ModuleName] 模块">
          <Cell title="方法一" is-link onClick={handleMethodOne} />
          <Cell title="方法二" is-link onClick={handleMethodTwo} />
        </CellGroup>
        
        {result.value && (
          <CellGroup title="结果">
            <Cell>
              <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {result.value}
              </pre>
            </Cell>
          </CellGroup>
        )}
      </div>
    )
  }
})
```

---

### 步骤 8: 集成示例到 App.tsx

**文件路径**: `packages/web-example/src/App.tsx`

```tsx
// 导入组件
import [ModuleName]Demo from './components/[ModuleName]Demo'

// 在 tabs 数组中添加
const tabs = [
  // 现有 tabs...
  { name: '[显示名称]', component: [ModuleName]Demo }
]
```

---

### 步骤 9: 创建 API 文档

**文件路径**: `docs-site/api/modules/[module-name].md`

```markdown
# [ModuleName] 模块

功能描述...

## 平台支持

| 平台 | 支持状态 |
|------|---------|
| iOS | ✅ iOS 14.0+ |
| Android | ✅ API 21+ |
| Web | ❌ 不支持 |

## 方法

### methodOne

方法描述...

**参数:**

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
|--------|------|------|--------|------|
| param1 | string | 否 | - | 参数描述 |

**返回值:**

```typescript
interface MethodOneResult {
  success: boolean
  data?: string
}
```

**示例:**

```typescript
import { [ModuleName]Module } from '@aspect/web-sdk'

const result = await [ModuleName]Module.methodOne({ param1: 'value' })
console.log(result.success)
```

### methodTwo

方法描述...

**返回值:**

```typescript
interface MethodTwoResult {
  available: boolean
  reason?: string
}
```

## 平台差异

### iOS
- iOS 特定行为说明

### Android
- Android 特定行为说明

## 最佳实践

1. 使用建议一
2. 使用建议二

## 常见问题

### Q: 问题一？
A: 解答一

### Q: 问题二？
A: 解答二
```

---

### 步骤 10: 更新文档索引

**文件路径**: `docs-site/api/index.md`

在模块列表中添加链接：

```markdown
- [[ModuleName]](./modules/[module-name].md) - 功能描述
```

---

## ✅ 验证清单

完成模块开发后，按以下清单验证：

### 编译验证

```bash
# 1. Web SDK 编译
cd packages/web-sdk && pnpm build

# 2. Web Example 编译
cd packages/web-example && pnpm build

# 3. iOS 编译（需要 Xcode）
cd example/ios/WebViewBridgeDemo
xcodebuild -project WebViewBridgeDemo.xcodeproj \
  -scheme WebViewBridgeDemo \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build

# 4. Android 编译
cd example/android && ./gradlew assembleDebug
```

### 功能验证

- [ ] iOS 模块方法可正常调用
- [ ] Android 模块方法可正常调用
- [ ] Web SDK 类型定义正确
- [ ] 示例组件可展示功能
- [ ] 错误处理正常工作

---

## 📋 命名规范

| 位置 | 格式 | 示例 |
|------|------|------|
| 模块类名 | PascalCase + Module | `InAppReviewModule` |
| moduleName 属性 | camelCase | `"inAppReview"` |
| 文件名 (Swift/Kotlin) | PascalCaseModule | `InAppReviewModule.swift` |
| 文件名 (TypeScript) | camelCase | `inAppReview.ts` |
| 文档文件名 | kebab-case | `in-app-review.md` |
| 方法名 | camelCase | `requestReview` |

---

## 🔍 参考示例

完整的 InAppReview 模块实现可作为参考：

- iOS: [ios/Sources/Modules/InAppReviewModule.swift](../ios/Sources/Modules/InAppReviewModule.swift)
- Android: [android/src/main/java/com/aspect/webviewbridge/modules/InAppReviewModule.kt](../android/src/main/java/com/aspect/webviewbridge/modules/InAppReviewModule.kt)
- Web SDK: [packages/web-sdk/src/modules/inAppReview.ts](../packages/web-sdk/src/modules/inAppReview.ts)
- 示例组件: [packages/web-example/src/components/InAppReviewDemo.tsx](../packages/web-example/src/components/InAppReviewDemo.tsx)
- API 文档: [docs-site/api/modules/in-app-review.md](../docs-site/api/modules/in-app-review.md)

---

## 🚨 常见错误

### 1. Android: `Unresolved reference: activity`

**错误**: 直接使用 `bridgeContext.activity`

**修复**: 使用 `bridgeContext.getActivity()`

### 2. iOS: UI 操作崩溃

**错误**: 在后台线程执行 UI 操作

**修复**: 使用 `DispatchQueue.main.async { ... }`

### 3. Web SDK: 方法调用失败

**错误**: 使用 `bridge.invoke()` 方法

**修复**: 使用 `bridge.send()` 方法

### 4. 模块未注册

**错误**: 模块方法调用返回 "module not found"

**修复**: 确保在 `registerBuiltInModules()` 中注册了模块

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2025-01-17 | 1.0 | 基于 InAppReview 模块创建初始文档 |
