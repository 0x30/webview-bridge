# 事件系统

WebView Bridge SDK 提供了完善的事件系统，用于接收来自原生端的实时通知。

## 概述

事件系统用于处理异步的原生事件，如：
- 网络状态变化
- 位置更新
- NFC 标签检测
- 生物识别状态变化

## 使用方法

### 基本监听

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 监听网络状态变化
bridge.network.onStatusChanged((status) => {
  console.log('网络状态:', status)
})
```

### 取消监听

所有事件监听方法都返回一个取消函数：

```typescript
const removeListener = bridge.network.onStatusChanged((status) => {
  console.log('网络状态:', status)
})

// 稍后取消监听
removeListener()
```

### 底层 API

也可以直接使用底层 API：

```typescript
const handler = (data: unknown) => {
  console.log('收到事件:', data)
}

// 添加监听
bridge.core.addEventListener('Network.StatusChanged', handler)

// 移除监听
bridge.core.removeEventListener('Network.StatusChanged', handler)
```

## 可用事件

### Network 事件

| 事件名 | 触发时机 | 数据类型 |
|--------|----------|----------|
| Network.StatusChanged | 网络状态变化 | NetworkStatus |

```typescript
interface NetworkStatus {
  isConnected: boolean
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown'
  isExpensive: boolean
}

bridge.network.onStatusChanged((status: NetworkStatus) => {
  if (!status.isConnected) {
    showOfflineMessage()
  }
})
```

### Location 事件

| 事件名 | 触发时机 | 数据类型 |
|--------|----------|----------|
| Location.Updated | 位置更新 | LocationCoords |
| Location.Error | 位置获取失败 | LocationError |

```typescript
interface LocationCoords {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  speed?: number
  heading?: number
  timestamp: number
}

bridge.location.onLocationUpdated((coords: LocationCoords) => {
  updateMapMarker(coords.latitude, coords.longitude)
})
```

### NFC 事件

| 事件名 | 触发时机 | 数据类型 |
|--------|----------|----------|
| NFC.TagDetected | 检测到 NFC 标签 | TagData |
| NFC.WriteSuccess | NFC 写入成功 | void |
| NFC.WriteError | NFC 写入失败 | Error |

```typescript
interface TagData {
  id: string
  technology: string
  records: NDEFRecord[]
}

bridge.nfc.onTagDetected((tag: TagData) => {
  console.log('检测到标签:', tag.id)
  tag.records.forEach(record => {
    console.log('记录:', record)
  })
})
```

### Biometrics 事件

| 事件名 | 触发时机 | 数据类型 |
|--------|----------|----------|
| Biometrics.Changed | 生物识别状态变化 | BiometricsStatus |

```typescript
interface BiometricsStatus {
  isAvailable: boolean
  type: 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'none'
  isEnrolled: boolean
}

bridge.biometrics.onStatusChanged((status: BiometricsStatus) => {
  console.log('生物识别状态:', status.type, status.isAvailable)
})
```

## 事件消息格式

事件消息遵循统一的格式：

```typescript
interface EventMessage {
  type: string          // 事件类型，如 "Network.StatusChanged"
  data: unknown         // 事件数据
  timestamp: number     // 时间戳
}
```

## 最佳实践

### 1. 及时清理监听器

```typescript
import { onMounted, onUnmounted } from 'vue'

export default {
  setup() {
    let removeListener: (() => void) | null = null
    
    onMounted(() => {
      removeListener = bridge.network.onStatusChanged((status) => {
        // 处理状态变化
      })
    })
    
    onUnmounted(() => {
      removeListener?.()
    })
  }
}
```

### 2. 使用 React Hooks

```typescript
import { useEffect, useState } from 'react'

function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus | null>(null)
  
  useEffect(() => {
    // 获取初始状态
    bridge.network.getStatus().then(setStatus)
    
    // 监听变化
    const removeListener = bridge.network.onStatusChanged(setStatus)
    
    // 清理
    return removeListener
  }, [])
  
  return status
}

// 使用
function MyComponent() {
  const status = useNetworkStatus()
  
  return (
    <div>
      {status?.isConnected ? '在线' : '离线'}
    </div>
  )
}
```

### 3. 避免重复监听

```typescript
class NetworkMonitor {
  private listener: (() => void) | null = null
  private callbacks = new Set<(status: NetworkStatus) => void>()
  
  subscribe(callback: (status: NetworkStatus) => void) {
    this.callbacks.add(callback)
    
    if (!this.listener) {
      this.listener = bridge.network.onStatusChanged((status) => {
        this.callbacks.forEach(cb => cb(status))
      })
    }
    
    return () => {
      this.callbacks.delete(callback)
      if (this.callbacks.size === 0 && this.listener) {
        this.listener()
        this.listener = null
      }
    }
  }
}
```

### 4. 错误处理

```typescript
bridge.location.onError((error) => {
  console.error('位置错误:', error.code, error.message)
  
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      showPermissionDeniedMessage()
      break
    case 2: // POSITION_UNAVAILABLE
      showPositionUnavailableMessage()
      break
    case 3: // TIMEOUT
      showTimeoutMessage()
      break
  }
})
```

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

class AppEventManager {
  private bridge: WebViewBridge
  private cleanupFns: (() => void)[] = []
  
  constructor() {
    this.bridge = new WebViewBridge()
  }
  
  start() {
    // 监听网络状态
    this.cleanupFns.push(
      this.bridge.network.onStatusChanged(this.handleNetworkChange.bind(this))
    )
    
    // 监听位置更新
    this.cleanupFns.push(
      this.bridge.location.onLocationUpdated(this.handleLocationUpdate.bind(this))
    )
    
    // 监听 NFC
    this.cleanupFns.push(
      this.bridge.nfc.onTagDetected(this.handleNFCTag.bind(this))
    )
  }
  
  stop() {
    this.cleanupFns.forEach(fn => fn())
    this.cleanupFns = []
  }
  
  private handleNetworkChange(status: NetworkStatus) {
    console.log('网络变化:', status)
  }
  
  private handleLocationUpdate(coords: LocationCoords) {
    console.log('位置更新:', coords)
  }
  
  private handleNFCTag(tag: TagData) {
    console.log('NFC 标签:', tag)
  }
}

// 使用
const manager = new AppEventManager()
manager.start()

// 退出时
manager.stop()
```
