# API 概览

WebView Bridge SDK 提供了丰富的模块来访问原生能力。

## 核心 API

### Bridge

全局单例对象，提供对所有模块的访问。

```typescript
import { Bridge } from '@aspect/webview-bridge'
```

**属性**

| 属性 | 类型 | 描述 |
|------|------|------|
| `isNative` | `boolean` | 是否运行在 Native 环境 |
| `isReady` | `boolean` | Bridge 是否就绪 |

**方法**

| 方法 | 返回类型 | 描述 |
|------|----------|------|
| `whenReady()` | `Promise<void>` | 等待 Bridge 就绪 |
| `addEventListener(event, handler)` | `void` | 添加事件监听 |
| `removeEventListener(event, handler)` | `void` | 移除事件监听 |
| `destroy()` | `void` | 销毁实例 |

## 模块列表

### 基础模块

| 模块 | 访问路径 | 描述 |
|------|----------|------|
| [App](/api/modules/app) | `Bridge.app` | 应用信息与生命周期 |
| [Device](/api/modules/device) | `Bridge.device` | 设备与系统信息 |
| [Storage](/api/modules/storage) | `Bridge.storage` | 安全本地存储 |

### 交互模块

| 模块 | 访问路径 | 描述 |
|------|----------|------|
| [Clipboard](/api/modules/clipboard) | `Bridge.clipboard` | 剪贴板访问 |
| [Haptics](/api/modules/haptics) | `Bridge.haptics` | 触觉反馈 |
| [StatusBar](/api/modules/statusbar) | `Bridge.statusBar` | 状态栏控制 |
| [System](/api/modules/system) | `Bridge.system` | 系统功能 |

### 权限模块

| 模块 | 访问路径 | 描述 |
|------|----------|------|
| [Permission](/api/modules/permission) | `Bridge.permission` | 权限管理 |

### 数据模块

| 模块 | 访问路径 | 描述 |
|------|----------|------|
| [Contacts](/api/modules/contacts) | `Bridge.contacts` | 联系人访问 |
| [Media](/api/modules/media) | `Bridge.media` | 相机与相册 |
| [Location](/api/modules/location) | `Bridge.location` | 位置服务 |

### 硬件模块

| 模块 | 访问路径 | 描述 |
|------|----------|------|
| [Biometrics](/api/modules/biometrics) | `Bridge.biometrics` | 生物识别认证 |
| [NFC](/api/modules/nfc) | `Bridge.nfc` | 近场通信 |
| [Network](/api/modules/network) | `Bridge.network` | 网络状态监控 |

### 扩展模块

| 模块 | 访问路径 | 描述 |
|------|----------|------|
| [Custom](/api/modules/custom) | `Bridge.custom` | 自定义 UI 组件（示例模块） |
| [InAppReview](/api/modules/in-app-review) | `Bridge.inAppReview` | 应用内评价 |

## 类型定义

所有类型都可以从包中导入：

```typescript
import {
  type DeviceInfo,
  type BatteryInfo,
  type Contact,
  type MediaResult,
  type LocationResult,
  type NetworkStatus,
  // ...更多类型
} from '@aspect/webview-bridge'
```

## 错误处理

```typescript
import { BridgeError, ErrorCodes } from '@aspect/webview-bridge'

try {
  await Bridge.device.getInfo()
} catch (error) {
  if (error instanceof BridgeError) {
    switch (error.code) {
      case ErrorCodes.NOT_READY:
        // Bridge 未就绪
        break
      case ErrorCodes.PERMISSION_DENIED:
        // 权限被拒绝
        break
      // ...
    }
  }
}
```

## 下一步

- 查看具体模块的详细 API
- 了解 [事件系统](/api/events)
- 阅读 [扩展开发指南](/extension/overview)
