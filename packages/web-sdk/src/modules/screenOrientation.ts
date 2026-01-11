/**
 * ScreenOrientation 模块 - 屏幕方向控制
 *
 * 提供屏幕方向锁定、解锁和监听功能
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

/** 屏幕方向类型 */
export type OrientationType = 
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'any'

/** 方向信息 */
export interface OrientationInfo {
  type: OrientationType
  angle?: number
}

// MARK: - ScreenOrientation 模块类

export class ScreenOrientationModule implements BridgeModule {
  readonly moduleName = 'ScreenOrientation'
  readonly methods = [
    'Get',
    'Lock',
    'Unlock',
  ] as const

  private changeCallback: ((info: OrientationInfo) => void) | null = null

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.bridge.addEventListener('ScreenOrientation.Changed' as any, (data: OrientationInfo) => {
      this.changeCallback?.(data)
    })
  }

  /**
   * 获取当前屏幕方向
   */
  async get(): Promise<OrientationInfo> {
    return this.bridge.send<OrientationInfo>('ScreenOrientation.Get')
  }

  /**
   * 锁定屏幕方向
   * @param orientation 要锁定的方向
   */
  async lock(orientation: OrientationType): Promise<void> {
    await this.bridge.send<void>('ScreenOrientation.Lock', { orientation })
  }

  /**
   * 解锁屏幕方向
   */
  async unlock(): Promise<void> {
    await this.bridge.send<void>('ScreenOrientation.Unlock')
  }

  /**
   * 监听屏幕方向变化
   */
  onChange(callback: (info: OrientationInfo) => void): void {
    this.changeCallback = callback
  }

  /**
   * 移除方向变化监听
   */
  removeAllListeners(): void {
    this.changeCallback = null
  }

  /**
   * 便捷方法：锁定为竖屏
   */
  async lockPortrait(): Promise<void> {
    return this.lock('portrait')
  }

  /**
   * 便捷方法：锁定为横屏
   */
  async lockLandscape(): Promise<void> {
    return this.lock('landscape')
  }
}
