# Navigator 模块

Navigator 模块提供多 WebView 页面栈管理，类似小程序的页面导航系统。

## 概述

- **模块名称**: `Navigator`
- **功能**: 页面栈管理、页面间通信、数据传递
- **平台支持**: iOS ✅ | Android ✅ | Web ❌

## 核心概念

### 页面栈

Navigator 管理一个页面栈（Page Stack），每个页面都是一个独立的 WebView 实例。页面按照 LIFO（后进先出）的顺序组织。

```
┌─────────────────────┐
│    Page 3 (Top)     │  ← 当前页面
├─────────────────────┤
│       Page 2        │
├─────────────────────┤
│    Page 1 (Root)    │  ← 根页面
└─────────────────────┘
```

### 自举（Self-Bootstrap）

页面可以打开自己的新实例，实现"自举"功能：

```typescript
// 打开当前页面的新实例
await Bridge.navigator.push({
  url: window.location.href,
  title: '新实例',
  data: { mode: 'detail', id: 123 }
})
```

### 页面间通信

页面之间可以相互发送消息，支持：
- **定向发送**: 发送给指定页面
- **广播**: 发送给所有其他页面
- **返回数据**: pop 时携带数据给上一个页面

## API 方法

### Push

打开新页面。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| url | string | ✅ | 要打开的 URL |
| title | string | ❌ | 导航栏标题 |
| data | object | ❌ | 传递给新页面的数据 |
| animated | boolean | ❌ | 是否使用动画，默认 true |

**响应数据**:
```typescript
interface PageInfo {
  id: string;       // 页面唯一ID
  url: string;      // 页面URL
  title?: string;   // 页面标题
  index: number;    // 在栈中的索引
  createdAt: number; // 创建时间戳
}
```

---

### Pop

关闭当前页面，返回上一个页面。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| result | object | ❌ | 返回给上一个页面的数据 |
| delta | number | ❌ | 返回几层，默认 1 |
| animated | boolean | ❌ | 是否使用动画，默认 true |

**响应数据**:
```json
{
  "popped": true
}
```

---

### PopToRoot

返回到根页面。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| animated | boolean | ❌ | 是否使用动画，默认 true |

---

### Replace

用新页面替换当前页面（不增加栈深度）。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| url | string | ✅ | 新页面 URL |
| title | string | ❌ | 导航栏标题 |
| data | object | ❌ | 传递给新页面的数据 |

---

### PostMessage

向其他页面发送消息。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| targetPageId | string | ❌ | 目标页面ID，不传则广播 |
| message | object | ✅ | 消息内容 |

**响应数据**:
```json
{
  "sent": true
}
```

---

### GetPages

获取页面栈信息。

**响应数据**:
```typescript
interface GetPagesResult {
  pages: PageInfo[];
  count: number;
}
```

---

### GetCurrentPage

获取当前页面信息。

**响应数据**: `PageInfo`

---

### SetTitle

设置当前页面标题。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | ✅ | 新标题 |

## 事件

### Navigator.PageCreated

页面被创建时触发（在新页面中）。

**事件数据**:
```typescript
interface PageCreatedEventData {
  page: PageInfo;
  data?: Record<string, unknown>;
}
```

---

### Navigator.PageDestroyed

页面被销毁时触发。

**事件数据**: `PageInfo`

---

### Navigator.Message

收到来自其他页面的消息。

**事件数据**:
```typescript
interface PageMessageEventData {
  from: PageInfo;
  message: Record<string, unknown>;
}
```

---

### Navigator.Result

收到页面返回的数据（当子页面 pop 并携带 result 时）。

**事件数据**:
```typescript
interface PageResultEventData {
  from: PageInfo;
  result: Record<string, unknown>;
}
```

---

### Navigator.LaunchData

收到启动数据（通过 push 传递的 data）。

**事件数据**: `Record<string, unknown>`

---

### Navigator.PageOpened

当前页面 push 了新页面时触发。

**事件数据**: `PageInfo`

## Web SDK 使用示例

### 基本导航

```typescript
import { Bridge } from '@aspect/webview-bridge';

// 打开新页面
const newPage = await Bridge.navigator.push({
  url: 'https://example.com/detail',
  title: '详情页',
  data: { productId: 123 }
});
console.log('新页面ID:', newPage.id);

// 返回上一页
await Bridge.navigator.pop();

// 携带数据返回
await Bridge.navigator.pop({
  result: { selected: true, itemId: 456 }
});

// 返回多层
await Bridge.navigator.pop({ delta: 2 });

// 返回到根页面
await Bridge.navigator.popToRoot();
```

### 自举（打开自己的新实例）

```typescript
// 打开当前页面的新实例
await Bridge.navigator.push({
  url: window.location.href,
  title: '新实例',
  data: { mode: 'nested' }
});
```

### 页面间通信

```typescript
// 发送消息给指定页面
await Bridge.navigator.postMessage({
  targetPageId: 'page_1',
  message: { action: 'refresh', data: { userId: 123 } }
});

// 发送消息给上一个页面
await Bridge.navigator.postMessageToPrevious({
  type: 'selection',
  selectedId: 456
});

// 广播给所有其他页面
await Bridge.navigator.broadcast({
  type: 'logout',
  reason: 'session_expired'
});
```

### 接收数据和消息

```typescript
// 获取启动数据
const launchData = Bridge.navigator.launchData;
console.log('启动数据:', launchData);

// 监听启动数据（推荐，因为数据可能异步到达）
Bridge.navigator.onLaunchData((data) => {
  console.log('收到启动数据:', data);
});

// 监听来自其他页面的消息
Bridge.navigator.onMessage((data) => {
  console.log('收到消息:', data.message);
  console.log('来自页面:', data.from.id);
});

// 监听返回结果
Bridge.navigator.onResult((data) => {
  console.log('子页面返回:', data.result);
});
```

### 获取页面栈信息

```typescript
// 获取所有页面
const { pages, count } = await Bridge.navigator.getPages();
console.log(`共 ${count} 个页面`);

// 获取当前页面
const current = await Bridge.navigator.getCurrentPage();
console.log('当前页面:', current.id);

// 设置标题
await Bridge.navigator.setTitle('新标题');
```

## 使用场景

1. **列表-详情模式**: 从列表页 push 到详情页，返回时刷新列表
2. **选择器**: push 选择页面，选择后 pop 并返回所选数据
3. **表单向导**: 多步表单，每步一个页面，最后提交
4. **模块化应用**: 不同模块作为独立页面加载

## 平台特性

### iOS

- 使用 `UINavigationController` 管理页面栈
- 每个页面是一个 `UIViewController` 包含 `WKWebView`
- 支持系统返回手势

### Android

- 使用 `Activity` 栈管理页面
- 每个页面是一个独立的 `Activity`
- 支持系统返回键

## 最佳实践

1. **数据解耦**: 使用消息通信而不是全局状态
2. **及时清理**: 监听器在不需要时调用 `removeAllListeners()`
3. **错误处理**: 处理 pop 根页面等边界情况
4. **深度限制**: 避免页面栈过深，影响性能和用户体验
5. **数据大小**: 传递的数据应该精简，避免传递大对象

## 与 Browser 模块的区别

| 功能 | Navigator | Browser |
|------|-----------|---------|
| 打开方式 | 原生页面栈 | 系统浏览器组件 |
| WebView 实例 | 新的 SDK WebView | Safari/Chrome |
| 数据通信 | 完全支持 | 不支持 |
| 导航控制 | 完全控制 | 有限控制 |
| 适用场景 | 应用内页面 | 外部链接 |
