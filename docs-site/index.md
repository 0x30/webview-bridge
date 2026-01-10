---
layout: home

hero:
  name: WebView Bridge
  text: 跨平台原生能力桥接 SDK
  tagline: 在 WebView 中轻松调用 iOS/Android 原生能力
  image:
    src: /logo.svg
    alt: WebView Bridge
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 文档
      link: /api/

features:
  - icon: 📱
    title: 跨平台支持
    details: 支持 iOS (Swift) 和 Android (Kotlin)，统一的 JavaScript API
  - icon: 🔌
    title: 模块化设计
    details: 按需加载，支持自定义扩展模块，灵活可扩展
  - icon: 🛡️
    title: 类型安全
    details: 完整的 TypeScript 类型定义，开发体验一流
  - icon: 📦
    title: 丰富的功能
    details: 设备信息、相机、位置、生物识别、NFC 等开箱即用
  - icon: ⚡
    title: 高性能
    details: 基于原生消息通道，低延迟高效通信
  - icon: 🔧
    title: 易于集成
    details: 简单的配置，快速集成到现有项目
---

## 快速示例

```typescript
import { Bridge } from '@aspect/webview-bridge'

// 等待 Bridge 就绪
await Bridge.whenReady()

// 获取设备信息
const deviceInfo = await Bridge.device.getInfo()
console.log(`设备: ${deviceInfo.model}, 系统: ${deviceInfo.osVersion}`)

// 触觉反馈
await Bridge.haptics.impact('medium')

// 生物识别认证
const auth = await Bridge.biometrics.authenticate({
  reason: '请验证您的身份'
})
if (auth.success) {
  console.log('认证成功！')
}
```

## 支持的模块

| 模块 | 描述 | iOS | Android |
|------|------|-----|---------|
| Device | 设备与系统信息 | ✅ | ✅ |
| App | 应用生命周期 | ✅ | ✅ |
| Storage | 安全本地存储 | ✅ | ✅ |
| Clipboard | 剪贴板访问 | ✅ | ✅ |
| Haptics | 触觉反馈 | ✅ | ✅ |
| StatusBar | 状态栏控制 | ✅ | ✅ |
| System | 系统功能 | ✅ | ✅ |
| Permission | 权限管理 | ✅ | ✅ |
| Contacts | 联系人访问 | ✅ | ✅ |
| Media | 相机与相册 | ✅ | ✅ |
| Location | 位置服务 | ✅ | ✅ |
| Biometrics | 生物识别 | ✅ | ✅ |
| NFC | 近场通信 | ✅ | ✅ |
| Network | 网络状态 | ✅ | ✅ |
