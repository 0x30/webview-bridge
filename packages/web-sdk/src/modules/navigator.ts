/**
 * Navigator 模块 - 页面栈管理（类似小程序）
 *
 * 提供多 WebView 页面栈管理，支持页面间通信
 * 
 * 功能：
 * - Push: 在当前页面上打开新的 WebView 页面
 * - Pop: 关闭当前页面，返回上一个页面
 * - PostMessage: 向其他页面发送消息
 * - GetPages: 获取页面栈信息
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

/** 页面信息 */
export interface PageInfo {
  /** 页面唯一ID */
  id: string
  /** 页面URL */
  url: string
  /** 页面标题 */
  title?: string
  /** 在栈中的索引 */
  index: number
  /** 创建时间戳 */
  createdAt: number
}

/** Push 选项 */
export interface PushOptions {
  /** 要打开的URL（可以是相对路径或绝对路径） */
  url: string
  /** 页面标题（显示在导航栏） */
  title?: string
  /** 传递给新页面的数据 */
  data?: Record<string, unknown>
  /** 是否使用动画，默认 true */
  animated?: boolean
  /** 是否隐藏导航栏（iOS only），默认 false */
  navigationBarHidden?: boolean
}

/** Pop 选项 */
export interface PopOptions {
  /** 返回给上一个页面的数据 */
  result?: Record<string, unknown>
  /** 返回几层，默认 1 */
  delta?: number
  /** 是否使用动画，默认 true */
  animated?: boolean
}

/** Replace 选项 */
export interface ReplaceOptions {
  /** 要替换成的URL */
  url: string
  /** 页面标题 */
  title?: string
  /** 传递给新页面的数据 */
  data?: Record<string, unknown>
}

/** 消息发送选项 */
export interface PostMessageOptions {
  /** 目标页面ID（不传则广播给所有其他页面） */
  targetPageId?: string
  /** 消息内容 */
  message: Record<string, unknown>
}

/** 页面创建事件数据 */
export interface PageCreatedEventData {
  page: PageInfo
  data?: Record<string, unknown>
}

/** 页面消息事件数据 */
export interface PageMessageEventData {
  from: PageInfo
  message: Record<string, unknown>
}

/** 页面返回结果事件数据 */
export interface PageResultEventData {
  from: PageInfo
  result: Record<string, unknown>
}

/** 获取页面栈结果 */
export interface GetPagesResult {
  pages: PageInfo[]
  count: number
}

/** 操作结果 */
export interface NavigatorResult {
  popped?: boolean
  sent?: boolean
  set?: boolean
  reason?: string
}

// MARK: - Navigator 模块类

export class NavigatorModule implements BridgeModule {
  readonly moduleName = 'Navigator'
  readonly methods = [
    'Push',
    'Pop',
    'PopToRoot',
    'Replace',
    'PostMessage',
    'GetPages',
    'GetCurrentPage',
    'SetTitle',
    'Close',
  ] as const

  private pageCreatedCallback: ((data: PageCreatedEventData) => void) | null = null
  private pageDestroyedCallback: ((page: PageInfo) => void) | null = null
  private messageCallback: ((data: PageMessageEventData) => void) | null = null
  private resultCallback: ((data: PageResultEventData) => void) | null = null
  private launchDataCallback: ((data: Record<string, unknown>) => void) | null = null
  private pageOpenedCallback: ((page: PageInfo) => void) | null = null

  /** 当前页面接收到的启动数据 */
  private _launchData: Record<string, unknown> | null = null

  /** 当前页面信息（由 Native 设置） */
  private _currentPage: PageInfo | null = null

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // 页面创建事件
    this.bridge.addEventListener('Navigator.PageCreated' as any, (data: PageCreatedEventData) => {
      this._currentPage = data.page
      this._launchData = data.data || null
      this.pageCreatedCallback?.(data)
    })

