# NFC 模块

近场通信模块，提供 NFC 标签读写功能。

## 访问方式

```typescript
import { Bridge } from '@aspect/webview-bridge'

Bridge.nfc.startScan()
```

## 方法

### isAvailable()

检查 NFC 是否可用。

```typescript
const result = await Bridge.nfc.isAvailable()
```

**返回值**

```typescript
interface NFCAvailability {
  /** 是否可用 */
  isAvailable: boolean
  /** 是否支持 NDEF */
  ndefSupported: boolean
  /** 是否支持 Tag */
  tagSupported: boolean
}
```

### isEnabled()

检查 NFC 是否已启用。

```typescript
const result = await Bridge.nfc.isEnabled()
```

**返回值**

```typescript
interface NFCEnabled {
  isEnabled: boolean
}
```

### startScan()

开始扫描 NFC 标签。

```typescript
const result = await Bridge.nfc.startScan(params?)
```

**参数**

```typescript
interface ScanParams {
  /** 提示消息 (iOS) */
  alertMessage?: string
  /** 是否保持会话 */
  keepSessionAlive?: boolean
}
```

**返回值** `Promise<ScanResult>`

```typescript
interface ScanResult {
  /** 是否正在扫描 */
  scanning?: boolean
  /** 消息 */
  message?: string
  /** NDEF 记录列表 */
  records?: NDEFRecord[]
  /** 标签容量 */
  capacity?: number
  /** 是否可写 */
  isWritable?: boolean
  /** 是否已取消 */
  cancelled?: boolean
}
```

**示例**

```typescript
await Bridge.nfc.startScan({
  alertMessage: '请将设备靠近 NFC 标签'
})
```

### stopScan()

停止扫描。

```typescript
await Bridge.nfc.stopScan()
```

### writeTag()

写入 NFC 标签。

```typescript
const result = await Bridge.nfc.writeTag(params)
```

**参数**

```typescript
interface WriteParams {
  /** 文本内容 */
  text?: string
  /** URI */
  uri?: string
  /** 自定义记录 */
  records?: WriteRecordParams[]
  /** 提示消息 (iOS) */
  alertMessage?: string
}

interface WriteRecordParams {
  tnf?: TNFType
  type: string
  id?: string
  payload: string
}

type TNFType = 'empty' | 'wellKnown' | 'media' | 'absoluteUri' | 'external' | 'unknown' | 'unchanged'
```

### writeText()

写入文本到 NFC 标签（便捷方法）。

```typescript
await Bridge.nfc.writeText(text, alertMessage?)
```

### writeUri()

写入 URI 到 NFC 标签（便捷方法）。

```typescript
await Bridge.nfc.writeUri(uri, alertMessage?)
```

### openSettings()

打开 NFC 设置页。

```typescript
await Bridge.nfc.openSettings()
```

## 事件监听

### onTagDetected()

监听标签检测事件。

```typescript
const remove = Bridge.nfc.onTagDetected((data) => {
  console.log('检测到标签:', data.records)
})

// 停止监听
remove()
```

**事件数据**

```typescript
interface TagDetectedEvent {
  /** NDEF 记录列表 */
  records: NDEFRecord[]
  /** 标签容量 */
  capacity?: number
  /** 是否可写 */
  isWritable?: boolean
}

interface NDEFRecord {
  /** TNF 类型 */
  tnf: TNFType
  /** 记录类型 */
  type: string
  /** 记录 ID */
  id?: string
  /** 原始载荷 */
  payload: string
  /** 文本内容 */
  text?: string
  /** 语言代码 */
  locale?: string
  /** URI */
  uri?: string
}
```

### onWriteSuccess()

监听写入成功事件。

```typescript
const remove = Bridge.nfc.onWriteSuccess((data) => {
  console.log('写入成功!')
})
```

### onWriteError()

监听写入错误事件。

```typescript
const remove = Bridge.nfc.onWriteError((data) => {
  console.log('写入失败:', data.error)
})
```

### onError()

监听 NFC 错误事件。

```typescript
const remove = Bridge.nfc.onError((data) => {
  console.log('NFC 错误:', data.error)
})
```

## 完整示例

```typescript
async function nfcDemo() {
  // 1. 检查可用性
  const availability = await Bridge.nfc.isAvailable()
  
  if (!availability.isAvailable) {
    alert('您的设备不支持 NFC')
    return
  }

  // 2. 检查是否启用
  const enabled = await Bridge.nfc.isEnabled()
  
  if (!enabled.isEnabled) {
    await Bridge.nfc.openSettings()
    return
  }

  // 3. 设置事件监听
  const removeTagListener = Bridge.nfc.onTagDetected((data) => {
    console.log(`检测到 ${data.records.length} 条记录:`)
    
    data.records.forEach((record, index) => {
      console.log(`记录 ${index + 1}:`)
      if (record.text) {
        console.log(`  文本: ${record.text}`)
      }
      if (record.uri) {
        console.log(`  URI: ${record.uri}`)
      }
    })
  })

  // 4. 开始扫描
  try {
    await Bridge.nfc.startScan({
      alertMessage: '请将设备靠近 NFC 标签'
    })
    console.log('扫描已开始')
  } catch (error) {
    console.error('启动扫描失败:', error)
  }

  // 5. 稍后停止
  setTimeout(async () => {
    await Bridge.nfc.stopScan()
    removeTagListener()
    console.log('扫描已停止')
  }, 30000)
}

async function writeNfcTag() {
  // 写入文本
  const removeSuccess = Bridge.nfc.onWriteSuccess(() => {
    alert('写入成功!')
    removeSuccess()
    removeError()
  })

  const removeError = Bridge.nfc.onWriteError((data) => {
    alert(`写入失败: ${data.error}`)
    removeSuccess()
    removeError()
  })

  await Bridge.nfc.writeText('Hello NFC!', '请将设备靠近 NFC 标签')
}
```

## 平台差异

| 功能 | iOS | Android | 备注 |
|------|-----|---------|------|
| NDEF 读取 | ✅ | ✅ | |
| NDEF 写入 | ✅ | ✅ | |
| 后台扫描 | ✅ | ✅ | iOS 需要配置 |
| 开启设置 | ✅ | ✅ | |

### iOS 特殊说明

- 仅 iPhone 7 及以上支持 NFC
- 需要在 Capabilities 中启用 NFC Tag Reading
- 扫描时会显示系统 NFC 界面

### Android 特殊说明

- 需要设备支持 NFC 硬件
- 用户需要在设置中启用 NFC
- 可以进行后台扫描

## 权限配置

### iOS

1. 在 Xcode 中启用 NFC Tag Reading capability
2. 在 Info.plist 中添加：

```xml
<key>NFCReaderUsageDescription</key>
<string>需要使用 NFC 读取标签</string>

<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
<array>
    <string>A0000002471001</string>
</array>
```

### Android AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />

<intent-filter>
    <action android:name="android.nfc.action.NDEF_DISCOVERED" />
    <category android:name="android.intent.category.DEFAULT" />
</intent-filter>
```
