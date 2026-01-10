# Network 模块

网络状态模块，提供网络状态检查和监听功能。

## 访问方式

```typescript
import { Bridge } from '@aspect/webview-bridge'

Bridge.network.getStatus()
```

## 方法

### getStatus()

获取当前网络状态。

```typescript
const status = await Bridge.network.getStatus()
```

**返回值** `Promise<NetworkStatus>`

```typescript
interface NetworkStatus {
  /** 是否已连接 */
  isConnected: boolean
  /** 连接类型 */
  type: ConnectionType
  /** 是否为计费网络 */
  isExpensive: boolean
  /** 是否受限 */
  isConstrained: boolean
  /** 是否支持 IPv4 */
  supportsIPv4?: boolean
  /** 是否支持 IPv6 */
  supportsIPv6?: boolean
  /** 蜂窝网络类型 */
  cellularType?: CellularType
  /** 下行带宽 (Kbps) */
  downstreamBandwidthKbps?: number
  /** 上行带宽 (Kbps) */
  upstreamBandwidthKbps?: number
}

type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'vpn' | 'other' | 'none' | 'unknown'

type CellularType = '2g' | '3g' | '4g' | '5g' | 'unknown'
```

**示例**

```typescript
const status = await Bridge.network.getStatus()

if (status.isConnected) {
  console.log(`网络类型: ${status.type}`)
  
  if (status.type === 'cellular') {
    console.log(`蜂窝网络: ${status.cellularType}`)
  }
  
  if (status.isExpensive) {
    console.log('警告: 当前使用计费网络')
  }
} else {
  console.log('网络未连接')
}
```

### startMonitoring()

开始监听网络状态变化。

```typescript
const result = await Bridge.network.startMonitoring(callback?)
```

**参数**

| 参数 | 类型 | 描述 |
|------|------|------|
| callback | `(status) => void` | 可选的回调函数 |

**返回值** `Promise<MonitoringResult>`

```typescript
interface MonitoringResult {
  /** 是否正在监听 */
  monitoring: boolean
  /** 消息 */
  message?: string
}
```

**示例**

```typescript
await Bridge.network.startMonitoring((status) => {
  console.log(`网络状态变化: ${status.type}`)
  
  if (!status.isConnected) {
    showOfflineWarning()
  }
})
```

### stopMonitoring()

停止监听网络状态变化。

```typescript
await Bridge.network.stopMonitoring()
```

## 便捷方法

### isConnected()

检查是否已连接网络。

```typescript
const connected = await Bridge.network.isConnected()
```

**返回值** `Promise<boolean>`

### isWifi()

检查是否使用 WiFi。

```typescript
const isWifi = await Bridge.network.isWifi()
```

### isCellular()

检查是否使用蜂窝网络。

```typescript
const isCellular = await Bridge.network.isCellular()
```

### isExpensive()

检查是否为计费网络。

```typescript
const isExpensive = await Bridge.network.isExpensive()
```

## 事件监听

### onStatusChanged()

监听网络状态变化事件。

```typescript
const remove = Bridge.network.onStatusChanged((status) => {
  console.log('网络状态:', status.type)
})

// 停止监听
remove()
```

## 完整示例

```typescript
async function networkDemo() {
  // 1. 获取当前状态
  const status = await Bridge.network.getStatus()
  
  console.log('当前网络状态:')
  console.log(`  已连接: ${status.isConnected}`)
  console.log(`  类型: ${status.type}`)
  console.log(`  计费网络: ${status.isExpensive}`)

  // 2. 设置监听
  const removeListener = Bridge.network.onStatusChanged((newStatus) => {
    updateUI(newStatus)
    
    if (!newStatus.isConnected) {
      showToast('网络已断开')
    } else if (newStatus.type === 'wifi') {
      showToast('已连接 WiFi')
    }
  })

  // 3. 开始监听
  await Bridge.network.startMonitoring()

  // 4. 页面卸载时清理
  window.addEventListener('beforeunload', async () => {
    await Bridge.network.stopMonitoring()
    removeListener()
  })
}

function updateUI(status: NetworkStatus) {
  const indicator = document.getElementById('network-indicator')
  
  if (status.isConnected) {
    indicator.className = 'connected'
    indicator.textContent = getNetworkIcon(status.type)
  } else {
    indicator.className = 'disconnected'
    indicator.textContent = '📵'
  }
}

function getNetworkIcon(type: ConnectionType): string {
  switch (type) {
    case 'wifi': return '📶'
    case 'cellular': return '📱'
    case 'ethernet': return '🔌'
    default: return '🌐'
  }
}
```

## 使用场景

### 1. 大文件下载前检查

```typescript
async function downloadLargeFile(url: string) {
  const status = await Bridge.network.getStatus()
  
  if (!status.isConnected) {
    alert('请连接网络后重试')
    return
  }
  
  if (status.isExpensive) {
    const confirmed = confirm('当前使用移动数据，确定要下载吗？')
    if (!confirmed) return
  }
  
  // 开始下载...
}
```

### 2. 离线模式自动切换

```typescript
let isOfflineMode = false

Bridge.network.onStatusChanged((status) => {
  if (!status.isConnected && !isOfflineMode) {
    isOfflineMode = true
    enableOfflineMode()
  } else if (status.isConnected && isOfflineMode) {
    isOfflineMode = false
    syncPendingData()
    disableOfflineMode()
  }
})
```

### 3. 网络质量提示

```typescript
async function checkNetworkQuality() {
  const status = await Bridge.network.getStatus()
  
  if (status.type === 'cellular' && status.cellularType === '2g') {
    showToast('网络较慢，请耐心等待')
  }
  
  if (status.downstreamBandwidthKbps && status.downstreamBandwidthKbps < 1000) {
    showToast('当前网络速度较慢')
  }
}
```

## 权限配置

### Android AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### iOS

无需额外权限配置。
