# Location 模块

位置服务模块，提供获取位置、位置监听、地理编码等功能。

:::tip 权限管理
位置权限的查看和请求已统一到 [Permission 模块](/api/modules/permission)。请使用 `Permission.getStatus('locationWhenInUse')` 和 `Permission.request('locationWhenInUse')` 来管理权限。
:::

## 访问方式

```typescript
import { Bridge } from '@aspect/webview-bridge'

Bridge.location.getCurrentPosition()
```

## 方法

### getCurrentPosition()

获取当前位置。

```typescript
const position = await Bridge.location.getCurrentPosition(params?)
```

**参数**

```typescript
interface GetPositionParams {
  /** 精度 */
  accuracy?: 'high' | 'medium' | 'low'
  /** 超时时间 (毫秒) */
  timeout?: number
  /** 缓存有效期 (毫秒) */
  maximumAge?: number
}
```

**返回值** `Promise<LocationResult>`

```typescript
interface LocationResult {
  /** 纬度 */
  latitude: number
  /** 经度 */
  longitude: number
  /** 海拔 */
  altitude: number
  /** 精度 (米) */
  accuracy: number
  /** 海拔精度 */
  altitudeAccuracy?: number
  /** 方向 (度) */
  heading?: number
  /** 速度 (米/秒) */
  speed?: number
  /** 时间戳 */
  timestamp: number
}
```

**示例**

```typescript
const position = await Bridge.location.getCurrentPosition({
  accuracy: 'high',
  timeout: 10000
})

console.log(`位置: ${position.latitude}, ${position.longitude}`)
console.log(`精度: ${position.accuracy}米`)
```

### watchPosition()

监听位置变化。

```typescript
const watchId = await Bridge.location.watchPosition(callback, params?)
```

**参数**

| 参数 | 类型 | 描述 |
|------|------|------|
| callback | `(position) => void` | 位置变化回调 |
| params | `WatchPositionParams` | 监听参数 |

```typescript
interface WatchPositionParams extends GetPositionParams {
  /** 最小移动距离 (米) */
  distanceFilter?: number
  /** 更新间隔 (毫秒) */
  interval?: number
}
```

**返回值** `Promise<string>` - 监听 ID

**示例**

```typescript
const watchId = await Bridge.location.watchPosition(
  (position) => {
    console.log(`新位置: ${position.latitude}, ${position.longitude}`)
  },
  {
    accuracy: 'high',
    distanceFilter: 10  // 移动 10 米才触发更新
  }
)

// 保存 watchId 以便稍后停止
```

### clearWatch()

停止位置监听。

```typescript
await Bridge.location.clearWatch(watchId)
```

### clearAllWatches()

停止所有位置监听。

```typescript
await Bridge.location.clearAllWatches()
```

### geocode()

地理编码 - 地址转坐标。

```typescript
const result = await Bridge.location.geocode(address)
```

**参数**

| 参数 | 类型 | 描述 |
|------|------|------|
| address | string | 地址字符串 |

**返回值** `Promise<GeocodeResult>`

```typescript
interface GeocodeResult {
  latitude: number
  longitude: number
  address: Address
}
```

**示例**

```typescript
const result = await Bridge.location.geocode('北京市天安门')
console.log(`坐标: ${result.latitude}, ${result.longitude}`)
```

### reverseGeocode()

逆地理编码 - 坐标转地址。

```typescript
const address = await Bridge.location.reverseGeocode(latitude, longitude)
```

**返回值** `Promise<Address>`

```typescript
interface Address {
  /** 地点名称 */
  name?: string
  /** 街道 */
  thoroughfare?: string
  /** 门牌号 */
  subThoroughfare?: string
  /** 城市 */
  locality?: string
  /** 区/县 */
  subLocality?: string
  /** 省/州 */
  administrativeArea?: string
  /** 邮编 */
  postalCode?: string
  /** 国家 */
  country?: string
  /** 国家代码 */
  countryCode?: string
  /** 格式化地址 */
  formattedAddress?: string
}
```

**示例**

```typescript
const address = await Bridge.location.reverseGeocode(39.9042, 116.4074)
console.log(`地址: ${address.formattedAddress}`)
// 输出: 北京市东城区...
```

### calculateDistance()

计算两点之间的距离 (纯 JS 计算，不需要 Native)。

```typescript
const distance = Bridge.location.calculateDistance(lat1, lon1, lat2, lon2)
```

**返回值** `number` - 距离 (米)

### openSettings()

打开位置服务设置页。

```typescript
await Bridge.location.openSettings()
```

## 事件监听

### onPermissionChanged()

监听权限变化。

```typescript
const remove = Bridge.location.onPermissionChanged((data) => {
  console.log('权限变化:', data.granted)
})

// 停止监听
remove()
```

## 完整示例

```typescript
async function locationDemo() {
  // 1. 检查并请求位置权限（使用 Permission 模块）
  const status = await Bridge.permission.getStatus('locationWhenInUse')
  
  if (status.status !== 'granted') {
    const result = await Bridge.permission.request('locationWhenInUse')
    if (result.status !== 'granted') {
      alert('需要位置权限')
      return
    }
  }

  // 2. 获取当前位置
  try {
    const position = await Bridge.location.getCurrentPosition({
      accuracy: 'high'
    })
    
    console.log(`当前位置: ${position.latitude}, ${position.longitude}`)

    // 3. 逆地理编码
    const address = await Bridge.location.reverseGeocode(
      position.latitude,
      position.longitude
    )
    
    console.log(`地址: ${address.formattedAddress}`)

    // 4. 开始监听位置变化
    const watchId = await Bridge.location.watchPosition(
      (pos) => {
        console.log(`移动到: ${pos.latitude}, ${pos.longitude}`)
      },
      { distanceFilter: 50 }
    )

    // 5. 稍后停止监听
    setTimeout(async () => {
      await Bridge.location.clearWatch(watchId)
      console.log('停止监听')
    }, 60000)
    
  } catch (error) {
    console.error('获取位置失败:', error)
  }
}
```

## 权限配置

### iOS Info.plist

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>需要获取您的位置信息以提供附近服务</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>需要在后台获取位置以持续追踪</string>
```

### Android AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```
