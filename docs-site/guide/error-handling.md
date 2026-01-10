# 错误处理

本文档介绍如何处理 WebView Bridge SDK 中的错误。

## 错误类型

SDK 使用 `BridgeError` 类来表示所有错误：

```typescript
import { BridgeError, ErrorCodes } from '@aspect/webview-bridge'

class BridgeError extends Error {
  code: number
  message: string
  originalError?: Error
}
```

## 错误码

| 代码 | 常量 | 描述 |
|------|------|------|
| -1 | `UNKNOWN` | 未知错误 |
| -2 | `NOT_READY` | Bridge 未就绪 |
| -3 | `NOT_SUPPORTED` | 功能不支持 |
| -4 | `INVALID_PARAMS` | 参数无效 |
| -5 | `TIMEOUT` | 请求超时 |
| -6 | `PERMISSION_DENIED` | 权限被拒绝 |
| -7 | `CANCELLED` | 操作被取消 |
| -8 | `INTERNAL_ERROR` | 内部错误 |
| -9 | `WEBVIEW_DESTROYED` | WebView 已销毁 |

## 基本错误处理

```typescript
try {
  const result = await Bridge.device.getInfo()
} catch (error) {
  if (error instanceof BridgeError) {
    console.error(`错误码: ${error.code}`)
    console.error(`错误信息: ${error.message}`)
  } else {
    console.error('未知错误:', error)
  }
}
```

## 按错误类型处理

```typescript
import { BridgeError, ErrorCodes } from '@aspect/webview-bridge'

async function takePhoto() {
  try {
    return await Bridge.media.takePhoto()
  } catch (error) {
    if (!(error instanceof BridgeError)) {
      throw error
    }

    switch (error.code) {
      case ErrorCodes.PERMISSION_DENIED:
        // 提示用户授权
        showPermissionDialog('相机')
        break
        
      case ErrorCodes.NOT_SUPPORTED:
        // 功能不支持
        showUnsupportedMessage('相机功能')
        break
        
      case ErrorCodes.CANCELLED:
        // 用户取消，不需要处理
        break
        
      case ErrorCodes.TIMEOUT:
        // 超时重试
        return await takePhoto()
        
      default:
        // 其他错误
        showErrorMessage(error.message)
    }
    
    return null
  }
}
```

## 全局错误处理

```typescript
// 创建错误处理包装器
async function safeBridgeCall<T>(
  fn: () => Promise<T>,
  options?: {
    fallback?: T
    showError?: boolean
  }
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof BridgeError) {
      if (options?.showError !== false) {
        console.error(`[Bridge Error] ${error.code}: ${error.message}`)
      }
      
      if (error.code === ErrorCodes.NOT_READY) {
        // 尝试等待就绪后重试
        await Bridge.whenReady()
        return await fn()
      }
    }
    
    return options?.fallback
  }
}

// 使用
const deviceInfo = await safeBridgeCall(
  () => Bridge.device.getInfo(),
  { fallback: { model: 'Unknown' } }
)
```

## 超时处理

默认超时时间为 30 秒，可以自定义：

```typescript
import { BridgeCore } from '@aspect/webview-bridge'

// 全局配置
const core = BridgeCore.getInstance({
  timeout: 60000  // 60 秒
})

// 单次请求配置（需要使用 core.send）
const result = await core.send('Device.GetInfo', {}, {
  timeout: 5000  // 5 秒
})
```

## 权限错误处理

权限相关的错误需要特殊处理：

```typescript
async function requestCameraAndTakePhoto() {
  // 先检查权限
  const permission = await Bridge.permission.check('camera')
  
  if (!permission.granted) {
    // 请求权限
    const result = await Bridge.permission.request('camera')
    
    if (!result.granted) {
      if (result.status === 'denied') {
        // 引导用户去设置页开启
        await Bridge.system.openURL('app-settings:')
      }
      return null
    }
  }
  
  // 权限已获取，拍照
  return await Bridge.media.takePhoto()
}
```

## 最佳实践

### 1. 始终使用 try-catch

```typescript
// ✅ 好
try {
  await Bridge.haptics.impact('medium')
} catch (error) {
  // 触觉反馈失败不影响业务
}

// ❌ 不好
await Bridge.haptics.impact('medium')  // 可能抛出异常
```

### 2. 区分致命和非致命错误

```typescript
try {
  const result = await Bridge.biometrics.authenticate()
} catch (error) {
  if (error instanceof BridgeError) {
    if (error.code === ErrorCodes.CANCELLED) {
      // 用户取消，非致命
      return
    }
    // 其他错误，可能需要处理
    throw error
  }
}
```

### 3. 提供降级方案

```typescript
async function getLocation() {
  if (!Bridge.isNative) {
    // 降级到浏览器 API
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }),
        reject
      )
    })
  }
  
  return Bridge.location.getCurrentPosition()
}
```
