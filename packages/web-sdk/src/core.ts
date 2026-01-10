/**
 * WebView Bridge SDK - 核心 Bridge 实现
 *
 * 处理通信协议、回调管理、事件系统
 * 所有 Native 通信均通过此核心类进行
 */

import {
  BridgeConfig,
  BridgeRequest,
  BridgeResponse,
  BridgeEvent,
  BridgeError,
  ErrorCodes,
  PendingCallback,
  EventHandler,
  PROTOCOL_VERSION,
  BridgeLogger,
} from './types'

// 默认配置
const DEFAULT_CONFIG: Required<BridgeConfig> = {
  debug: false,
  timeout: 30000,
  logger: {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  },
}

// 全局类型声明，用于 Native Bridge 接口
declare global {
  interface Window {
    /** iOS WKWebView 消息处理器 */
    webkit?: {
      messageHandlers?: {
        bridge?: {
          postMessage: (message: string) => void
        }
      }
    }
    /** Android WebView JS 接口 */
    AndroidBridge?: {
      postMessage: (message: string) => void
    }
    /** 通用 Native Bridge 接口（推荐使用） */
    NativeBridge?: {
      postMessage: (message: string) => void
    }
    /** Native 调用的响应回调函数 */
    __bridgeCallback?: (responseJson: string) => void
    /** Native 调用的事件回调函数 */
    __bridgeEvent?: (eventJson: string) => void
  }
}

/**
 * 核心 Bridge 类 - 管理所有与 Native 的通信
 */
export class BridgeCore {
  private static instance: BridgeCore | null = null

  private config: Required<BridgeConfig>
  private pendingCallbacks: Map<string, PendingCallback> = new Map()
  private eventListeners: Map<string, Set<EventHandler>> = new Map()
  private isReady: boolean = false
  private readyPromise: Promise<void>
  private readyResolve!: () => void
  private isDestroyed: boolean = false

