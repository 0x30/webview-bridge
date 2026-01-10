# Permission 模块

Permission 模块提供了统一的权限管理能力，用于检查和请求各种系统权限。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const permission = bridge.permission
```

## 方法

### check

检查权限状态。

**签名**

```typescript
check(params: PermissionParams): Promise<PermissionResult>
```

**参数**

| 属性 | 类型 | 说明 |
|------|------|------|
| type | PermissionType | 权限类型 |

**权限类型**

| 值 | 说明 |
|-----|------|
| camera | 相机 |
| photos | 相册 |
| location | 位置 |
| locationAlways | 始终使用位置 |
| microphone | 麦克风 |
| contacts | 通讯录 |
| notifications | 通知 |
| calendar | 日历 |
| reminders | 提醒事项 |
| bluetooth | 蓝牙 |
| speechRecognition | 语音识别 |
| motion | 运动与健身 |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| status | PermissionStatus | 权限状态 |
| canAskAgain | boolean | 是否可以再次请求 |

**权限状态**

| 值 | 说明 |
|-----|------|
| granted | 已授权 |
| denied | 已拒绝 |
| notDetermined | 未决定（未请求过） |
| restricted | 受限（家长控制等） |
| limited | 受限授权（如 iOS 14+ 相册） |

**示例**

```typescript
const result = await bridge.permission.check({ type: 'camera' })
console.log('相机权限状态:', result.status)
```

### request

请求权限。

**签名**

```typescript
request(params: PermissionParams): Promise<PermissionResult>
```

**示例**

```typescript
const result = await bridge.permission.request({ type: 'camera' })
if (result.status === 'granted') {
  // 开始使用相机
}
```

### checkMultiple

检查多个权限状态。

**签名**

```typescript
checkMultiple(types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>>
```

**示例**

```typescript
const results = await bridge.permission.checkMultiple(['camera', 'microphone'])
console.log('相机:', results.camera.status)
console.log('麦克风:', results.microphone.status)
```

### requestMultiple

请求多个权限。

**签名**

```typescript
requestMultiple(types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>>
```

**示例**

```typescript
const results = await bridge.permission.requestMultiple(['camera', 'microphone'])
// 拍摄视频需要两个权限都授权
const canRecordVideo = 
  results.camera.status === 'granted' && 
  results.microphone.status === 'granted'
```

### openSettings

打开应用设置页面（权限设置）。

**签名**

```typescript
openSettings(): Promise<void>
```

**示例**

```typescript
// 当权限被永久拒绝时，引导用户到设置
const result = await bridge.permission.check({ type: 'camera' })
if (result.status === 'denied' && !result.canAskAgain) {
  const confirmed = confirm('相机权限已被拒绝，是否前往设置开启？')
  if (confirmed) {
    await bridge.permission.openSettings()
  }
}
```

## 类型定义

```typescript
type PermissionType =
  | 'camera'
  | 'photos'
  | 'location'
  | 'locationAlways'
  | 'microphone'
  | 'contacts'
  | 'notifications'
  | 'calendar'
  | 'reminders'
  | 'bluetooth'
  | 'speechRecognition'
  | 'motion'

type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'notDetermined'
  | 'restricted'
  | 'limited'

interface PermissionParams {
  type: PermissionType
}

interface PermissionResult {
  status: PermissionStatus
  canAskAgain: boolean
}

interface PermissionModule {
  check(params: PermissionParams): Promise<PermissionResult>
  request(params: PermissionParams): Promise<PermissionResult>
  checkMultiple(types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>>
  requestMultiple(types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>>
  openSettings(): Promise<void>
}
```

## 最佳实践

### 1. 先检查后请求

```typescript
async function useCamera() {
  // 先检查
  const check = await bridge.permission.check({ type: 'camera' })
  
  if (check.status === 'granted') {
    // 已有权限，直接使用
    startCamera()
    return
  }
  
  if (check.status === 'notDetermined') {
    // 未请求过，请求权限
    const request = await bridge.permission.request({ type: 'camera' })
    if (request.status === 'granted') {
      startCamera()
    }
    return
  }
  
  // 已被拒绝
  if (check.canAskAgain) {
    // 可以再次请求
    const request = await bridge.permission.request({ type: 'camera' })
    if (request.status === 'granted') {
      startCamera()
    }
  } else {
    // 引导到设置
    showSettingsDialog()
  }
}
```

### 2. 批量检查权限

```typescript
async function checkAllPermissions() {
  const required: PermissionType[] = ['camera', 'microphone', 'location']
  const results = await bridge.permission.checkMultiple(required)
  
  const missing = required.filter(type => results[type].status !== 'granted')
  
  if (missing.length > 0) {
    console.log('缺少权限:', missing.join(', '))
  }
  
  return missing.length === 0
}
```

## 完整示例

```typescript
import { WebViewBridge, PermissionType, PermissionStatus } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 权限请求工具函数
async function ensurePermission(type: PermissionType): Promise<boolean> {
  const check = await bridge.permission.check({ type })
  
  if (check.status === 'granted') {
    return true
  }
  
  if (check.status === 'notDetermined' || check.canAskAgain) {
    const request = await bridge.permission.request({ type })
    return request.status === 'granted'
  }
  
  // 无法请求，需要去设置
  const goToSettings = confirm(
    `需要${getPermissionName(type)}权限，是否前往设置开启？`
  )
  
  if (goToSettings) {
    await bridge.permission.openSettings()
  }
  
  return false
}

function getPermissionName(type: PermissionType): string {
  const names: Record<PermissionType, string> = {
    camera: '相机',
    photos: '相册',
    location: '位置',
    locationAlways: '位置',
    microphone: '麦克风',
    contacts: '通讯录',
    notifications: '通知',
    calendar: '日历',
    reminders: '提醒',
    bluetooth: '蓝牙',
    speechRecognition: '语音识别',
    motion: '运动健身'
  }
  return names[type]
}

// 使用示例
async function startVideoRecording() {
  const hasCamera = await ensurePermission('camera')
  const hasMicrophone = await ensurePermission('microphone')
  
  if (hasCamera && hasMicrophone) {
    // 开始录制
    console.log('开始录制视频...')
  } else {
    console.log('缺少必要权限')
  }
}
```
