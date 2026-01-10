# 调试技巧

本文档介绍如何调试 WebView Bridge SDK 相关的问题。

## 开启调试模式

```typescript
const bridge = new WebViewBridge({
  debug: true
})
```

开启后，所有 Bridge 通信都会输出到控制台。

## 控制台日志

### Web 端日志

在浏览器开发者工具中查看：

```
[Bridge] → Device.GetInfo {}
[Bridge] ← Device.GetInfo { model: "iPhone 15", platform: "ios", ... }
```

### iOS 日志

在 Xcode 控制台中查看：

```
[WebViewBridge] Received: {"id":"1","type":"Device.GetInfo","params":{}}
[WebViewBridge] Response: {"id":"1","success":true,"data":{...}}
```

### Android 日志

使用 Logcat 查看：

```
D/WebViewBridge: Received: {"id":"1","type":"Device.GetInfo","params":{}}
D/WebViewBridge: Response: {"id":"1","success":true,"data":{...}}
```

## Safari Web Inspector

### iOS 真机调试

1. 在 iPhone 上启用 Web 检查器：
   - 设置 → Safari → 高级 → Web 检查器

2. 连接 iPhone 到 Mac

3. 在 Safari 中打开：
   - 开发 → [设备名] → [WebView]

4. 可以查看控制台、网络、元素等

### iOS 模拟器调试

1. 运行模拟器中的 App

2. 在 Safari 中打开：
   - 开发 → 模拟器 → [WebView]

## Chrome DevTools

### Android 真机调试

1. 在 Android 设备上启用 USB 调试

2. 连接设备到电脑

3. 在 Chrome 中打开：
   ```
   chrome://inspect
   ```

4. 找到并点击 "inspect"

### Android 模拟器调试

同上步骤，模拟器会显示在设备列表中。

## 常见问题

### 1. Bridge 未初始化

**症状**：调用方法时报错 "Bridge not initialized"

**解决**：确保在 WebView 加载完成后再初始化 Bridge

```typescript
document.addEventListener('DOMContentLoaded', () => {
  const bridge = new WebViewBridge()
})
```

### 2. 方法调用无响应

**症状**：Promise 一直 pending

**可能原因**：
- 原生端未实现该方法
- 消息格式不正确
- 原生端处理出错但未返回

**调试步骤**：

1. 检查原生端日志
2. 验证方法名是否正确
3. 添加超时处理：

```typescript
const bridge = new WebViewBridge({
  timeout: 10000 // 10秒超时
})

try {
  const result = await bridge.device.getInfo()
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.error('请求超时')
  }
}
```

### 3. 事件未触发

**症状**：订阅了事件但收不到

**检查项**：
- 原生端是否正确发送事件
- 事件名是否匹配
- 监听器是否正确注册

```typescript
// 验证监听器是否注册
bridge.core.addEventListener('Network.StatusChanged', (data) => {
  console.log('收到事件:', data)
})

// 手动触发测试（仅开发时）
window.postMessage({
  type: 'event',
  event: 'Network.StatusChanged',
  data: { isConnected: true, type: 'wifi' }
})
```

### 4. 权限问题

**症状**：操作失败，错误码 -6

**解决**：

```typescript
try {
  await bridge.media.pickPhoto()
} catch (error) {
  if (error.code === -6) {
    // 权限被拒绝
    const shouldOpenSettings = confirm('需要相册权限，是否前往设置？')
    if (shouldOpenSettings) {
      await bridge.permission.openSettings()
    }
  }
}
```

### 5. 数据序列化问题

**症状**：参数传递后变成 undefined 或格式错误

**原因**：复杂对象无法正确序列化

**解决**：

```typescript
// ❌ 不能传递的类型
await bridge.storage.set('key', new Date())     // Date 对象
await bridge.storage.set('key', /regex/)        // 正则
await bridge.storage.set('key', () => {})       // 函数

// ✅ 应该转换后传递
await bridge.storage.set('key', new Date().toISOString())
await bridge.storage.set('key', { pattern: '/regex/', flags: '' })
```

## 网络抓包

### Charles / Proxyman

1. 配置代理
2. 安装 SSL 证书到设备
3. 监控 WebView 中的网络请求

### Wireshark

用于分析原生端的网络通信（非 WebView）。

## 日志级别

```typescript
const bridge = new WebViewBridge({
  debug: true,
  logLevel: 'verbose' // 'error' | 'warn' | 'info' | 'verbose'
})
```

| 级别 | 输出内容 |
|------|----------|
| error | 仅错误 |
| warn | 错误 + 警告 |
| info | 错误 + 警告 + 基本信息 |
| verbose | 所有信息，包括请求/响应详情 |

## 性能分析

### 测量调用耗时

```typescript
async function measureCall() {
  const start = performance.now()
  
  await bridge.device.getInfo()
  
  const end = performance.now()
  console.log(`调用耗时: ${end - start}ms`)
}
```

### 批量操作性能

```typescript
// ❌ 慢
for (const id of ids) {
  const contact = await bridge.contacts.getById(id)
  contacts.push(contact)
}

// ✅ 快
const contacts = await bridge.contacts.getByIds(ids)
```

## 模拟原生环境

在纯 Web 环境开发时，可以模拟原生响应：

```typescript
if (process.env.NODE_ENV === 'development' && !isNativeEnvironment()) {
  // 模拟原生响应
  window.__BRIDGE_MOCK__ = {
    'Device.GetInfo': async () => ({
      model: 'Mock Device',
      platform: 'web',
      osVersion: '1.0.0',
    }),
    'Network.GetStatus': async () => ({
      isConnected: true,
      type: 'wifi',
    }),
  }
}
```
