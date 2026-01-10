# Device 模块

设备与系统信息模块，提供获取设备信息、电池状态、屏幕信息等功能。

## 访问方式

```typescript
import { Bridge } from '@aspect/webview-bridge'

Bridge.device.getInfo()
```

## 方法

### getInfo()

获取设备信息。

```typescript
const info = await Bridge.device.getInfo()
```

**返回值** `Promise<DeviceInfo>`

```typescript
interface DeviceInfo {
  /** 设备唯一标识 */
  uuid: string
  /** 设备型号 */
  model: string
  /** 制造商 */
  manufacturer: string
  /** 操作系统 */
  osName: 'iOS' | 'Android'
  /** 系统版本 */
  osVersion: string
  /** 是否为平板 */
  isTablet: boolean
  /** 设备语言 */
  language: string
  /** 时区 */
  timezone: string
}
```

**示例**

```typescript
const device = await Bridge.device.getInfo()
console.log(`设备: ${device.manufacturer} ${device.model}`)
console.log(`系统: ${device.osName} ${device.osVersion}`)
```

### getBatteryInfo()

获取电池信息。

```typescript
const battery = await Bridge.device.getBatteryInfo()
```

**返回值** `Promise<BatteryInfo>`

```typescript
interface BatteryInfo {
  /** 电量 (0-100) */
  level: number
  /** 是否正在充电 */
  isCharging: boolean
  /** 充电状态 */
  state: 'charging' | 'discharging' | 'full' | 'unplugged' | 'unknown'
}
```

**示例**

```typescript
const battery = await Bridge.device.getBatteryInfo()
console.log(`电量: ${battery.level}%`)

if (battery.isCharging) {
  console.log('正在充电...')
}
```

### getScreenInfo()

获取屏幕信息。

```typescript
const screen = await Bridge.device.getScreenInfo()
```

**返回值** `Promise<ScreenInfo>`

```typescript
interface ScreenInfo {
  /** 屏幕宽度 (像素) */
  width: number
  /** 屏幕高度 (像素) */
  height: number
  /** 设备像素比 */
  scale: number
  /** 安全区域 */
  safeArea: SafeAreaInsets
}

interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}
```

**示例**

```typescript
const screen = await Bridge.device.getScreenInfo()
console.log(`屏幕尺寸: ${screen.width} x ${screen.height}`)
console.log(`安全区域底部: ${screen.safeArea.bottom}px`)
```

### getNetworkInfo()

获取网络信息。

```typescript
const network = await Bridge.device.getNetworkInfo()
```

**返回值** `Promise<NetworkInfo>`

```typescript
interface NetworkInfo {
  /** 是否联网 */
  isConnected: boolean
  /** 连接类型 */
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown'
  /** 蜂窝网络类型 */
  cellularType?: '2g' | '3g' | '4g' | '5g' | 'unknown'
}
```

### getStorageInfo()

获取存储空间信息。

```typescript
const storage = await Bridge.device.getStorageInfo()
```

**返回值** `Promise<StorageInfo>`

```typescript
interface StorageInfo {
  /** 总空间 (字节) */
  total: number
  /** 可用空间 (字节) */
  available: number
  /** 已用空间 (字节) */
  used: number
}
```

### getMemoryInfo()

获取内存信息。

```typescript
const memory = await Bridge.device.getMemoryInfo()
```

**返回值** `Promise<MemoryInfo>`

```typescript
interface MemoryInfo {
  /** 总内存 (字节) */
  total: number
  /** 可用内存 (字节) */
  available: number
  /** 已用内存 (字节) */
  used: number
}
```

### getCapabilities()

获取设备能力信息。

```typescript
const caps = await Bridge.device.getCapabilities()
```

**返回值** `Promise<DeviceCapabilities>`

```typescript
interface DeviceCapabilities {
  /** 是否有相机 */
  hasCamera: boolean
  /** 是否有前置相机 */
  hasFrontCamera: boolean
  /** 是否支持触觉反馈 */
  hasHaptics: boolean
  /** 是否支持生物识别 */
  hasBiometrics: boolean
  /** 是否支持 NFC */
  hasNFC: boolean
  /** 是否支持 GPS */
  hasGPS: boolean
}
```

## 平台差异

| 方法 | iOS | Android | 备注 |
|------|-----|---------|------|
| `getInfo()` | ✅ | ✅ | |
| `getBatteryInfo()` | ✅ | ✅ | |
| `getScreenInfo()` | ✅ | ✅ | |
| `getNetworkInfo()` | ✅ | ✅ | |
| `getStorageInfo()` | ✅ | ✅ | |
| `getMemoryInfo()` | ✅ | ✅ | |
| `getCapabilities()` | ✅ | ✅ | |

## 使用建议

1. **缓存设备信息**：设备信息通常不会变化，建议缓存结果
2. **电池监控**：使用事件监听而非轮询
3. **权限检查**：获取某些信息可能需要权限，建议先检查
