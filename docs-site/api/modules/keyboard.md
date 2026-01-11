# Keyboard 模块

Keyboard 模块提供软键盘的控制和事件监听功能。

## 概述

- **模块名称**: `Keyboard`
- **功能**: 软键盘显示/隐藏控制、键盘状态获取、键盘事件监听
- **平台支持**: iOS ✅ | Android ✅ | Web ❌

## API 方法

### Show

显示软键盘。

**请求参数**: 无

**响应数据**:
```json
{
  "shown": true
}
```

**注意**: 需要有可聚焦的输入元素。

---

### Hide

隐藏软键盘。

**请求参数**: 无

**响应数据**:
```json
{
  "hidden": true
}
```

---

### GetInfo

获取键盘状态信息。

**请求参数**: 无

**响应数据**:
```typescript
interface KeyboardInfo {
  isVisible: boolean;
  height?: number;
  keyboardHeight?: number;
}
```

---

### SetAccessoryBarVisible

设置键盘附件栏的可见性（iOS 特有）。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| visible | boolean | ✅ | 是否显示附件栏 |

**响应数据**:
```json
{
  "set": true
}
```

---

### SetScroll

设置键盘弹出时是否自动滚动视图。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| enabled | boolean | ✅ | 是否启用自动滚动 |

---

### SetStyle

设置键盘外观样式（iOS 特有）。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| style | "light" \| "dark" | ✅ | 键盘样式 |

---

### SetResizeMode

设置键盘弹出时视图调整模式（Android 特有）。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| mode | "none" \| "native" \| "ionic" | ✅ | 调整模式 |

## 事件

### Keyboard.WillShow

键盘即将显示时触发。

**事件数据**:
```typescript
interface KeyboardEventData {
  height: number;
  animationDuration?: number;
}
```

---

### Keyboard.DidShow

键盘显示完成后触发。

---

### Keyboard.WillHide

键盘即将隐藏时触发。

---

### Keyboard.DidHide

键盘隐藏完成后触发。

## Web SDK 使用示例

```typescript
import { Bridge } from '@aspect/webview-bridge';

// 获取键盘信息
const info = await Bridge.keyboard.getInfo();
console.log('键盘可见:', info.isVisible);

// 显示/隐藏键盘
await Bridge.keyboard.show();
await Bridge.keyboard.hide();

// 监听键盘事件
Bridge.keyboard.onWillShow((data) => {
  console.log('键盘高度:', data.height);
});

Bridge.keyboard.onDidHide(() => {
  console.log('键盘已隐藏');
});
```

## 平台特性

### iOS

- 使用 `UIResponder.becomeFirstResponder()` 显示键盘
- 通过 `NotificationCenter` 监听键盘事件
- 支持设置键盘样式和附件栏

### Android

- 使用 `InputMethodManager` 控制键盘
- 通过 `ViewTreeObserver.OnGlobalLayoutListener` 检测键盘状态
- 支持设置软输入模式（adjustResize、adjustPan 等）

## 最佳实践

1. **避免频繁调用**: 不要在短时间内频繁调用 show/hide
2. **使用事件监听**: 使用事件监听而不是轮询来检测键盘状态
3. **处理布局变化**: 监听 WillShow/WillHide 事件来调整页面布局
4. **清理监听器**: 组件卸载时调用 `removeAllListeners()`
