# App 模块

App 模块提供了与宿主应用交互的能力，包括获取应用信息、退出应用等功能。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const app = bridge.app
```

## 方法

### getInfo

获取应用信息。

**签名**

```typescript
getInfo(): Promise<AppInfo>
```

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| name | string | 应用名称 |
| version | string | 应用版本号 |
| build | string | 应用构建号 |
| bundleId | string | 应用包名/Bundle ID |

**示例**

```typescript
const info = await bridge.app.getInfo()
console.log(`${info.name} v${info.version} (${info.build})`)
```

### exit

退出应用（仅 Android 支持）。

**签名**

```typescript
exit(): Promise<void>
```

**示例**

```typescript
await bridge.app.exit()
```

::: warning 注意
iOS 不支持程序化退出应用，调用此方法在 iOS 上不会有效果。
:::

### openSettings

打开系统设置中的应用设置页面。

**签名**

```typescript
openSettings(): Promise<void>
```

**示例**

```typescript
// 用户需要手动授权权限时，引导到设置
await bridge.app.openSettings()
```

### getBundleResource

获取应用包内的资源文件。

**签名**

```typescript
getBundleResource(params: ResourceParams): Promise<ResourceResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| path | string | 是 | 资源文件路径 |
| encoding | 'base64' \| 'text' | 否 | 编码方式，默认 'text' |

**示例**

```typescript
// 获取文本资源
const config = await bridge.app.getBundleResource({
  path: 'config.json',
  encoding: 'text'
})

// 获取二进制资源
const image = await bridge.app.getBundleResource({
  path: 'images/logo.png',
  encoding: 'base64'
})
```

## 类型定义

```typescript
interface AppInfo {
  /** 应用名称 */
  name: string
  /** 版本号 */
  version: string
  /** 构建号 */
  build: string
  /** Bundle ID / 包名 */
  bundleId: string
}

interface ResourceParams {
  /** 资源文件路径 */
  path: string
  /** 编码方式 */
  encoding?: 'base64' | 'text'
}

interface ResourceResult {
  /** 文件内容 */
  content: string
  /** MIME 类型 */
  mimeType: string
}
```

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

async function showAppInfo() {
  const info = await bridge.app.getInfo()
  
  document.getElementById('app-info').innerHTML = `
    <p>应用名称: ${info.name}</p>
    <p>版本: ${info.version}</p>
    <p>构建号: ${info.build}</p>
    <p>Bundle ID: ${info.bundleId}</p>
  `
}

// 引导用户到设置页面
async function goToSettings() {
  const confirmed = confirm('需要授予权限，是否前往设置？')
  if (confirmed) {
    await bridge.app.openSettings()
  }
}
```
