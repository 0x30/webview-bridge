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

### getInstalledApps

获取设备上已安装的应用列表（仅 Android）。

**签名**

```typescript
getInstalledApps(options?: GetInstalledAppsOptions): Promise<InstalledAppsResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| includeSystemApps | boolean | 否 | 是否包含系统应用，默认 false |
| includeIcons | boolean | 否 | 是否包含应用图标（Base64），默认 false |
| limit | number | 否 | 限制返回数量 |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| apps | InstalledApp[] | 应用列表 |
| count | number | 应用总数 |

**示例**

```typescript
const result = await bridge.app.getInstalledApps({
  includeSystemApps: false,
  includeIcons: true,
  limit: 20
})

result.apps.forEach(app => {
  console.log(`${app.name} - ${app.packageName}`)
})
```

::: warning 注意
iOS 由于沙盒限制，无法获取已安装应用列表。此方法仅在 Android 平台可用。
:::

### getAppDetails

获取指定应用的详细信息。

**签名**

```typescript
getAppDetails(packageName: string): Promise<AppDetails>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| packageName | string | 是 | 应用包名 |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| name | string | 应用名称 |
| packageName | string | 包名 |
| version | string | 版本号 |
| versionCode | number | 版本代码 |
| firstInstallTime | number | 首次安装时间戳 |
| lastUpdateTime | number | 最后更新时间戳 |
| isSystemApp | boolean | 是否为系统应用 |
| targetSdkVersion | number | 目标 SDK 版本 |
| minSdkVersion | number | 最低 SDK 版本 |
| permissions | string[] | 请求的权限列表 |
| icon | string | 应用图标（Base64） |

**示例**

```typescript
const details = await bridge.app.getAppDetails('com.example.app')
console.log(`安装时间: ${new Date(details.firstInstallTime)}`)
console.log(`权限: ${details.permissions.join(', ')}`)
```

### canOpenURL

检查设备是否可以打开指定的 URL。

**签名**

```typescript
canOpenURL(url: string): Promise<CanOpenURLResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| url | string | 是 | 要检查的 URL |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| canOpen | boolean | 是否可以打开 |

**示例**

```typescript
// 检查是否可以打电话
const tel = await bridge.app.canOpenURL('tel:10086')
if (tel.canOpen) {
  // 可以拨打电话
}

// 检查是否安装了某个应用
const wechat = await bridge.app.canOpenURL('weixin://')
if (wechat.canOpen) {
  console.log('微信已安装')
}
```

## 扩展类型定义

```typescript
interface GetInstalledAppsOptions {
  /** 是否包含系统应用 */
  includeSystemApps?: boolean
  /** 是否包含应用图标 */
  includeIcons?: boolean
  /** 限制返回数量 */
  limit?: number
}

interface InstalledApp {
  /** 应用名称 */
  name: string
  /** 包名 */
  packageName: string
  /** 版本号 */
  version: string
  /** 是否为系统应用 */
  isSystemApp: boolean
  /** 应用图标 Base64 */
  icon?: string
}

interface InstalledAppsResult {
  /** 应用列表 */
  apps: InstalledApp[]
  /** 总数 */
  count: number
}

interface AppDetails {
  /** 应用名称 */
  name: string
  /** 包名 */
  packageName: string
  /** 版本号 */
  version: string
  /** 版本代码 */
  versionCode: number
  /** 首次安装时间 */
  firstInstallTime: number
  /** 最后更新时间 */
  lastUpdateTime: number
  /** 是否为系统应用 */
  isSystemApp: boolean
  /** 目标 SDK 版本 */
  targetSdkVersion: number
  /** 最低 SDK 版本 */
  minSdkVersion: number
  /** 权限列表 */
  permissions: string[]
  /** 应用图标 Base64 */
  icon?: string
}

interface CanOpenURLResult {
  /** 是否可以打开 */
  canOpen: boolean
}
```
