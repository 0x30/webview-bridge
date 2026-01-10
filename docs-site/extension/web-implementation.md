# Web 模块实现

本文档详细介绍如何使用 TypeScript 实现 Web 端的 Bridge 模块。

## 模块接口

所有 Web 模块都需要实现 `BridgeModule` 接口：

```typescript
interface BridgeModule {
  /** 模块名称 */
  moduleName: string
  /** 支持的方法列表 */
  methods: readonly string[]
}
```

## 基本结构

```typescript
// modules/mymodule.ts

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// ============================================================================
// 类型定义
// ============================================================================

export interface MyMethodParams {
  value: string
  count?: number
}

export interface MyMethodResult {
  success: boolean
  data: string
}

// ============================================================================
// 模块实现
// ============================================================================

export class MyModule implements BridgeModule {
  readonly moduleName = 'MyModule'
  readonly methods = [
    'MethodA',
    'MethodB',
    'MethodC',
  ] as const

  constructor(private bridge: BridgeCore) {}

  /**
   * 方法 A
   * @param params 参数
   */
  async methodA(params: MyMethodParams): Promise<MyMethodResult> {
    return this.bridge.send<MyMethodResult>(
      'MyModule.MethodA',
      params as Record<string, unknown>
    )
  }

  /**
   * 方法 B
   */
  async methodB(): Promise<{ value: number }> {
    return this.bridge.send<{ value: number }>('MyModule.MethodB')
  }

  /**
   * 方法 C
   * @param id 标识符
   */
  async methodC(id: string): Promise<void> {
    await this.bridge.send('MyModule.MethodC', { id })
  }
}

export default MyModule
```

## 类型定义

### 定义请求参数

```typescript
// 简单参数
export interface SimpleParams {
  name: string
  age: number
}

// 可选参数
export interface OptionalParams {
  required: string
  optional?: number
  defaultValue?: boolean
}

// 联合类型
export type PermissionType = 'camera' | 'photos' | 'location'

export interface PermissionParams {
  type: PermissionType
}

// 复杂嵌套
export interface ComplexParams {
  user: {
    id: string
    name: string
  }
  options?: {
    timeout?: number
    retries?: number
  }
}
```

### 定义返回值

```typescript
// 简单返回
export interface SimpleResult {
  success: boolean
}

// 包含数据
export interface DataResult<T> {
  success: boolean
  data: T
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[]
  total: number
  offset: number
  limit: number
}

// 取消类型
export interface CancelledResult {
  cancelled: true
}

// 联合返回
export type PickResult<T> = T | CancelledResult
```

## 调用 Native

### 基本调用

```typescript
// 无参数
async doSomething(): Promise<Result> {
  return this.bridge.send<Result>('Module.DoSomething')
}

// 带参数
async doWithParams(params: Params): Promise<Result> {
  return this.bridge.send<Result>(
    'Module.DoWithParams',
    params as Record<string, unknown>
  )
}

// 简单参数
async getById(id: string): Promise<Item> {
  return this.bridge.send<Item>('Module.GetById', { id })
}
```

### 处理可选参数

```typescript
async getItems(params?: GetItemsParams): Promise<ItemsResult> {
  return this.bridge.send<ItemsResult>(
    'Module.GetItems',
    params as Record<string, unknown>
  )
}
```

### 处理取消结果

```typescript
async pickItem(): Promise<Item | CancelledResult> {
  const result = await this.bridge.send<Item | CancelledResult>(
    'Module.PickItem'
  )
  return result
}

// 使用
const result = await module.pickItem()
if ('cancelled' in result && result.cancelled) {
  console.log('用户取消了选择')
} else {
  console.log('选择了:', result)
}
```

## 事件监听

### 设置事件监听器

```typescript
export class MyModule implements BridgeModule {
  // ... 其他代码

  /**
   * 监听状态变化
   */
  onStatusChanged(callback: (status: Status) => void): () => void {
    this.bridge.addEventListener('MyModule.StatusChanged' as any, callback)
    
    // 返回取消函数
    return () => {
      this.bridge.removeEventListener('MyModule.StatusChanged' as any, callback)
    }
  }
}

// 使用
const removeListener = module.onStatusChanged((status) => {
  console.log('状态变化:', status)
})

// 稍后取消监听
removeListener()
```

### 管理多个监听器

