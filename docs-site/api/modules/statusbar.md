# StatusBar 模块

StatusBar 模块提供了状态栏样式控制能力。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const statusBar = bridge.statusBar
```

## 方法

### setStyle

设置状态栏样式。

**签名**

```typescript
setStyle(style: StatusBarStyle): Promise<void>
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| style | StatusBarStyle | 状态栏样式 |

**样式选项**

| 值 | 说明 |
|-----|------|
| default | 默认样式（跟随系统） |
| light | 浅色内容（深色背景时使用） |
| dark | 深色内容（浅色背景时使用） |

**示例**

```typescript
// 设置为浅色内容（适合深色背景）
await bridge.statusBar.setStyle('light')

// 设置为深色内容（适合浅色背景）
await bridge.statusBar.setStyle('dark')
```

### setBackgroundColor

设置状态栏背景色。

**签名**

```typescript
setBackgroundColor(color: string): Promise<void>
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| color | string | 背景色（十六进制或颜色名） |

**示例**

```typescript
// 使用十六进制颜色
await bridge.statusBar.setBackgroundColor('#007AFF')

// 透明背景
await bridge.statusBar.setBackgroundColor('transparent')
```

### show

显示状态栏。

**签名**

```typescript
show(animation?: boolean): Promise<void>
```

**参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| animation | boolean | true | 是否使用动画 |

**示例**

```typescript
// 带动画显示
await bridge.statusBar.show()

// 无动画显示
await bridge.statusBar.show(false)
```

### hide

隐藏状态栏。

**签名**

```typescript
hide(animation?: boolean): Promise<void>
```

**示例**

```typescript
// 带动画隐藏
await bridge.statusBar.hide()

// 无动画隐藏
await bridge.statusBar.hide(false)
```

### getInfo

获取状态栏信息。

**签名**

```typescript
getInfo(): Promise<StatusBarInfo>
```

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| visible | boolean | 是否可见 |
| style | StatusBarStyle | 当前样式 |
| height | number | 状态栏高度（像素） |

**示例**

```typescript
const info = await bridge.statusBar.getInfo()
console.log(`状态栏高度: ${info.height}px`)
```

## 类型定义

```typescript
type StatusBarStyle = 'default' | 'light' | 'dark'

interface StatusBarInfo {
  /** 是否可见 */
  visible: boolean
  /** 当前样式 */
  style: StatusBarStyle
  /** 状态栏高度（像素） */
  height: number
}

interface StatusBarModule {
  setStyle(style: StatusBarStyle): Promise<void>
  setBackgroundColor(color: string): Promise<void>
  show(animation?: boolean): Promise<void>
  hide(animation?: boolean): Promise<void>
  getInfo(): Promise<StatusBarInfo>
}
```

## 平台差异

| 功能 | iOS | Android |
|------|-----|---------|
| setStyle | ✅ | ✅ |
| setBackgroundColor | ⚠️ 无效果 | ✅ |
| show/hide | ✅ | ✅ |
| getInfo | ✅ | ✅ |

::: warning iOS 背景色
iOS 的状态栏背景是透明的，背景色由下方的内容决定。`setBackgroundColor` 在 iOS 上不会有视觉效果。
:::

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 根据页面主题设置状态栏
async function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    // 深色主题：状态栏使用浅色内容
    await bridge.statusBar.setStyle('light')
    await bridge.statusBar.setBackgroundColor('#1a1a1a')
  } else {
    // 浅色主题：状态栏使用深色内容
    await bridge.statusBar.setStyle('dark')
    await bridge.statusBar.setBackgroundColor('#ffffff')
  }
}

// 全屏模式
async function enterFullscreen() {
  await bridge.statusBar.hide()
}

async function exitFullscreen() {
  await bridge.statusBar.show()
}

// 获取状态栏高度用于布局
async function adjustLayout() {
  const info = await bridge.statusBar.getInfo()
  document.documentElement.style.setProperty(
    '--status-bar-height',
    `${info.height}px`
  )
}
```

### Vue 组件示例

```vue
<template>
  <div class="status-bar-demo">
    <h3>状态栏样式</h3>
    <button @click="setStyle('default')">Default</button>
    <button @click="setStyle('light')">Light</button>
    <button @click="setStyle('dark')">Dark</button>
    
    <h3>可见性</h3>
    <button @click="show">显示</button>
    <button @click="hide">隐藏</button>
    
    <h3>背景色 (Android)</h3>
    <button @click="setColor('#007AFF')">蓝色</button>
    <button @click="setColor('#FF3B30')">红色</button>
    <button @click="setColor('#34C759')">绿色</button>
    
    <h3>当前信息</h3>
    <pre>{{ info }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { WebViewBridge, StatusBarStyle } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const info = ref({})

async function setStyle(style: StatusBarStyle) {
  await bridge.statusBar.setStyle(style)
  await updateInfo()
}

async function show() {
  await bridge.statusBar.show()
  await updateInfo()
}

async function hide() {
  await bridge.statusBar.hide()
  await updateInfo()
}

async function setColor(color: string) {
  await bridge.statusBar.setBackgroundColor(color)
}

async function updateInfo() {
  info.value = await bridge.statusBar.getInfo()
}

onMounted(updateInfo)
</script>
```