  private constructor(config: BridgeConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 创建 ready Promise
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })

    // 设置全局回调
    this.setupGlobalCallbacks()

    // 检查是否已在 Native 环境中
    this.checkNativeEnvironment()
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: BridgeConfig): BridgeCore {
    if (!BridgeCore.instance) {
      BridgeCore.instance = new BridgeCore(config)
    }
    return BridgeCore.instance
  }

  /**
   * 重置实例（用于测试）
   */
  static resetInstance(): void {
    if (BridgeCore.instance) {
      BridgeCore.instance.destroy()
      BridgeCore.instance = null
    }
  }

  /**
   * 获取日志器
   */
  private get logger(): BridgeLogger {
    return this.config.logger
  }

  /**
   * 输出调试日志
   */
  private debug(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      this.logger.log(`[Bridge] ${message}`, ...args)
    }
  }

  /**
   * 设置全局回调函数，供 Native 调用
   */
  private setupGlobalCallbacks(): void {
    // 响应回调
    window.__bridgeCallback = (responseJson: string) => {
      this.handleNativeResponse(responseJson)
    }

    // 事件回调
    window.__bridgeEvent = (eventJson: string) => {
      this.handleNativeEvent(eventJson)
    }
  }

  /**
   * 检查是否运行在 Native WebView 环境中
   */
  private checkNativeEnvironment(): void {
    // iOS 检查
    if (window.webkit?.messageHandlers?.bridge) {
      this.markReady()
      return
    }

    // Android 检查（支持两种接口名）
    if (window.NativeBridge || window.AndroidBridge) {
      this.markReady()
      return
    }

    // 等待可能的延迟注入
    setTimeout(() => {
      if (window.webkit?.messageHandlers?.bridge || window.NativeBridge || window.AndroidBridge) {
        this.markReady()
      }
    }, 100)
  }

  /**
   * 标记 Bridge 已就绪
   */
  markReady(): void {
    if (!this.isReady) {
      this.isReady = true
      this.readyResolve()
      this.debug('Bridge 已就绪')
    }
  }

  /**
   * 等待 Bridge 就绪
   */
  async whenReady(): Promise<void> {
    return this.readyPromise
  }

  /**
   * 检查 Bridge 是否就绪
   */
  getIsReady(): boolean {
    return this.isReady
  }

  /**
   * 检查是否运行在 Native 环境
   */
  isNativeEnvironment(): boolean {
    return !!(window.webkit?.messageHandlers?.bridge || window.NativeBridge || window.AndroidBridge)
  }

  /**
   * 生成唯一回调 ID
   */
  private generateCallbackId(): string {
    return `cb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * 发送请求到 Native
   * @param type 能力标识（Module.Method）
   * @param params 请求参数
   * @param options 选项
   * @returns Promise 响应数据
   */
  async send<T = unknown>(
    type: string,
    params: Record<string, unknown> = {},
    options: { timeout?: number } = {}
  ): Promise<T> {
    // 检查是否已销毁
    if (this.isDestroyed) {
      throw new BridgeError(ErrorCodes.WEBVIEW_DESTROYED, 'Bridge 已被销毁')
    }

    // 检查是否就绪
    if (!this.isReady) {
      throw BridgeError.notReady()
    }

    // 检查是否在 Native 环境
    if (!this.isNativeEnvironment()) {
      throw BridgeError.notSupported(type)
    }

    const callbackId = this.generateCallbackId()
    const timeout = options.timeout ?? this.config.timeout

    const request: BridgeRequest = {
      version: PROTOCOL_VERSION,
      type,
      params,
      callbackId,
    }

    this.debug('发送请求:', request)

    return new Promise<T>((resolve, reject) => {
      // 设置超时
      const timeoutHandle = setTimeout(() => {
        const pending = this.pendingCallbacks.get(callbackId)
        if (pending) {
          this.pendingCallbacks.delete(callbackId)
          this.debug('请求超时:', callbackId)
          reject(BridgeError.timeout())
        }
      }, timeout)

      // 存储待处理回调
      this.pendingCallbacks.set(callbackId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutHandle,
        timestamp: Date.now(),
      })

      // 发送到 Native
      try {
        this.postToNative(JSON.stringify(request))
      } catch (error) {
        this.pendingCallbacks.delete(callbackId)
        clearTimeout(timeoutHandle)
        reject(new BridgeError(ErrorCodes.INTERNAL_ERROR, `发送失败: ${error}`))
      }
    })
  }

  /**
   * 发送消息到 Native 层
   */
  private postToNative(message: string): void {
    // 尝试 iOS
    if (window.webkit?.messageHandlers?.bridge) {
      window.webkit.messageHandlers.bridge.postMessage(message)
      return
    }

    // 尝试 Android (NativeBridge 是新接口名，AndroidBridge 是旧接口名，向后兼容)
    if (window.NativeBridge) {
      window.NativeBridge.postMessage(message)
      return
    }
    
    if (window.AndroidBridge) {
      window.AndroidBridge.postMessage(message)
      return
    }

    throw new Error('没有可用的 Native Bridge')
  }

  /**
   * 处理来自 Native 的响应
   */
  private handleNativeResponse(responseJson: string): void {
    this.debug('收到响应:', responseJson)

    let response: BridgeResponse
    try {
      response = JSON.parse(responseJson)
    } catch (error) {
      this.logger.error('[Bridge] 无效的响应 JSON:', responseJson)
      return
    }

    const { callbackId } = response
    const pending = this.pendingCallbacks.get(callbackId)

    if (!pending) {
      // 响应在超时后到达或已被处理
      this.debug('找不到对应的待处理回调:', callbackId)
      return
    }

    // 清除超时并移除回调
    clearTimeout(pending.timeout)
    this.pendingCallbacks.delete(callbackId)

    // 根据错误码 resolve 或 reject
    if (response.code === ErrorCodes.SUCCESS) {
      pending.resolve(response.data)
    } else {
      pending.reject(BridgeError.fromResponse(response))
    }
  }

  /**
   * 处理来自 Native 的事件
   */
  private handleNativeEvent(eventJson: string): void {
    if (this.isDestroyed) {
      this.debug('忽略事件 - Bridge 已销毁')
      return
    }

    this.debug('收到事件:', eventJson)

    let event: BridgeEvent
    try {
      event = JSON.parse(eventJson)
    } catch (error) {
      this.logger.error('[Bridge] 无效的事件 JSON:', eventJson)
      return
    }

    this.dispatchEvent(event.event, event.data)
  }

  /**
   * 派发事件到监听器
   */
  private dispatchEvent(eventName: string, data: unknown): void {
    const listeners = this.eventListeners.get(eventName)
    if (!listeners || listeners.size === 0) {
      this.debug('没有该事件的监听器:', eventName)
      return
    }

    // 按顺序派发给所有监听器
    listeners.forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        this.logger.error(`[Bridge] 事件处理器错误 ${eventName}:`, error)
      }
    })
  }

  /**
   * 添加事件监听器
   * @param eventName 事件名称
   * @param handler 处理函数
   */
  addEventListener<T = unknown>(
    eventName: string,
    handler: EventHandler<T>
  ): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set())
    }
    this.eventListeners.get(eventName)!.add(handler as EventHandler)
    this.debug('添加监听器:', eventName)
  }

  /**
   * 移除事件监听器
   * @param eventName 事件名称
   * @param handler 处理函数
   */
  removeEventListener<T = unknown>(
    eventName: string,
    handler: EventHandler<T>
  ): void {
    const listeners = this.eventListeners.get(eventName)
    if (listeners) {
      listeners.delete(handler as EventHandler)
      this.debug('移除监听器:', eventName)
    }
  }

  /**
   * 清空所有待处理回调（例如页面 reload 时）
   */
  clearPendingCallbacks(): void {
    this.pendingCallbacks.forEach((pending, callbackId) => {
      clearTimeout(pending.timeout)
      pending.reject(new BridgeError(ErrorCodes.CANCELLED, '回调已清理'))
    })
    this.pendingCallbacks.clear()
    this.debug('已清空所有待处理回调')
  }

  /**
   * 销毁 Bridge 实例
   */
  destroy(): void {
    this.isDestroyed = true
    this.clearPendingCallbacks()
    this.eventListeners.clear()
    window.__bridgeCallback = undefined
    window.__bridgeEvent = undefined
    this.debug('Bridge 已销毁')
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): {
    isReady: boolean
    isNative: boolean
    pendingCount: number
    listenerCount: number
  } {
    return {
      isReady: this.isReady,
      isNative: this.isNativeEnvironment(),
      pendingCount: this.pendingCallbacks.size,
      listenerCount: Array.from(this.eventListeners.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
    }
  }
}
