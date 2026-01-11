/**
 * Browser 模块 - 应用内浏览器
 *
 * 提供应用内浏览器功能（Safari View Controller / Chrome Custom Tabs）
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

/** 呈现样式（iOS） */
export type PresentationStyle = 'fullScreen' | 'popover' | 'pageSheet' | 'formSheet'

/** 打开浏览器选项 */
export interface BrowserOpenOptions {
  /** 要打开的 URL */
  url: string
  /** 工具栏颜色（十六进制，如 #FF0000） */
  toolbarColor?: string
  /** 是否显示标题 */
  showTitle?: boolean
  /** 呈现样式（iOS） */
  presentationStyle?: PresentationStyle
  /** 分享状态（Android） */
  shareState?: 'default' | 'on' | 'off'
}

/** 预加载选项 */
export interface BrowserPrefetchOptions {
  /** 要预加载的 URL 列表 */
  urls: string[]
}

/** 打开结果 */
export interface BrowserOpenResult {
  opened: boolean
  fallback?: boolean
}

/** 关闭结果 */
export interface BrowserCloseResult {
  closed: boolean
  reason?: string
}

/** 预加载结果 */
export interface BrowserPrefetchResult {
  prefetched: boolean
  count: number
}

/** 浏览器事件数据 */
export interface BrowserEventData {
  url?: string
  fallback?: boolean
}

// MARK: - Browser 模块类

export class BrowserModule implements BridgeModule {
  readonly moduleName = 'Browser'
  readonly methods = [
    'Open',
    'Close',
    'Prefetch',
  ] as const

  private openedCallback: ((data: BrowserEventData) => void) | null = null
  private closedCallback: (() => void) | null = null
  private pageLoadedCallback: ((data: BrowserEventData) => void) | null = null

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.bridge.addEventListener('Browser.Opened' as any, (data: BrowserEventData) => {
      this.openedCallback?.(data)
    })
    this.bridge.addEventListener('Browser.Closed' as any, () => {
      this.closedCallback?.()
    })
    this.bridge.addEventListener('Browser.PageLoaded' as any, (data: BrowserEventData) => {
      this.pageLoadedCallback?.(data)
    })
  }

  /**
   * 在应用内浏览器中打开 URL
   * 
   * iOS 使用 SFSafariViewController
   * Android 使用 Chrome Custom Tabs
   * 
   * @example
   * ```ts
   * await browser.open({ 
   *   url: 'https://example.com',
   *   toolbarColor: '#3880ff'
   * })
   * ```
   */
  async open(options: BrowserOpenOptions): Promise<BrowserOpenResult> {
    return this.bridge.send<BrowserOpenResult>('Browser.Open', options as unknown as Record<string, unknown>)
  }

  /**
   * 关闭应用内浏览器
   * 
   * 注意：Android Chrome Custom Tabs 不支持程序化关闭
   */
  async close(): Promise<BrowserCloseResult> {
    return this.bridge.send<BrowserCloseResult>('Browser.Close')
  }

  /**
   * 预加载 URL
   * 
   * 预热浏览器并预加载 URL，加快后续打开速度
   */
  async prefetch(urls: string[]): Promise<BrowserPrefetchResult> {
    return this.bridge.send<BrowserPrefetchResult>('Browser.Prefetch', { urls })
  }

  /**
   * 监听浏览器打开事件
   */
  onOpened(callback: (data: BrowserEventData) => void): void {
    this.openedCallback = callback
  }

  /**
   * 监听浏览器关闭事件
   */
  onClosed(callback: () => void): void {
    this.closedCallback = callback
  }

  /**
   * 监听页面加载完成事件
   */
  onPageLoaded(callback: (data: BrowserEventData) => void): void {
    this.pageLoadedCallback = callback
  }

  /**
   * 移除所有浏览器事件监听
   */
  removeAllListeners(): void {
    this.openedCallback = null
    this.closedCallback = null
    this.pageLoadedCallback = null
  }
}
