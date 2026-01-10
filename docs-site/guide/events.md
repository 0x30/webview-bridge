# 事件系统

WebView Bridge SDK 支持从原生端接收实时事件通知。

## 事件类型

SDK 支持以下事件类型：

### 网络事件

```typescript
bridge.network.onStatusChanged((status) => {
  console.log('网络状态:', status.isConnected ? '已连接' : '已断开')
  console.log('网络类型:', status.type)
})
```

### 位置事件

```typescript
// 位置更新
bridge.location.onLocationUpdated((coords) => {
  console.log('新位置:', coords.latitude, coords.longitude)
})

// 位置错误
bridge.location.onError((error) => {
  console.error('位置错误:', error.message)
})
```

### NFC 事件

```typescript
// 标签检测
bridge.nfc.onTagDetected((tag) => {
  console.log('检测到标签:', tag.id)
})

// 写入成功
bridge.nfc.onWriteSuccess(() => {
  console.log('NFC 写入成功')
})

// 写入失败
bridge.nfc.onWriteError((error) => {
  console.error('NFC 写入失败:', error)
})
```

## 监听器管理

### 添加监听器

每个事件监听方法都返回一个取消函数：

```typescript
const removeListener = bridge.network.onStatusChanged((status) => {
  // 处理事件
})
```

### 移除监听器

调用返回的函数来移除监听器：

```typescript
removeListener()
```

## 在框架中使用

### Vue 3 Composition API

```typescript
import { onMounted, onUnmounted, ref } from 'vue'

export function useNetworkStatus() {
  const status = ref(null)
  let removeListener: (() => void) | null = null
  
  onMounted(async () => {
    // 获取初始状态
    status.value = await bridge.network.getStatus()
    
    // 监听变化
    removeListener = bridge.network.onStatusChanged((newStatus) => {
      status.value = newStatus
    })
  })
  
  onUnmounted(() => {
    removeListener?.()
  })
  
  return { status }
}
```

### React Hooks

```typescript
import { useEffect, useState } from 'react'

export function useNetworkStatus() {
  const [status, setStatus] = useState(null)
  
  useEffect(() => {
    bridge.network.getStatus().then(setStatus)
    
    const removeListener = bridge.network.onStatusChanged(setStatus)
    return removeListener
  }, [])
  
  return status
}
```

## 最佳实践

1. **始终清理监听器** - 在组件卸载时移除监听器
2. **避免重复订阅** - 使用单一监听器分发给多个消费者
3. **处理初始状态** - 订阅前先获取当前状态
4. **错误处理** - 为可能失败的事件添加错误监听
