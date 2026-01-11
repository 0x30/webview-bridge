/**
 * Motion 模块 - 设备运动传感器
 *
 * 提供加速度计、陀螺仪等传感器数据访问
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

/** 加速度数据 */
export interface AccelerometerData {
  x: number
  y: number
  z: number
  timestamp: number
}

/** 陀螺仪数据 */
export interface GyroscopeData {
  x: number
  y: number
  z: number
  timestamp: number
}

/** 设备方向数据 */
export interface OrientationData {
  alpha: number  // 偏航角 (0-360)
  beta: number   // 俯仰角 (-180 to 180)
  gamma: number  // 翻滚角 (-90 to 90)
}

/** 传感器选项 */
export interface MotionOptions {
  interval?: number  // 更新间隔（毫秒）
}

/** 启动结果 */
export interface MotionStartResult {
  started: boolean
}

/** 停止结果 */
export interface MotionStopResult {
  stopped: boolean
}

// MARK: - Motion 模块类

export class MotionModule implements BridgeModule {
  readonly moduleName = 'Motion'
  readonly methods = [
    'StartAccelerometer',
    'StopAccelerometer',
    'StartGyroscope',
    'StopGyroscope',
    'GetOrientation',
  ] as const

  private accelerometerCallback: ((data: AccelerometerData) => void) | null = null
  private gyroscopeCallback: ((data: GyroscopeData) => void) | null = null

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.bridge.addEventListener('Motion.Accelerometer' as any, (data: AccelerometerData) => {
      this.accelerometerCallback?.(data)
    })
    this.bridge.addEventListener('Motion.Gyroscope' as any, (data: GyroscopeData) => {
      this.gyroscopeCallback?.(data)
    })
  }

  /**
   * 开始加速度计
   */
  async startAccelerometer(options?: MotionOptions): Promise<MotionStartResult> {
    return this.bridge.send<MotionStartResult>('Motion.StartAccelerometer', (options || {}) as Record<string, unknown>)
  }

  /**
   * 停止加速度计
   */
  async stopAccelerometer(): Promise<MotionStopResult> {
    return this.bridge.send<MotionStopResult>('Motion.StopAccelerometer')
  }

  /**
   * 开始陀螺仪
   */
  async startGyroscope(options?: MotionOptions): Promise<MotionStartResult> {
    return this.bridge.send<MotionStartResult>('Motion.StartGyroscope', (options || {}) as Record<string, unknown>)
  }

  /**
   * 停止陀螺仪
   */
  async stopGyroscope(): Promise<MotionStopResult> {
    return this.bridge.send<MotionStopResult>('Motion.StopGyroscope')
  }

  /**
   * 获取设备方向
   */
  async getOrientation(): Promise<OrientationData> {
    return this.bridge.send<OrientationData>('Motion.GetOrientation')
  }

  /**
   * 监听加速度计数据
   */
  onAccelerometer(callback: (data: AccelerometerData) => void): void {
    this.accelerometerCallback = callback
  }

  /**
   * 监听陀螺仪数据
   */
  onGyroscope(callback: (data: GyroscopeData) => void): void {
    this.gyroscopeCallback = callback
  }

  /**
   * 移除所有传感器事件监听
   */
  removeAllListeners(): void {
    this.accelerometerCallback = null
    this.gyroscopeCallback = null
  }

  /**
   * 停止所有传感器
   */
  async stopAll(): Promise<void> {
    await Promise.all([
      this.stopAccelerometer().catch(() => {}),
      this.stopGyroscope().catch(() => {}),
    ])
    this.removeAllListeners()
  }
}
