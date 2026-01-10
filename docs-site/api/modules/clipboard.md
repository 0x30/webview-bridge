# Clipboard 模块

Clipboard 模块提供了剪贴板读写能力。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const clipboard = bridge.clipboard
```

## 方法

### read

读取剪贴板内容。

**签名**

```typescript
read(): Promise<ClipboardContent>
```

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| text | string | 文本内容 |
| hasText | boolean | 是否包含文本 |

**示例**

```typescript
const content = await bridge.clipboard.read()
if (content.hasText) {
  console.log('剪贴板内容:', content.text)
}
```

### write

写入文本到剪贴板。

**签名**

```typescript
write(text: string): Promise<void>
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| text | string | 要写入的文本 |

**示例**

```typescript
await bridge.clipboard.write('Hello, World!')
```

### clear

清空剪贴板。

**签名**

```typescript
clear(): Promise<void>
```

**示例**

```typescript
await bridge.clipboard.clear()
```

## 类型定义

```typescript
interface ClipboardContent {
  /** 文本内容 */
  text: string
  /** 是否包含文本 */
  hasText: boolean
}

interface ClipboardModule {
  read(): Promise<ClipboardContent>
  write(text: string): Promise<void>
  clear(): Promise<void>
}
```

## 权限说明

| 平台 | 权限要求 |
|------|----------|
| iOS | iOS 14+ 读取时会显示提示 |
| Android | 无需特殊权限 |

::: warning iOS 隐私提示
从 iOS 14 开始，当应用读取剪贴板时，系统会显示一个小横幅通知用户。这是系统行为，无法禁用。
:::

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 复制按钮
async function copyToClipboard(text: string) {
  try {
    await bridge.clipboard.write(text)
    showToast('已复制到剪贴板')
  } catch (error) {
    showToast('复制失败')
  }
}

// 粘贴按钮
async function pasteFromClipboard() {
  try {
    const content = await bridge.clipboard.read()
    if (content.hasText) {
      document.getElementById('input').value = content.text
    } else {
      showToast('剪贴板为空')
    }
  } catch (error) {
    showToast('粘贴失败')
  }
}

// 分享链接
async function shareLink(url: string) {
  await bridge.clipboard.write(url)
  showToast('链接已复制')
}
```

### Vue 组件示例

```vue
<template>
  <div class="clipboard-demo">
    <input v-model="text" placeholder="输入文本" />
    
    <button @click="copy">复制</button>
    <button @click="paste">粘贴</button>
    <button @click="clear">清空剪贴板</button>
    
    <p v-if="clipboardContent">
      剪贴板内容: {{ clipboardContent }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const text = ref('')
const clipboardContent = ref('')

async function copy() {
  if (text.value) {
    await bridge.clipboard.write(text.value)
    alert('已复制')
  }
}

async function paste() {
  const content = await bridge.clipboard.read()
  if (content.hasText) {
    text.value = content.text
    clipboardContent.value = content.text
  }
}

async function clear() {
  await bridge.clipboard.clear()
  clipboardContent.value = ''
  alert('已清空')
}
</script>
```
