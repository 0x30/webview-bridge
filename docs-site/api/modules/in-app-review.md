# InAppReview 模块

InAppReview 模块提供了应用内评价功能，支持 iOS App Store 和 Google Play Store 的原生评价弹窗。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const inAppReview = bridge.inAppReview
```

## 概述

应用内评价允许用户在不离开应用的情况下对应用进行评分和评价。这个功能由操作系统和应用商店控制，开发者只能请求显示评价弹窗，但无法控制弹窗是否真的会显示。

### 平台差异

| 特性 | iOS | Android |
|------|-----|---------|
| SDK | StoreKit | Google Play In-App Review API |
| 显示频率限制 | 每年每个应用最多 3 次 | 由 Google Play 控制配额 |
| 是否知道用户评价 | 否 | 否 |
| 最低系统版本 | iOS 10.3+ | Android 5.0+ (需要 Google Play) |

## 方法

### requestReview

请求显示应用内评价弹窗。

**签名**

```typescript
requestReview(): Promise<RequestReviewResult>
```

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| requested | boolean | 是否成功发起请求（不代表弹窗一定会显示） |
| message | string \| null | 附加信息 |

**重要说明**

- 调用此方法并不保证评价弹窗会显示
- 系统会根据自己的策略决定是否显示（如用户已评价、频率限制等）
- API 不会告知用户是否真的提交了评价（这是为了防止开发者区别对待用户）
- 不要在应用启动时立即调用，建议在用户完成某些正面操作后调用

**示例**

```typescript
// 在用户完成某个正面操作后请求评价
async function onTaskCompleted() {
  try {
    const result = await bridge.inAppReview.requestReview()
    if (result.requested) {
      console.log('评价请求已发送')
    }
  } catch (error) {
    console.error('请求评价失败:', error)
  }
}
```

### isAvailable

检查应用内评价功能是否可用。

**签名**

```typescript
isAvailable(): Promise<ReviewAvailability>
```

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| isSupported | boolean | 是否支持应用内评价 |
| reason | string \| null | 不支持的原因（如果不支持） |

**示例**

```typescript
const availability = await bridge.inAppReview.isAvailable()

if (availability.isSupported) {
  // 可以使用应用内评价
  await bridge.inAppReview.requestReview()
} else {
  // 回退到打开应用商店
  console.log('不支持应用内评价:', availability.reason)
  await bridge.inAppReview.openStoreReview({ appId: '123456789' })
}
```

### openStoreReview

直接打开应用商店的评价页面。

**签名**

```typescript
openStoreReview(params?: OpenStoreReviewParams): Promise<OpenStoreReviewResult>
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | iOS 必填 | iOS App Store 应用 ID（数字字符串） |
| packageName | string | 可选 | Android 应用包名（默认使用当前应用包名） |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| opened | boolean | 是否成功打开应用商店 |

**示例**

```typescript
// iOS - 使用 App Store ID
await bridge.inAppReview.openStoreReview({
  appId: '123456789'
})

// Android - 使用当前应用包名
await bridge.inAppReview.openStoreReview()

// Android - 指定包名
await bridge.inAppReview.openStoreReview({
  packageName: 'com.example.myapp'
})
```

## 类型定义

### ReviewAvailability

```typescript
interface ReviewAvailability {
  /** 是否支持应用内评价 */
  isSupported: boolean
  /** 不支持的原因（如果不支持） */
  reason?: string | null
}
```

### RequestReviewResult

```typescript
interface RequestReviewResult {
  /** 是否成功发起请求 */
  requested: boolean
  /** 附加信息 */
  message?: string | null
}
```

### OpenStoreReviewParams

```typescript
interface OpenStoreReviewParams {
  /** iOS App Store 应用 ID 或 Android 包名 */
  appId?: string
  /** Android 专用包名 */
  packageName?: string
}
```

### OpenStoreReviewResult

```typescript
interface OpenStoreReviewResult {
  /** 是否成功打开 */
  opened: boolean
}
```

## 最佳实践

### 1. 选择合适的时机请求评价

不要在应用启动时或用户可能感到沮丧时请求评价。建议在以下时机：

- 用户完成了一个重要任务
- 用户达成了某个成就
- 用户使用应用一段时间后（如 7 天）
- 用户完成了一定数量的操作（如完成 10 个任务）

```typescript
// 示例：在用户完成任务后请求评价
let completedTasks = 0

async function onTaskComplete() {
  completedTasks++
  
  // 每完成 5 个任务且未请求过评价时
  if (completedTasks % 5 === 0 && !hasRequestedReview) {
    const availability = await bridge.inAppReview.isAvailable()
    if (availability.isSupported) {
      await bridge.inAppReview.requestReview()
      hasRequestedReview = true
    }
  }
}
```

### 2. 不要频繁请求

由于系统有频率限制，频繁调用 `requestReview()` 不会有任何效果。建议：

- 记录上次请求时间，间隔一定时间后才再次请求
- 使用本地存储记录是否已请求过评价

### 3. 提供备选方案

如果应用内评价不可用，可以引导用户到应用商店：

```typescript
async function askForReview() {
  const availability = await bridge.inAppReview.isAvailable()
  
  if (availability.isSupported) {
    await bridge.inAppReview.requestReview()
  } else {
    // 显示确认对话框，然后打开应用商店
    const confirmed = await showConfirmDialog('是否前往应用商店评价？')
    if (confirmed) {
      await bridge.inAppReview.openStoreReview({
        appId: '123456789'  // 替换为你的 App Store ID
      })
    }
  }
}
```

### 4. 不要根据评价结果改变应用行为

API 设计上不会告知用户是否真的提交了评价。这是为了防止开发者：

- 只向给出好评的用户显示某些功能
- 惩罚没有评价或给出差评的用户

## 平台特定说明

### iOS

- 使用 `SKStoreReviewController` 实现
- 每个应用每年最多显示 3 次评价弹窗
- 系统会根据用户行为决定是否显示
- 打开应用商店使用 `https://apps.apple.com/app/id{APP_ID}?action=write-review`

### Android

- 使用 Google Play In-App Review API
- 需要设备安装 Google Play Store
- 需要应用从 Google Play 安装（调试版本也可以测试）
- 配额由 Google Play 控制，开发者无法获知具体限制
- 打开应用商店使用 `market://details?id={PACKAGE_NAME}`

## 错误处理

```typescript
try {
  await bridge.inAppReview.requestReview()
} catch (error) {
  if (error.code === 'PLAY_STORE_NOT_FOUND') {
    // Android: Google Play Store 未安装
    console.log('Google Play Store 未安装')
  } else if (error.code === 'NO_ACTIVE_SCENE') {
    // iOS: 没有活跃的窗口场景
    console.log('无法显示评价弹窗')
  } else {
    console.error('请求评价失败:', error)
  }
}
```

## 常见问题

### Q: 为什么调用 requestReview() 后没有显示评价弹窗？

A: 系统有自己的策略决定是否显示弹窗，可能的原因包括：
- 用户已经评价过此应用
- 达到了频率限制
- 用户关闭了评价提示功能
- 处于测试环境（但 iOS 模拟器和 Android 测试账号应该可以显示）

### Q: 如何在开发时测试评价功能？

A: 
- iOS: 在 Xcode 模拟器或真机上运行，可以看到评价弹窗（但不会真的提交）
- Android: 需要使用 Google Play 内部测试轨道发布的版本

### Q: 如何获取我的 App Store ID？

A: 登录 [App Store Connect](https://appstoreconnect.apple.com/)，查看你的应用信息，Apple ID 字段就是你需要的 ID。
