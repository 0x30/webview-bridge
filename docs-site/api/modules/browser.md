# Browser 模块

Browser 模块提供应用内浏览器功能，用于在应用内打开网页而无需离开应用。

## 概述

- **模块名称**: `Browser`
- **功能**: 应用内浏览器打开/关闭、URL 预加载
- **平台支持**: iOS ✅ | Android ✅ | Web ❌

## 平台实现

| 平台 | 实现方式 |
|------|----------|
| iOS | SFSafariViewController |
| Android | Chrome Custom Tabs |

## API 方法

### Open

在应用内浏览器中打开 URL。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| url | string | ✅ | 要打开的 URL |
| toolbarColor | string | ❌ | 工具栏颜色（十六进制，如 #3880ff） |
| showTitle | boolean | ❌ | 是否显示页面标题，默认 true |
| presentationStyle | string | ❌ | 呈现样式（iOS），见下表 |
| shareState | string | ❌ | 分享按钮状态（Android） |

**presentationStyle 选项（iOS）**:
| 值 | 说明 |
|------|------|
| fullScreen | 全屏（默认） |
| popover | 弹出框 |
| pageSheet | 页面形式 |
| formSheet | 表单形式 |

**shareState 选项（Android）**:
| 值 | 说明 |
|------|------|
| default | 默认行为 |
| on | 显示分享按钮 |
| off | 隐藏分享按钮 |

**响应数据**:
```typescript
interface BrowserOpenResult {
  opened: boolean;
  fallback?: boolean;  // 是否回退到系统浏览器
}
```

---

### Close

关闭应用内浏览器。

**请求参数**: 无

**响应数据**:
```typescript
interface BrowserCloseResult {
  closed: boolean;
  reason?: string;  // 未关闭的原因
}
```

**注意**: Android Chrome Custom Tabs 不支持程序化关闭，需要用户手动关闭。

---

### Prefetch

预加载 URL，加快后续打开速度。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| urls | string[] | ✅ | 要预加载的 URL 列表 |

**响应数据**:
```typescript
interface BrowserPrefetchResult {
  prefetched: boolean;
  count: number;  // 成功预加载的数量
}
```

## 事件

### Browser.Opened

浏览器打开时触发。

**事件数据**:
```typescript
interface BrowserEventData {
  url: string;
  fallback?: boolean;
}
```

---

### Browser.Closed

浏览器关闭时触发。

**事件数据**: 无

---

### Browser.PageLoaded

页面加载完成时触发（iOS）。

**事件数据**:
```typescript
interface BrowserEventData {
  url: string;
}
```

## Web SDK 使用示例

```typescript
import { Bridge } from '@aspect/webview-bridge';

// 打开网页
await Bridge.browser.open({
  url: 'https://example.com',
  toolbarColor: '#3880ff',
  showTitle: true
});

// 预加载 URL
await Bridge.browser.prefetch([
  'https://example.com/page1',
  'https://example.com/page2'
]);

// 关闭浏览器
const result = await Bridge.browser.close();
if (!result.closed) {
  console.log('关闭失败:', result.reason);
}

// 监听事件
Bridge.browser.onOpened((data) => {
  console.log('打开了:', data.url);
});

Bridge.browser.onClosed(() => {
  console.log('浏览器已关闭');
});
```

## 与 System.OpenURL 的区别

| 功能 | Browser.Open | System.OpenURL |
|------|--------------|----------------|
| 打开位置 | 应用内 | 外部浏览器 |
| 用户体验 | 无需离开应用 | 切换到其他应用 |
| 返回方式 | 点击关闭按钮 | 从后台返回 |
| 自定义外观 | 支持 | 不支持 |
| 可控性 | 可关闭/监听事件 | 无法控制 |

## 使用场景

1. **OAuth 登录**: 打开第三方登录页面
2. **查看条款**: 打开隐私政策、服务条款
3. **外部链接**: 打开新闻、文章等外部内容
4. **支付页面**: 打开支付网关

## 最佳实践

1. **预加载**: 对于已知将要打开的 URL，提前调用 prefetch
2. **品牌一致性**: 使用 toolbarColor 匹配应用主题色
3. **错误处理**: 处理 fallback 情况，提示用户
4. **监听关闭**: 使用 onClosed 事件恢复应用状态

## 注意事项

- Android Chrome Custom Tabs 需要安装 Chrome 浏览器
- 如果 Chrome 不可用，会自动回退到系统浏览器
- iOS 上 SFSafariViewController 与 Safari 共享 Cookie
- 预加载仅在 Android 上有明显效果

## 权限要求

- 无需额外权限
- 需要网络访问能力
