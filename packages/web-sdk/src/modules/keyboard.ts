/**
 * Keyboard 模块 - 软键盘控制
 *
 * 提供软键盘显示、隐藏和事件监听功能
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

/** 键盘信息 */
export interface KeyboardInfo {
  isVisible: boolean
  height?: number
  keyboardHeight?: number
}

/** 键盘事件数据 */
export interface KeyboardEventData {
  height: number
  animationDuration?: number
}

/** 键盘样式（iOS） */
export type KeyboardStyle = 'light' | 'dark'

/** 键盘调整模式（Android） */
export type KeyboardResizeMode = 'none' | 'native' | 'ionic'

// MARK: - Keyboard 模块类

export class KeyboardModule implements BridgeModule {
  readonly moduleName = 'Keyboard'
  readonly methods = [
    'Show',
    'Hide',
    'GetInfo',
    'SetAccessoryBarVisible',
    'SetScroll',
    'SetStyle',
    'SetResizeMode',
  ] as const

  private willShowCallback: ((data: KeyboardEventData) => void) | null = null
  private didShowCallback: ((data: KeyboardEventData) => void) | null = null
  private willHideCallback: ((data: KeyboardEventData) => void) | null = null
  private didHideCallback: ((data: KeyboardEventData) => void) | null = null

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.bridge.addEventListener('Keyboard.WillShow' as any, (data: KeyboardEventData) => {
      this.willShowCallback?.(data)
    })
    this.bridge.addEventListener('Keyboard.DidShow' as any, (data: KeyboardEventData) => {
      this.didShowCallback?.(data)
    })
    this.bridge.addEventListener('Keyboard.WillHide' as any, (data: KeyboardEventData) => {
      this.willHideCallback?.(data)
    })
    this.bridge.addEventListener('Keyboard.DidHide' as any, (data: KeyboardEventData) => {
      this.didHideCallback?.(data)
    })
  }

  /**
   * 显示键盘
   */
  async show(): Promise<void> {
    await this.bridge.send<void>('Keyboard.Show')
  }

  /**
   * 隐藏键盘
   */
  async hide(): Promise<void> {
    await this.bridge.send<void>('Keyboard.Hide')
  }

  /**
   * 获取键盘信息
   */
  async getInfo(): Promise<KeyboardInfo> {
    return this.bridge.send<KeyboardInfo>('Keyboard.GetInfo')
  }

  /**
   * 设置键盘附件栏可见性（iOS）
   */
  async setAccessoryBarVisible(visible: boolean): Promise<void> {
    await this.bridge.send<void>('Keyboard.SetAccessoryBarVisible', { visible })
  }

  /**
   * 设置键盘弹出时是否自动滚动
   */
  async setScroll(enabled: boolean): Promise<void> {
    await this.bridge.send<void>('Keyboard.SetScroll', { enabled })
  }

  /**
   * 设置键盘样式（iOS）
   */
  async setStyle(style: KeyboardStyle): Promise<void> {
    await this.bridge.send<void>('Keyboard.SetStyle', { style })
  }

  /**
   * 设置键盘弹出时视图调整模式（Android）
   */
  async setResizeMode(mode: KeyboardResizeMode): Promise<void> {
    await this.bridge.send<void>('Keyboard.SetResizeMode', { mode })
  }

  /**
   * 监听键盘即将显示事件
   */
  onWillShow(callback: (data: KeyboardEventData) => void): void {
    this.willShowCallback = callback
  }

  /**
   * 监听键盘已显示事件
   */
  onDidShow(callback: (data: KeyboardEventData) => void): void {
    this.didShowCallback = callback
  }

  /**
   * 监听键盘即将隐藏事件
   */
  onWillHide(callback: (data: KeyboardEventData) => void): void {
    this.willHideCallback = callback
  }

  /**
   * 监听键盘已隐藏事件
   */
  onDidHide(callback: (data: KeyboardEventData) => void): void {
    this.didHideCallback = callback
  }

  /**
   * 移除所有键盘事件监听
   */
  removeAllListeners(): void {
    this.willShowCallback = null
    this.didShowCallback = null
    this.willHideCallback = null
    this.didHideCallback = null
  }
}
