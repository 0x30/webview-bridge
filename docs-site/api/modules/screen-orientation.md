# Screen Orientation 模块

Screen Orientation 模块提供屏幕方向的控制和监听功能。

## 概述

- **模块名称**: `ScreenOrientation`
- **功能**: 屏幕方向获取、锁定、解锁和变化监听
- **平台支持**: iOS ✅ | Android ✅ | Web ❌

## API 方法

### Get

获取当前屏幕方向。

**请求参数**: 无

**响应数据**:
```typescript
interface OrientationInfo {
  type: OrientationType;
  angle?: number;
}

type OrientationType = 
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'any';
```

**示例响应**:
```json
{
  "type": "portrait-primary",
  "angle": 0
}
```

---

### Lock

锁定屏幕为指定方向。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| orientation | OrientationType | ✅ | 要锁定的方向 |

**方向类型说明**:
| 值 | 说明 |
|------|------|
| portrait | 竖屏（允许正反） |
| portrait-primary | 竖屏正向 |
| portrait-secondary | 竖屏反向（倒置） |
| landscape | 横屏（允许左右） |
| landscape-primary | 横屏向左 |
| landscape-secondary | 横屏向右 |
| any | 允许任意方向 |

**响应数据**:
```json
{
  "locked": true
}
```

---

### Unlock

解锁屏幕方向，允许自由旋转。

**请求参数**: 无

**响应数据**:
```json
{
  "unlocked": true
}
```

## 事件

### ScreenOrientation.Changed

屏幕方向变化时触发。

**事件数据**:
```typescript
interface OrientationInfo {
  type: OrientationType;
  angle?: number;
}
```

## Web SDK 使用示例

```typescript
import { Bridge } from '@aspect/webview-bridge';

// 获取当前方向
const info = await Bridge.screenOrientation.get();
console.log('当前方向:', info.type);

// 锁定为竖屏
await Bridge.screenOrientation.lock('portrait');

// 锁定为横屏
await Bridge.screenOrientation.lock('landscape');

// 解锁方向
await Bridge.screenOrientation.unlock();

// 便捷方法
await Bridge.screenOrientation.lockPortrait();
await Bridge.screenOrientation.lockLandscape();

// 监听方向变化
Bridge.screenOrientation.onChange((info) => {
  console.log('方向变化:', info.type);
});
```

## 平台特性

### iOS

- 使用 `UIDevice.current.setValue()` 设置方向
- iOS 16+ 使用 `UIWindowScene.GeometryPreferences`
- 使用 `NotificationCenter` 监听方向变化

### Android

- 使用 `Activity.requestedOrientation` 控制方向
- 使用 `OrientationEventListener` 监听方向变化
- 支持的 `ActivityInfo` 常量:
  - `SCREEN_ORIENTATION_PORTRAIT`
  - `SCREEN_ORIENTATION_LANDSCAPE`
  - `SCREEN_ORIENTATION_REVERSE_PORTRAIT`
  - `SCREEN_ORIENTATION_REVERSE_LANDSCAPE`
  - `SCREEN_ORIENTATION_UNSPECIFIED`

## 使用场景

1. **视频播放**: 播放视频时锁定为横屏
2. **游戏应用**: 根据游戏类型锁定特定方向
3. **表单填写**: 锁定为竖屏以保持表单布局
4. **相机功能**: 根据设备方向调整 UI

## 最佳实践

1. **用户体验**: 在用户完成特定任务后及时解锁方向
2. **状态恢复**: 记住用户之前的方向偏好
3. **动画过渡**: 监听方向变化事件来处理 UI 动画
4. **清理资源**: 页面销毁时解锁方向

## 注意事项

- 某些设备可能在系统设置中禁用了自动旋转
- 锁定方向后用户无法手动旋转屏幕
- 建议在适当时机解锁方向，避免影响其他功能
