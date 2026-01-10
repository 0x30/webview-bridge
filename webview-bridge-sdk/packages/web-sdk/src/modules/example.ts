/**
 * 示例扩展模块 - 演示如何扩展 WebView Bridge SDK
 *
 * 此模块展示了三方如何在不修改 SDK 源码的情况下
 * 扩展自定义能力
 */

import { BridgeCore } from '../core'

// =============================================================================
// 类型定义 - 每个模块应自包含类型
// =============================================================================

/**
 * 用户信息
 */
export interface UserInfo {
  /** 用户 ID */
  userId: string
  /** 用户名 */
  username: string
  /** 头像 URL */
  avatar?: string
  /** 邮箱 */
  email?: string
  /** 手机号 */
  phone?: string
  /** 扩展属性 */
  extra?: Record<string, unknown>
}

/**
 * 登录参数
 */
export interface LoginParams {
  /** 登录类型 */
  type: 'password' | 'sms' | 'oauth'
  /** 账号 */
  account?: string
  /** 密码 */
  password?: string
  /** 验证码 */
  code?: string
  /** OAuth 提供商 */
  provider?: 'wechat' | 'apple' | 'google'
}

/**
 * 登录结果
 */
export interface LoginResult {
  /** 是否成功 */
  success: boolean
  /** 用户信息 */
  user?: UserInfo
  /** 访问令牌 */
  token?: string
  /** 错误信息 */
  error?: string
}

/**
 * 分析事件参数
 */
export interface AnalyticsEventParams {
  /** 事件名称 */
  event: string
  /** 事件属性 */
  properties?: Record<string, unknown>
  /** 时间戳 */
  timestamp?: number
}

// =============================================================================
// 示例模块实现
// =============================================================================

/**
 * 用户模块 - 示例扩展
 *
 * 演示如何创建一个自定义模块来处理用户相关功能
 */
export class UserModule {
  readonly moduleName = 'User'
  readonly methods = [
    'GetCurrentUser',
    'Login',
    'Logout',
    'UpdateProfile',
  ] as const

  private bridge: BridgeCore

  constructor(bridge: BridgeCore) {
    this.bridge = bridge
  }

  /**
   * 获取当前登录用户信息
   */
  async getCurrentUser(): Promise<UserInfo | null> {
    return this.bridge.send<UserInfo | null>('User.GetCurrentUser')
  }

  /**
   * 登录
   */
  async login(params: LoginParams): Promise<LoginResult> {
    return this.bridge.send<LoginResult>('User.Login', params)
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    return this.bridge.send<void>('User.Logout')
  }

  /**
   * 更新用户资料
   */
  async updateProfile(profile: Partial<UserInfo>): Promise<UserInfo> {
    return this.bridge.send<UserInfo>('User.UpdateProfile', profile)
  }
}

/**
 * 分析模块 - 示例扩展
 *
 * 演示如何创建一个埋点/分析模块
 */
export class AnalyticsModule {
  readonly moduleName = 'Analytics'
  readonly methods = [
    'Track',
    'SetUserId',
    'SetUserProperties',
    'Flush',
  ] as const

  private bridge: BridgeCore

  constructor(bridge: BridgeCore) {
    this.bridge = bridge
  }

  /**
   * 记录事件
   */
  async track(params: AnalyticsEventParams): Promise<void> {
    return this.bridge.send<void>('Analytics.Track', {
      ...params,
      timestamp: params.timestamp ?? Date.now(),
    })
  }

  /**
   * 设置用户 ID
   */
  async setUserId(userId: string): Promise<void> {
    return this.bridge.send<void>('Analytics.SetUserId', { userId })
  }

  /**
   * 设置用户属性
   */
  async setUserProperties(properties: Record<string, unknown>): Promise<void> {
    return this.bridge.send<void>('Analytics.SetUserProperties', { properties })
  }

  /**
   * 立即发送所有缓存的事件
   */
  async flush(): Promise<void> {
    return this.bridge.send<void>('Analytics.Flush')
  }
}

// =============================================================================
// 模块注册示例
// =============================================================================

/**
 * 扩展 WebViewBridge 类以支持自定义模块
 *
 * @example
 * ```typescript
 * import { Bridge, BridgeCore } from '@aspect/webview-bridge'
 * import { UserModule, AnalyticsModule } from '@aspect/webview-bridge/modules/example'
 *
 * // 获取核心实例
 * const core = BridgeCore.getInstance()
 *
 * // 创建并注册扩展模块
 * const userModule = new UserModule(core)
 * const analyticsModule = new AnalyticsModule(core)
 *
 * // 使用模块
 * const user = await userModule.getCurrentUser()
 * await analyticsModule.track({ event: 'page_view', properties: { page: 'home' } })
 * ```
 */
export function createExtendedBridge(core: BridgeCore) {
  return {
    user: new UserModule(core),
    analytics: new AnalyticsModule(core),
  }
}