```typescript
export class NFCModule implements BridgeModule {
  private tagCallbacks = new Set<(data: TagData) => void>()

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.bridge.addEventListener('NFC.TagDetected' as any, (data: TagData) => {
      this.tagCallbacks.forEach(callback => callback(data))
    })
  }

  onTagDetected(callback: (data: TagData) => void): () => void {
    this.tagCallbacks.add(callback)
    return () => {
      this.tagCallbacks.delete(callback)
    }
  }
}
```

## 便捷方法

### 封装常用操作

```typescript
export class BiometricsModule implements BridgeModule {
  // ... 基础方法

  /**
   * 检查是否支持 Face ID
   */
  async hasFaceId(): Promise<boolean> {
    const result = await this.getBiometryType()
    return result.type === 'faceId' || result.type === 'face'
  }

  /**
   * 简化的验证方法
   */
  async verify(reason?: string): Promise<void> {
    const result = await this.authenticate({ reason })
    if (!result.success) {
      throw new Error(result.errorMessage || '认证失败')
    }
  }
}
```

### 提供默认值

```typescript
async getItems(params?: Partial<GetItemsParams>): Promise<ItemsResult> {
  const defaultParams: GetItemsParams = {
    offset: 0,
    limit: 20,
    ...params
  }
  
  return this.bridge.send<ItemsResult>(
    'Module.GetItems',
    defaultParams as Record<string, unknown>
  )
}
```

### 纯 JS 实现

```typescript
/**
 * 计算两点距离 (不需要 Native)
 */
calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // 地球半径（米）
  const dLat = this.toRad(lat2 - lat1)
  const dLon = this.toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

private toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
```

## 导出模块

### 在 modules/index.ts 中导出

```typescript
// 导出模块类和类型
export {
  MyModule,
  type MyMethodParams,
  type MyMethodResult,
  type Status,
} from './mymodule'
```

### 在主入口注册

```typescript
// index.ts

import { MyModule } from './modules'

class WebViewBridge {
  // ... 其他模块

  /** MyModule 模块 */
  public readonly myModule: MyModule

  constructor(config?: BridgeConfig) {
    this.core = BridgeCore.getInstance(config)
    
    // ... 其他模块初始化
    this.myModule = new MyModule(this.core)
  }
}
```

## 完整示例

```typescript
/**
 * Flashlight 模块 - 手电筒控制
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// ============================================================================
// 类型定义
// ============================================================================

export interface FlashlightAvailability {
  isAvailable: boolean
}

export interface TurnOnParams {
  /** 亮度级别 (0-1) */
  level?: number
}

export interface FlashlightResult {
  success: boolean
}

export interface FlashlightStatus {
  isOn: boolean
  level: number
}

// ============================================================================
// Flashlight 模块实现
// ============================================================================

export class FlashlightModule implements BridgeModule {
  readonly moduleName = 'Flashlight'
  readonly methods = [
    'IsAvailable',
    'TurnOn',
    'TurnOff',
    'GetStatus',
  ] as const

  constructor(private bridge: BridgeCore) {}

  /**
   * 检查手电筒是否可用
   */
  async isAvailable(): Promise<FlashlightAvailability> {
    return this.bridge.send<FlashlightAvailability>('Flashlight.IsAvailable')
  }

  /**
   * 打开手电筒
   */
  async turnOn(params?: TurnOnParams): Promise<FlashlightResult> {
    return this.bridge.send<FlashlightResult>(
      'Flashlight.TurnOn',
      params as Record<string, unknown>
    )
  }

  /**
   * 关闭手电筒
   */
  async turnOff(): Promise<FlashlightResult> {
    return this.bridge.send<FlashlightResult>('Flashlight.TurnOff')
  }

  /**
   * 获取状态
   */
  async getStatus(): Promise<FlashlightStatus> {
    return this.bridge.send<FlashlightStatus>('Flashlight.GetStatus')
  }

  // ============================================================================
  // 便捷方法
  // ============================================================================

  /**
   * 切换手电筒
   */
  async toggle(): Promise<FlashlightResult> {
    const status = await this.getStatus()
    return status.isOn ? this.turnOff() : this.turnOn()
  }

  /**
   * 设置亮度
   */
  async setLevel(level: number): Promise<FlashlightResult> {
    const clampedLevel = Math.max(0, Math.min(1, level))
    return this.turnOn({ level: clampedLevel })
  }
}

export default FlashlightModule
```
