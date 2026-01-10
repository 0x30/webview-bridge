# 基本用法

本文档介绍 WebView Bridge SDK 的基本使用方法。

## Bridge 对象

`Bridge` 是 SDK 的核心入口，通过它可以访问所有模块和功能。

```typescript
import { Bridge } from '@aspect/webview-bridge'

// 检查环境
console.log('是否在 Native 环境:', Bridge.isNative)
console.log('Bridge 是否就绪:', Bridge.isReady)
```

## 等待就绪

在调用任何模块方法之前，建议先等待 Bridge 就绪：

```typescript
// 异步等待
await Bridge.whenReady()

// 或者检查状态
if (Bridge.isReady) {
  // 可以调用模块方法
}
```

## 使用模块

每个模块都通过 `Bridge` 对象访问：

```typescript
// 设备模块
const deviceInfo = await Bridge.device.getInfo()

// 触觉反馈模块
await Bridge.haptics.impact('medium')

// 剪贴板模块
await Bridge.clipboard.write({ text: 'Hello' })

// 存储模块
await Bridge.storage.set({ key: 'token', value: 'xxx' })
```

## 处理返回值

所有模块方法都返回 Promise：

```typescript
try {
  const result = await Bridge.device.getBatteryInfo()
  console.log(`电量: ${result.level}%`)
  console.log(`是否充电: ${result.isCharging}`)
} catch (error) {
  console.error('获取电池信息失败:', error)
}
```

## 事件监听

使用 `addEventListener` 监听系统事件：

```typescript
// 监听应用生命周期
Bridge.addEventListener('App.Foreground', () => {
  console.log('应用进入前台')
})

Bridge.addEventListener('App.Background', () => {
  console.log('应用进入后台')
})

// 移除监听器
const handler = (data) => console.log(data)
Bridge.addEventListener('App.Foreground', handler)
Bridge.removeEventListener('App.Foreground', handler)
```

## 完整示例

```typescript
import { Bridge } from '@aspect/webview-bridge'

async function initApp() {
  // 检查环境
  if (!Bridge.isNative) {
    console.log('运行在普通浏览器中')
    return
  }

  // 等待 Bridge 就绪
  await Bridge.whenReady()
  console.log('Bridge 已就绪!')

  // 获取设备信息
  const device = await Bridge.device.getInfo()
  console.log(`设备: ${device.model}`)
  console.log(`系统: ${device.osName} ${device.osVersion}`)

  // 获取应用信息
  const app = await Bridge.app.getInfo()
  console.log(`应用: ${app.name} v${app.version}`)

  // 检查权限
  const cameraPermission = await Bridge.permission.check('camera')
  if (!cameraPermission.granted) {
    const result = await Bridge.permission.request('camera')
    console.log('相机权限:', result.granted ? '已授权' : '被拒绝')
  }

  // 监听应用状态
  Bridge.addEventListener('App.Foreground', () => {
    console.log('应用进入前台')
  })

  Bridge.addEventListener('App.Background', () => {
    console.log('应用进入后台')
  })

  // 触觉反馈
  await Bridge.haptics.notification('success')
}

initApp()
```

## TypeScript 支持

SDK 提供完整的 TypeScript 类型定义：

```typescript
import { 
  Bridge,
  type DeviceInfo,
  type BatteryInfo,
  type Contact 
} from '@aspect/webview-bridge'

async function demo() {
  // 类型会自动推断
  const device: DeviceInfo = await Bridge.device.getInfo()
  const battery: BatteryInfo = await Bridge.device.getBatteryInfo()
  
  // 类型错误会在编译时提示
  // const wrong = device.nonExistentProperty // ❌ 编译错误
}
```

## 调试模式

开发时可以启用调试模式查看详细日志：

```typescript
import { BridgeCore } from '@aspect/webview-bridge'

// 创建带调试配置的实例
const core = BridgeCore.getInstance({
  debug: true,
  timeout: 60000  // 增加超时时间便于调试
})
```
