# System 模块

System 模块提供了系统级功能，如打开 URL、打电话等。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const system = bridge.system
```

## 方法

### openURL

打开 URL（可以是网页、应用商店链接、其他应用等）。

**签名**

```typescript
openURL(url: string): Promise<OpenURLResult>
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| url | string | 要打开的 URL |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| success | boolean | 是否成功打开 |

**示例**

```typescript
// 打开网页
await bridge.system.openURL('https://example.com')

// 打开 App Store
await bridge.system.openURL('https://apps.apple.com/app/id123456789')

// 打开其他应用
await bridge.system.openURL('weixin://')
```

### canOpenURL

检查是否可以打开指定 URL。

**签名**

```typescript
canOpenURL(url: string): Promise<boolean>
```

**示例**

```typescript
const canOpen = await bridge.system.canOpenURL('weixin://')
if (canOpen) {
  await bridge.system.openURL('weixin://')
} else {
  console.log('微信未安装')
}
```

### call

拨打电话。

**签名**

```typescript
call(phoneNumber: string): Promise<void>
```

**示例**

```typescript
await bridge.system.call('10086')
```

### sendSMS

发送短信。

**签名**

```typescript
sendSMS(params: SMSParams): Promise<SMSResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| to | string \| string[] | 是 | 收件人号码 |
| body | string | 否 | 短信内容 |

**示例**

```typescript
// 发送给单个人
await bridge.system.sendSMS({
  to: '10086',
  body: '查询余额'
})

// 发送给多个人
await bridge.system.sendSMS({
  to: ['13800138000', '13800138001'],
  body: '你好！'
})
```

### sendEmail

发送邮件。

**签名**

```typescript
sendEmail(params: EmailParams): Promise<EmailResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| to | string \| string[] | 是 | 收件人 |
| cc | string \| string[] | 否 | 抄送 |
| bcc | string \| string[] | 否 | 密送 |
| subject | string | 否 | 主题 |
| body | string | 否 | 正文 |
| isHTML | boolean | 否 | 正文是否为 HTML |

**示例**

```typescript
await bridge.system.sendEmail({
  to: 'support@example.com',
  subject: '反馈',
  body: '您好，我遇到了一个问题...'
})
```

### share

系统分享。

**签名**

```typescript
share(params: ShareParams): Promise<ShareResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| text | string | 否 | 分享文本 |
| url | string | 否 | 分享链接 |
| title | string | 否 | 分享标题 |
| files | string[] | 否 | 分享文件路径 |

**示例**

```typescript
// 分享链接
await bridge.system.share({
  title: '精彩文章',
  text: '这篇文章很不错',
  url: 'https://example.com/article/123'
})

// 分享图片
await bridge.system.share({
  files: ['file:///path/to/image.jpg']
})
```

## 类型定义

```typescript
interface OpenURLResult {
  success: boolean
}

interface SMSParams {
  to: string | string[]
  body?: string
}

interface SMSResult {
  sent: boolean
  cancelled: boolean
}

interface EmailParams {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject?: string
  body?: string
  isHTML?: boolean
}

interface EmailResult {
  sent: boolean
  cancelled: boolean
}

interface ShareParams {
  text?: string
  url?: string
  title?: string
  files?: string[]
}

interface ShareResult {
  completed: boolean
  activityType?: string
}

interface SystemModule {
  openURL(url: string): Promise<OpenURLResult>
  canOpenURL(url: string): Promise<boolean>
  call(phoneNumber: string): Promise<void>
  sendSMS(params: SMSParams): Promise<SMSResult>
  sendEmail(params: EmailParams): Promise<EmailResult>
  share(params: ShareParams): Promise<ShareResult>
}
```

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 联系客服
async function contactSupport(method: 'phone' | 'email') {
  if (method === 'phone') {
    await bridge.system.call('400-123-4567')
  } else {
    await bridge.system.sendEmail({
      to: 'support@example.com',
      subject: '客服咨询',
      body: `
设备信息：${navigator.userAgent}
时间：${new Date().toISOString()}

问题描述：
`
    })
  }
}

// 分享功能
async function shareArticle(article: { title: string; url: string }) {
  await bridge.system.share({
    title: article.title,
    url: article.url,
    text: `推荐一篇好文章：${article.title}`
  })
}

// 检测并打开应用
async function openApp(scheme: string, fallbackURL: string) {
  const canOpen = await bridge.system.canOpenURL(scheme)
  
  if (canOpen) {
    await bridge.system.openURL(scheme)
  } else {
    // 打开下载页面
    await bridge.system.openURL(fallbackURL)
  }
}

// 打开微信
openApp('weixin://', 'https://weixin.qq.com/')
```
