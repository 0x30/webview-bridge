# Motion 模块

Motion 模块提供设备运动传感器（加速度计、陀螺仪）的数据访问。

## 概述

- **模块名称**: `Motion`
- **功能**: 加速度计、陀螺仪数据读取和设备方向获取
- **平台支持**: iOS ✅ | Android ✅ | Web ❌

## API 方法

### StartAccelerometer

启动加速度计，开始接收加速度数据。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| interval | number | ❌ | 更新间隔（毫秒），默认 100ms |

**响应数据**:
```json
{
  "started": true
}
```

---

### StopAccelerometer

停止加速度计。

**请求参数**: 无

**响应数据**:
```json
{
  "stopped": true
}
```

---

### StartGyroscope

启动陀螺仪，开始接收角速度数据。

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| interval | number | ❌ | 更新间隔（毫秒），默认 100ms |

**响应数据**:
```json
{
  "started": true
}
```

---

### StopGyroscope

停止陀螺仪。

**请求参数**: 无

**响应数据**:
```json
{
  "stopped": true
}
```

---

### GetOrientation

获取设备当前方向（基于旋转向量）。

**请求参数**: 无

**响应数据**:
```typescript
interface OrientationData {
  alpha: number;  // 偏航角 (0-360°)
  beta: number;   // 俯仰角 (-180° to 180°)
  gamma: number;  // 翻滚角 (-90° to 90°)
}
```

## 事件

### Motion.Accelerometer

加速度计数据更新时触发。

**事件数据**:
```typescript
interface AccelerometerData {
  x: number;      // X 轴加速度 (m/s²)
  y: number;      // Y 轴加速度 (m/s²)
  z: number;      // Z 轴加速度 (m/s²)
  timestamp: number;  // 时间戳
}
```

---

### Motion.Gyroscope

陀螺仪数据更新时触发。

**事件数据**:
```typescript
interface GyroscopeData {
  x: number;      // X 轴角速度 (rad/s)
  y: number;      // Y 轴角速度 (rad/s)
  z: number;      // Z 轴角速度 (rad/s)
  timestamp: number;  // 时间戳
}
```

## Web SDK 使用示例

```typescript
import { Bridge } from '@aspect/webview-bridge';

// 启动加速度计
await Bridge.motion.startAccelerometer({ interval: 50 });

// 监听加速度数据
Bridge.motion.onAccelerometer((data) => {
  console.log(`X: ${data.x}, Y: ${data.y}, Z: ${data.z}`);
});

// 启动陀螺仪
await Bridge.motion.startGyroscope({ interval: 50 });

// 监听陀螺仪数据
Bridge.motion.onGyroscope((data) => {
  console.log(`旋转: X=${data.x}, Y=${data.y}, Z=${data.z}`);
});

// 获取设备方向
const orientation = await Bridge.motion.getOrientation();
console.log(`方向: α=${orientation.alpha}°, β=${orientation.beta}°, γ=${orientation.gamma}°`);

// 停止所有传感器
await Bridge.motion.stopAll();
```

## 平台特性

### iOS

- 使用 `CoreMotion` 框架的 `CMMotionManager`
- 加速度计使用 `startAccelerometerUpdates`
- 陀螺仪使用 `startGyroUpdates`
- 方向使用 `startDeviceMotionUpdates`

### Android

- 使用 `SensorManager` 系统服务
- 加速度计使用 `Sensor.TYPE_ACCELEROMETER`
- 陀螺仪使用 `Sensor.TYPE_GYROSCOPE`
- 方向使用 `Sensor.TYPE_ROTATION_VECTOR`

## 使用场景

1. **运动检测**: 检测设备的移动、摇晃
2. **计步器**: 分析加速度数据计算步数
3. **游戏控制**: 使用设备倾斜来控制游戏
4. **增强现实**: 跟踪设备方向进行 AR 渲染
5. **指南针**: 结合方向数据实现指南针功能

## 坐标系说明

### 加速度计坐标系

- **X 轴**: 设备屏幕的水平方向（右为正）
- **Y 轴**: 设备屏幕的垂直方向（上为正）
- **Z 轴**: 垂直于屏幕的方向（屏幕外为正）

### 陀螺仪坐标系

- **X 轴**: 绕 X 轴旋转（俯仰）
- **Y 轴**: 绕 Y 轴旋转（横滚）
- **Z 轴**: 绕 Z 轴旋转（偏航）

## 最佳实践

1. **节省电量**: 不需要时及时停止传感器
2. **适当的采样率**: 根据需求选择合适的更新间隔
3. **数据滤波**: 考虑使用低通滤波器平滑数据
4. **清理资源**: 组件卸载时调用 `stopAll()`

## 注意事项

- 传感器会消耗电池电量
- 模拟器可能不支持运动传感器
- 某些低端设备可能没有陀螺仪
- 数据精度因设备而异