    // 页面销毁事件
    this.bridge.addEventListener('Navigator.PageDestroyed' as any, (data: PageInfo) => {
      this.pageDestroyedCallback?.(data)
    })

    // 消息事件
    this.bridge.addEventListener('Navigator.Message' as any, (data: PageMessageEventData) => {
      this.messageCallback?.(data)
    })

    // 返回结果事件
    this.bridge.addEventListener('Navigator.Result' as any, (data: PageResultEventData) => {
      this.resultCallback?.(data)
    })

    // 启动数据事件
    this.bridge.addEventListener('Navigator.LaunchData' as any, (data: Record<string, unknown>) => {
      this._launchData = data
      this.launchDataCallback?.(data)
    })

    // 页面打开事件（当前页面 push 了新页面）
    this.bridge.addEventListener('Navigator.PageOpened' as any, (data: PageInfo) => {
      this.pageOpenedCallback?.(data)
    })
  }

  // MARK: - 属性

  /**
   * 获取当前页面接收到的启动数据
   * 
   * 这是通过 push 方法传递给当前页面的数据
   */
  get launchData(): Record<string, unknown> | null {
    return this._launchData
  }

  /**
   * 获取当前页面信息
   */
  get currentPage(): PageInfo | null {
    return this._currentPage
  }

  // MARK: - 页面导航方法

  /**
   * 打开新页面
   * 
   * 在当前页面上方打开一个新的 WebView 页面
   * 
   * @example
   * ```ts
   * // 打开新页面
   * const page = await navigator.push({
   *   url: 'https://example.com/page2',
   *   title: '第二页',
   *   data: { userId: 123 }
   * })
   * 
   * // 打开自身（自举）
   * await navigator.push({
   *   url: window.location.href,
   *   title: '新实例'
   * })
   * ```
   */
  async push(options: PushOptions): Promise<PageInfo> {
    return this.bridge.send<PageInfo>('Navigator.Push', options as unknown as Record<string, unknown>)
  }

  /**
   * 关闭当前页面
   * 
   * 返回上一个页面，可以携带返回数据
   * 
   * @example
   * ```ts
   * // 简单返回
   * await navigator.pop()
   * 
   * // 携带返回数据
   * await navigator.pop({
   *   result: { selectedId: 456 }
   * })
   * 
   * // 返回多层
   * await navigator.pop({ delta: 2 })
   * ```
   */
  async pop(options?: PopOptions): Promise<NavigatorResult> {
    return this.bridge.send<NavigatorResult>('Navigator.Pop', (options || {}) as Record<string, unknown>)
  }

  /**
   * 关闭当前页面
   * 
   * 和 pop()相同，但语义更明确，仅关闭当前页面
   * 
   * @example
   * ```ts
   * // 关闭当前页面
   * await navigator.close()
   * 
   * // 关闭并返回数据
   * await navigator.close({
   *   result: { success: true }
   * })
   * ```
   */
  async close(options?: { result?: Record<string, unknown>, animated?: boolean }): Promise<NavigatorResult> {
    return this.bridge.send<NavigatorResult>('Navigator.Close', (options || {}) as Record<string, unknown>)
  }

  /**
   * 返回到根页面
   * 
   * 关闭所有页面，只保留第一个页面
   */
  async popToRoot(animated = true): Promise<NavigatorResult> {
    return this.bridge.send<NavigatorResult>('Navigator.PopToRoot', { animated })
  }

  /**
   * 替换当前页面
   * 
   * 用新页面替换当前页面（不会增加页面栈）
   */
  async replace(options: ReplaceOptions): Promise<PageInfo> {
    return this.bridge.send<PageInfo>('Navigator.Replace', options as unknown as Record<string, unknown>)
  }

  // MARK: - 页面通信方法

  /**
   * 向其他页面发送消息
   * 
   * @example
   * ```ts
   * // 发送给指定页面
   * await navigator.postMessage({
   *   targetPageId: 'page_1',
   *   message: { action: 'refresh' }
   * })
   * 
   * // 广播给所有其他页面
   * await navigator.postMessage({
   *   message: { action: 'logout' }
   * })
   * ```
   */
  async postMessage(options: PostMessageOptions): Promise<NavigatorResult> {
    return this.bridge.send<NavigatorResult>('Navigator.PostMessage', options as unknown as Record<string, unknown>)
  }

  /**
   * 发送消息给上一个页面
   * 
   * 便捷方法，向前一个页面发送消息
   */
  async postMessageToPrevious(message: Record<string, unknown>): Promise<NavigatorResult> {
    const pages = await this.getPages()
    if (pages.count < 2) {
      return { sent: false, reason: '没有上一个页面' }
    }
    const previousPage = pages.pages[pages.count - 2]
    return this.postMessage({
      targetPageId: previousPage.id,
      message
    })
  }

  /**
   * 广播消息给所有其他页面
   */
  async broadcast(message: Record<string, unknown>): Promise<NavigatorResult> {
    return this.postMessage({ message })
  }

  // MARK: - 页面栈信息方法

  /**
   * 获取页面栈信息
   */
  async getPages(): Promise<GetPagesResult> {
    return this.bridge.send<GetPagesResult>('Navigator.GetPages')
  }

  /**
   * 获取当前页面信息
   */
  async getCurrentPage(): Promise<PageInfo> {
    return this.bridge.send<PageInfo>('Navigator.GetCurrentPage')
  }

  /**
   * 设置当前页面标题
   */
  async setTitle(title: string): Promise<NavigatorResult> {
    return this.bridge.send<NavigatorResult>('Navigator.SetTitle', { title })
  }

  // MARK: - 事件监听

  /**
   * 监听页面创建事件
   * 
   * 当前页面被创建时触发（包含启动数据）
   */
  onPageCreated(callback: (data: PageCreatedEventData) => void): void {
    this.pageCreatedCallback = callback
    // 如果已有数据，立即触发
    if (this._currentPage) {
      callback({ page: this._currentPage, data: this._launchData || undefined })
    }
  }

  /**
   * 监听页面销毁事件
   */
  onPageDestroyed(callback: (page: PageInfo) => void): void {
    this.pageDestroyedCallback = callback
  }

  /**
   * 监听来自其他页面的消息
   * 
   * @example
   * ```ts
   * navigator.onMessage((data) => {
   *   console.log('收到消息:', data.message)
   *   console.log('来自页面:', data.from.id)
   * })
   * ```
   */
  onMessage(callback: (data: PageMessageEventData) => void): void {
    this.messageCallback = callback
  }

  /**
   * 监听页面返回结果
   * 
   * 当子页面 pop 并携带数据时触发
   * 
   * @example
   * ```ts
   * navigator.onResult((data) => {
   *   console.log('收到返回数据:', data.result)
   * })
   * ```
   */
  onResult(callback: (data: PageResultEventData) => void): void {
    this.resultCallback = callback
  }

  /**
   * 监听启动数据
   * 
   * 当页面被 push 时接收传递的数据
   */
  onLaunchData(callback: (data: Record<string, unknown>) => void): void {
    this.launchDataCallback = callback
    // 如果已有数据，立即触发
    if (this._launchData) {
      callback(this._launchData)
    }
  }

  /**
   * 监听页面打开事件
   * 
   * 当当前页面 push 了新页面时触发
   */
  onPageOpened(callback: (page: PageInfo) => void): void {
    this.pageOpenedCallback = callback
  }

  /**
   * 移除所有事件监听
   */
  removeAllListeners(): void {
    this.pageCreatedCallback = null
    this.pageDestroyedCallback = null
    this.messageCallback = null
    this.resultCallback = null
    this.launchDataCallback = null
    this.pageOpenedCallback = null
  }
}
