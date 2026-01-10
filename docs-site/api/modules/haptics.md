# Haptics 模块

Haptics 模块提供了触觉反馈能力，可以让设备产生震动反馈。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const haptics = bridge.haptics
```

## 方法

### impact

触发冲击感反馈。

**签名**

```typescript
impact(style?: ImpactStyle): Promise<void>
```

**参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| style | ImpactStyle | 'medium' | 冲击强度 |

**冲击风格**

| 值 | 说明 |
|-----|------|
| light | 轻微冲击 |
| medium | 中等冲击 |
| heavy | 强烈冲击 |
| rigid | 刚性冲击 (iOS 13+) |
| soft | 柔和冲击 (iOS 13+) |

**示例**

```typescript
// 默认中等强度
await bridge.haptics.impact()

// 指定强度
await bridge.haptics.impact('heavy')
```

### notification

触发通知类型反馈。

**签名**

```typescript
notification(type?: NotificationType): Promise<void>
```

**参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | NotificationType | 'success' | 通知类型 |

**通知类型**

| 值 | 说明 |
|-----|------|
| success | 成功反馈 |
| warning | 警告反馈 |
| error | 错误反馈 |

**示例**

```typescript
// 成功反馈
await bridge.haptics.notification('success')

// 错误反馈
await bridge.haptics.notification('error')
```

### selection

触发选择反馈。

**签名**

```typescript
selection(): Promise<void>
```

**示例**

```typescript
// 用于列表选择、开关切换等
await bridge.haptics.selection()
```

### vibrate

触发震动。

**签名**

```typescript
vibrate(pattern?: number[]): Promise<void>
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| pattern | number[] | 震动模式（毫秒），交替表示震动和停止 |

**示例**

```typescript
// 简单震动
await bridge.haptics.vibrate()

// 模式震动：震动 100ms -> 停止 50ms -> 震动 200ms
await bridge.haptics.vibrate([100, 50, 200])
```

## 类型定义

```typescript
type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'

type NotificationType = 'success' | 'warning' | 'error'

interface HapticsModule {
  impact(style?: ImpactStyle): Promise<void>
  notification(type?: NotificationType): Promise<void>
  selection(): Promise<void>
  vibrate(pattern?: number[]): Promise<void>
}
```

## 平台差异

| 功能 | iOS | Android |
|------|-----|---------|
| impact | ✅ Taptic Engine | ✅ 震动 |
| notification | ✅ Taptic Engine | ✅ 震动 |
| selection | ✅ Taptic Engine | ✅ 短震动 |
| vibrate | ✅ 基本支持 | ✅ 完整模式支持 |

::: tip
iOS 使用 Taptic Engine 提供精细的触觉反馈，Android 使用 Vibrator API。不同设备的触觉效果可能有所不同。
:::

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 按钮点击反馈
async function onButtonClick() {
  await bridge.haptics.impact('light')
  // 执行操作...
}

// 表单提交成功
async function onFormSuccess() {
  await bridge.haptics.notification('success')
  showSuccessMessage()
}

// 表单验证失败
async function onFormError() {
  await bridge.haptics.notification('error')
  showErrorMessage()
}

// 开关切换
async function onToggle(value: boolean) {
  await bridge.haptics.selection()
  updateToggleState(value)
}

// 下拉刷新完成
async function onRefreshComplete() {
  await bridge.haptics.impact('medium')
}

// 删除操作警告
async function onDeleteWarning() {
  await bridge.haptics.notification('warning')
  showDeleteConfirm()
}
```

### Vue 组件示例

```vue
<template>
  <div class="haptics-demo">
    <h3>冲击反馈</h3>
    <button 
      v-for="style in impactStyles" 
      :key="style"
      @click="testImpact(style)"
    >
      {{ style }}
    </button>
    
    <h3>通知反馈</h3>
    <button 
      v-for="type in notificationTypes" 
      :key="type"
      @click="testNotification(type)"
    >
      {{ type }}
    </button>
    
    <h3>选择反馈</h3>
    <button @click="testSelection">Selection</button>
    
    <h3>震动</h3>
    <button @click="testVibrate">Vibrate</button>
    <button @click="testVibratePattern">Pattern</button>
  </div>
</template>

<script setup lang="ts">
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

const impactStyles = ['light', 'medium', 'heavy', 'rigid', 'soft'] as const
const notificationTypes = ['success', 'warning', 'error'] as const

async function testImpact(style: typeof impactStyles[number]) {
  await bridge.haptics.impact(style)
}

async function testNotification(type: typeof notificationTypes[number]) {
  await bridge.haptics.notification(type)
}

async function testSelection() {
  await bridge.haptics.selection()
}

async function testVibrate() {
  await bridge.haptics.vibrate()
}

async function testVibratePattern() {
  await bridge.haptics.vibrate([100, 50, 200, 50, 300])
}
</script>
```
