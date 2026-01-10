# Bridge 对象

Bridge 对象是 WebView Bridge SDK 的核心入口点，提供了统一的 API 来访问所有原生能力。

## 创建实例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
```

### 配置选项

```typescript
interface BridgeConfig {
  /** 是否启用调试模式 */
  debug?: boolean
  /** 请求超时时间（毫秒） */
  timeout?: number
  /** 自定义消息前缀 */
  messagePrefix?: string
}

const bridge = new WebViewBridge({
  debug: true,
  timeout: 30000,
})
```

## 模块访问

通过 Bridge 实例可以访问所有功能模块：

```typescript
// 基础模块
bridge.app        // 应用信息
bridge.device     // 设备信息
bridge.storage    // 本地存储
bridge.clipboard  // 剪贴板
bridge.haptics    // 触觉反馈
bridge.statusBar  // 状态栏
bridge.system     // 系统功能
bridge.permission // 权限管理

// 高级模块
bridge.contacts   // 联系人
bridge.media      // 媒体（相机、相册）
bridge.location   // 地理位置
bridge.biometrics // 生物识别
bridge.nfc        // NFC
bridge.network    // 网络状态
```

## 核心方法

### send

发送消息到原生端。

```typescript
type send<T>(type: string, params?: Record<string, unknown>): Promise<T>
```

这是底层 API，通常不需要直接使用。模块方法内部会调用此方法。

```typescript
// 直接使用（不推荐）
const result = await bridge.core.send<DeviceInfo>('Device.GetInfo')

// 使用模块方法（推荐）
const result = await bridge.device.getInfo()
```

### addEventListener

添加事件监听器。

```typescript
type addEventListener(event: string, callback: (data: any) => void): void
```

```typescript
bridge.core.addEventListener('Network.StatusChanged', (status) => {
  console.log('网络状态变化:', status)
})
```

### removeEventListener

移除事件监听器。

```typescript
type removeEventListener(event: string, callback: (data: any) => void): void
```

```typescript
const handler = (status) => console.log(status)
bridge.core.addEventListener('Network.StatusChanged', handler)

// 稍后移除
bridge.core.removeEventListener('Network.StatusChanged', handler)
```

## 类型导出

SDK 导出了所有需要的类型定义：

```typescript
import {
  // Bridge 类
  WebViewBridge,
  BridgeCore,
  
  // 模块类
  DeviceModule,
  ContactsModule,
  MediaModule,
  // ...
  
  // 类型
  DeviceInfo,
  Contact,
  MediaResult,
  PermissionType,
  PermissionStatus,
  // ...
} from 'webview-bridge-sdk'
```

## 单例模式

`BridgeCore` 使用单例模式，确保全局只有一个实例：

```typescript
// 两个 WebViewBridge 实例共享同一个 BridgeCore
const bridge1 = new WebViewBridge()
const bridge2 = new WebViewBridge()

// bridge1.core === bridge2.core (true)
```

## 生命周期

```typescript
// 创建
const bridge = new WebViewBridge()

// 使用
await bridge.device.getInfo()

// 销毁（可选，通常不需要）
bridge.destroy()
```

## 环境检测

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 检测是否在原生环境中
const isNative = bridge.isNativeEnvironment()

if (isNative) {
  // 使用原生功能
  await bridge.haptics.impact()
} else {
  // Web 端降级处理
  console.log('触觉反馈不可用')
}
```

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

async function init() {
  const bridge = new WebViewBridge({ debug: true })
  
  // 获取设备信息
  const deviceInfo = await bridge.device.getInfo()
  console.log('设备:', deviceInfo.model)
  
  // 检查权限
  const permission = await bridge.permission.check({ type: 'camera' })
  console.log('相机权限:', permission.status)
  
  // 监听网络变化
  bridge.network.onStatusChanged((status) => {
    console.log('网络:', status.isConnected ? '已连接' : '已断开')
  })
  
  // 获取位置
  try {
    const location = await bridge.location.getCurrent()
    console.log('位置:', location.latitude, location.longitude)
  } catch (error) {
    console.error('获取位置失败:', error)
  }
}

init()
```
