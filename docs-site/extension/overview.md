# 扩展概述

WebView Bridge SDK 采用模块化架构设计，支持轻松扩展新的 Native 能力。本指南将介绍如何创建自定义模块。

## 模块架构

每个模块由三部分组成：

```
┌─────────────────────────────────────────────────────────────┐
│                       Web 模块                               │
│  - TypeScript/JavaScript 实现                                │
│  - 调用 Bridge.send() 发送请求                               │
│  - 处理响应和事件                                            │
└────────────────────────┬────────────────────────────────────┘
                         │ JSON 消息
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Native 模块                              │
│  ┌───────────────────┐     ┌───────────────────┐            │
│  │    iOS 模块       │     │   Android 模块     │            │
│  │    (Swift)        │     │    (Kotlin)       │            │
│  └───────────────────┘     └───────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 模块接口

### Web 端

```typescript
interface BridgeModule {
  /** 模块名称 */
  moduleName: string
  /** 支持的方法列表 */
  methods: readonly string[]
}
```

### iOS 端

```swift
protocol BridgeModuleProtocol {
    var moduleName: String { get }
    func handle(method: String, 
                params: [String: Any], 
                completion: @escaping (Result<Any, Error>) -> Void)
}
```

### Android 端

```kotlin
interface BridgeModule {
    val moduleName: String
    suspend fun handle(method: String, params: JSONObject): Any
}
```

## 消息协议

### 请求格式

```json
{
  "version": "1.0",
  "type": "ModuleName.MethodName",
  "params": { ... },
  "callbackId": "cb_xxx"
}
```

### 响应格式

```json
{
  "callbackId": "cb_xxx",
  "success": true,
  "data": { ... }
}
```

或错误：

```json
{
  "callbackId": "cb_xxx",
  "success": false,
  "error": {
    "code": -1,
    "message": "错误描述"
  }
}
```

## 创建流程

1. **定义接口** - 确定模块名称和方法签名
2. **实现 Web 端** - 创建 TypeScript 模块类
3. **实现 iOS 端** - 创建 Swift 模块类
4. **实现 Android 端** - 创建 Kotlin 模块类
5. **注册模块** - 在各平台注册模块
6. **测试验证** - 端到端测试

## 命名约定

| 项目 | 约定 | 示例 |
|------|------|------|
| 模块名 | PascalCase | `MyModule` |
| 方法名 | PascalCase | `DoSomething` |
| 类型标识 | `模块名.方法名` | `MyModule.DoSomething` |
| Web 类名 | `模块名Module` | `MyModuleModule` |
| iOS 类名 | `模块名Module` | `MyModuleModule` |
| Android 类名 | `模块名Module` | `MyModuleModule` |

## 最佳实践

### 1. 保持简单

每个方法只做一件事，避免复杂的多功能方法。

```typescript
// ✅ 好
getUser(id: string): Promise<User>
updateUser(id: string, data: UserUpdate): Promise<User>

// ❌ 不好
userOperation(action: string, id?: string, data?: any): Promise<any>
```

### 2. 类型安全

为所有参数和返回值定义明确的类型。

```typescript
// ✅ 好
interface GetUserParams {
  id: string
}

interface User {
  id: string
  name: string
  email: string
}

async getUser(params: GetUserParams): Promise<User>

// ❌ 不好
async getUser(params: any): Promise<any>
```

### 3. 错误处理

在 Native 端捕获所有异常，返回有意义的错误信息。

```swift
// ✅ 好
do {
    let result = try performAction()
    completion(.success(result))
} catch let error as CustomError {
    completion(.failure(BridgeError(code: error.code, message: error.message)))
} catch {
    completion(.failure(BridgeError(code: -1, message: error.localizedDescription)))
}
```

### 4. 异步操作

Native 操作应该异步执行，避免阻塞主线程。

```swift
// ✅ 好
DispatchQueue.global().async {
    let result = heavyOperation()
    DispatchQueue.main.async {
        completion(.success(result))
    }
}
```

### 5. 资源清理

提供清理方法，在 WebView 销毁时释放资源。

```swift
protocol BridgeModuleProtocol {
    func cleanup()  // 可选实现
}
```

## 下一步

- [创建 Web 模块](/extension/web-implementation)
- [创建 iOS 模块](/extension/ios-implementation)
- [创建 Android 模块](/extension/android-implementation)
