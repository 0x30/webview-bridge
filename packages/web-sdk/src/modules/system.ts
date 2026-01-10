/**
 * System 模块 - 系统级跳转与功能
 *
 * 提供打开 URL、系统分享、应用跳转等能力
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 打开 URL 结果
 */
export type OpenURLResult =
  | 'success' // 成功打开
  | 'notSupported' // URL scheme 不支持
  | 'blocked' // 被系统拦截
  | 'failed' // 打开失败

/**
 * 打开 URL 响应
 */
export interface OpenURLResponse {
  /** 操作结果 */
  result: OpenURLResult
  /** 错误信息（如果失败） */
  error?: string
}

/**
 * 检查 URL 是否可打开的结果
 */
export interface CanOpenURLResult {
  /** 请求的 URL */
  url: string
  /** 是否可以打开 */
  canOpen: boolean
}

/**
 * 分享内容类型
 */
export type ShareContentType =
  | 'text' // 纯文本
  | 'url' // URL 链接
  | 'image' // 图片
  | 'file' // 文件

/**
 * 分享内容
 */
export interface ShareContent {
  /** 内容类型 */
  type: ShareContentType
  /** 文本内容 */
  text?: string
  /** URL */
  url?: string
  /** 标题 */
  title?: string
  /** 图片 Base64（如果类型为 image） */
  imageBase64?: string
  /** 图片 URL（如果类型为 image） */
  imageUrl?: string
  /** 文件路径（如果类型为 file） */
  filePath?: string
  /** 文件 MIME 类型 */
  mimeType?: string
}

/**
 * 分享结果
 */
export interface ShareResult {
  /** 是否成功分享 */
  success: boolean
  /** 用户选择的分享应用（如果可获取） */
  activityType?: string
  /** 是否取消 */
  cancelled: boolean
}

/**
 * 外观模式
 */
export type AppearanceMode =
  | 'light' // 浅色模式
  | 'dark' // 深色模式
  | 'system' // 跟随系统

/**
 * 系统信息
 */
export interface SystemInfo {
  /** 当前外观模式 */
  appearance: 'light' | 'dark'
  /** 系统字体缩放比例 */
  fontScale: number
  /** 是否开启粗体文字（辅助功能） */
  isBoldTextEnabled: boolean
  /** 是否开启减弱动态效果（辅助功能） */
  isReduceMotionEnabled: boolean
  /** 是否开启增强对比度（辅助功能） */
  isHighContrastEnabled: boolean
  /** 当前语言 */
  language: string
  /** 当前地区 */
  region: string
  /** 日历类型 */
  calendar: string
  /** 是否 24 小时制 */
  is24HourTime: boolean
}

/**
 * 跳转应用商店参数
 */
export interface OpenAppStoreParams {
  /** App Store ID (iOS) */
  appStoreId?: string
  /** 包名 (Android) */
  packageName?: string
  /** 是否跳转到评价页面 */
  writeReview?: boolean
}

// =============================================================================
// System 模块实现
// =============================================================================

export class SystemModule implements BridgeModule {
  readonly moduleName = 'System'
  readonly methods = [
    'OpenURL',
    'CanOpenURL',
    'Share',
    'GetInfo',
    'SetAppearance',
    'OpenSettings',
    'OpenAppStore',
    'GetColorScheme',
  ] as const

  constructor(private bridge: BridgeCore) {}

  /**
   * 打开指定 URL
   * 支持 tel: / sms: / mailto: / https: 等协议
   * @param url 要打开的 URL
   * @returns 打开结果
   */
  async openURL(url: string): Promise<OpenURLResponse> {
    return this.bridge.send<OpenURLResponse>('System.OpenURL', { url })
  }

  /**
   * 检查指定 URL 是否可以被系统处理
   * @param url 要检查的 URL
   * @returns 检查结果
   */
  async canOpenURL(url: string): Promise<CanOpenURLResult> {
    return this.bridge.send<CanOpenURLResult>('System.CanOpenURL', { url })
  }

  /**
   * 调用系统分享
   * @param content 分享内容
   * @returns 分享结果
   */
  async share(content: ShareContent): Promise<ShareResult> {
    return this.bridge.send<ShareResult>('System.Share', content)
  }

  /**
   * 获取系统信息
   * @returns 系统信息
   */
  async getInfo(): Promise<SystemInfo> {
    return this.bridge.send<SystemInfo>('System.GetInfo')
  }

  /**
   * 设置应用外观模式
   * @param mode 外观模式
   */
  async setAppearance(mode: AppearanceMode): Promise<void> {
    return this.bridge.send<void>('System.SetAppearance', { mode })
  }

  /**
   * 打开系统设置页面
   * @param section 设置项（可选，如 wifi, bluetooth 等）
   */
  async openSettings(section?: string): Promise<void> {
    return this.bridge.send<void>('System.OpenSettings', { section })
  }

  /**
   * 跳转到应用商店
   * @param params 跳转参数
   */
  async openAppStore(params?: OpenAppStoreParams): Promise<OpenURLResponse> {
    return this.bridge.send<OpenURLResponse>(
      'System.OpenAppStore',
      params ?? {}
    )
  }

  /**
   * 获取当前颜色方案
   */
  async getColorScheme(): Promise<{ colorScheme: 'light' | 'dark' }> {
    return this.bridge.send<{ colorScheme: 'light' | 'dark' }>(
      'System.GetColorScheme'
    )
  }

  // =========== 便捷方法 ===========

  /**
   * 拨打电话
   * @param phoneNumber 电话号码
   */
  async call(phoneNumber: string): Promise<OpenURLResponse> {
    return this.openURL(`tel:${phoneNumber}`)
  }

  /**
   * 发送短信
   * @param phoneNumber 电话号码
   * @param body 短信内容（可选）
   */
  async sendSMS(phoneNumber: string, body?: string): Promise<OpenURLResponse> {
    let url = `sms:${phoneNumber}`
    if (body) {
      url += `&body=${encodeURIComponent(body)}`
    }
    return this.openURL(url)
  }

  /**
   * 发送邮件
   * @param email 邮箱地址
   * @param subject 邮件主题（可选）
   * @param body 邮件内容（可选）
   */
  async sendEmail(
    email: string,
    subject?: string,
    body?: string
  ): Promise<OpenURLResponse> {
    let url = `mailto:${email}`
    const params: string[] = []
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
    if (body) params.push(`body=${encodeURIComponent(body)}`)
    if (params.length > 0) {
      url += `?${params.join('&')}`
    }
    return this.openURL(url)
  }
}
