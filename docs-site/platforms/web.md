# Web SDK

WebView Bridge SDK 的 Web 端 SDK 提供了在 WebView 中调用原生能力的 JavaScript/TypeScript 接口。

## 安装

### npm / pnpm / yarn

```bash
# npm
npm install webview-bridge-sdk

# pnpm
pnpm add webview-bridge-sdk

# yarn
yarn add webview-bridge-sdk
```

### CDN

```html
<script src="https://unpkg.com/webview-bridge-sdk/dist/index.umd.js"></script>
<script>
  const bridge = new WebViewBridge.WebViewBridge()
</script>
```

## 快速开始

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 获取设备信息
const deviceInfo = await bridge.device.getInfo()
console.log('设备:', deviceInfo.model)
```

## 模块一览

| 模块 | 功能 |
|------|------|
| app | 应用信息 |
| device | 设备信息 |
| storage | 本地存储 |
| clipboard | 剪贴板 |
| haptics | 触觉反馈 |
| statusBar | 状态栏 |
| system | 系统功能 |
| permission | 权限管理 |
| contacts | 联系人 |
| media | 媒体 |
| location | 位置 |
| biometrics | 生物识别 |
| nfc | NFC |
| network | 网络 |

## TypeScript 支持

SDK 提供了完整的 TypeScript 类型定义：

```typescript
import {
  WebViewBridge,
  DeviceInfo,
  Contact,
  PermissionType,
  PermissionStatus,
  MediaResult,
  LocationCoords,
  NetworkStatus,
} from 'webview-bridge-sdk'
```

## 框架集成

### Vue 3

```typescript
// composables/useBridge.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { WebViewBridge, NetworkStatus } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

export function useNetworkStatus() {
  const status = ref<NetworkStatus | null>(null)
  let removeListener: (() => void) | null = null
  
  onMounted(async () => {
    status.value = await bridge.network.getStatus()
    removeListener = bridge.network.onStatusChanged((s) => {
      status.value = s
    })
  })
  
  onUnmounted(() => {
    removeListener?.()
  })
  
  return { status }
}

export function useBridge() {
  return bridge
}
```

### React

```typescript
// hooks/useBridge.ts
import { useEffect, useState } from 'react'
import { WebViewBridge, NetworkStatus } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus | null>(null)
  
  useEffect(() => {
    bridge.network.getStatus().then(setStatus)
    const removeListener = bridge.network.onStatusChanged(setStatus)
    return removeListener
  }, [])
  
  return status
}

export function useBridge() {
  return bridge
}
```

## 构建配置

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2015',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          bridge: ['webview-bridge-sdk']
        }
      }
    }
  }
})
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  // ...
  optimization: {
    splitChunks: {
      cacheGroups: {
        bridge: {
          test: /[\\/]node_modules[\\/]webview-bridge-sdk[\\/]/,
          name: 'bridge',
          chunks: 'all'
        }
      }
    }
  }
}
```

## 调试

### 开启调试模式

```typescript
const bridge = new WebViewBridge({
  debug: true
})
```

### 环境检测

```typescript
// 检测是否在原生 WebView 中
const isNative = bridge.isNativeEnvironment()

if (!isNative) {
  console.log('在浏览器中运行，部分功能不可用')
}
```

### Mock 模式

在非原生环境开发时：

```typescript
if (process.env.NODE_ENV === 'development') {
  // 提供 mock 数据
  window.__BRIDGE_MOCK__ = {
    'Device.GetInfo': async () => ({
      model: 'Dev Machine',
      platform: 'web',
      osVersion: '1.0.0'
    })
  }
}
```

## 浏览器兼容性

| 浏览器 | 版本 |
|--------|------|
| Chrome | 60+ |
| Safari | 10.1+ |
| Firefox | 60+ |
| Edge | 79+ |

## 包大小

| 格式 | 大小 (gzip) |
|------|-------------|
| ESM | ~8KB |
| UMD | ~10KB |

## 常见问题

### Q: 可以在普通浏览器中使用吗？

A: 可以导入和调用，但实际功能需要原生端支持。建议使用 `isNativeEnvironment()` 检测并提供降级方案。

### Q: 如何处理异步加载？

A: SDK 会自动等待原生环境就绪：

```typescript
const bridge = new WebViewBridge()
await bridge.ready() // 等待就绪
```

### Q: 支持 SSR 吗？

A: SDK 需要浏览器环境，在 SSR 中应该条件导入：

```typescript
// Nuxt 3 示例
const bridge = process.client 
  ? new (await import('webview-bridge-sdk')).WebViewBridge() 
  : null
```
