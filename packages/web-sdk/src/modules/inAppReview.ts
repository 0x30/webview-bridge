/**
 * InAppReview 模块 - 应用内评价
 * 
 * 提供应用内评价功能，支持 iOS App Store 和 Google Play Store
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 评价可用性结果
 */
export interface ReviewAvailability {
  /** 是否支持应用内评价 */
  isSupported: boolean;
  /** 不支持的原因（如果不支持） */
  reason?: string | null;
}

/**
 * 请求评价结果
 */
export interface RequestReviewResult {
  /** 是否成功发起请求 */
  requested: boolean;
  /** 附加信息 */
  message?: string | null;
}

/**
 * 打开应用商店评价页面的参数
 */
export interface OpenStoreReviewParams {
  /** 
   * iOS: App Store 应用 ID (数字字符串)
   * Android: 应用包名 (可选，默认使用当前应用包名)
   */
  appId?: string;
  /** 
   * Android 专用: 应用包名
   * 如果同时提供 appId 和 packageName，Android 优先使用 packageName
   */
  packageName?: string;
}

/**
 * 打开应用商店结果
 */
export interface OpenStoreReviewResult {
  /** 是否成功打开 */
  opened: boolean;
}

// =============================================================================
// InAppReview 模块实现
// =============================================================================

/**
 * InAppReview 模块
 * 
 * 提供应用内评价功能：
 * - 请求系统原生评价弹窗（iOS/Android）
 * - 检查评价功能可用性
 * - 跳转到应用商店评价页面
 * 
 * @example
 * ```typescript
 * import { Bridge } from '@aspect/webview-bridge';
 * 
 * // 请求应用内评价
 * const result = await Bridge.inAppReview.requestReview();
 * 
 * // 检查是否可用
 * const availability = await Bridge.inAppReview.isAvailable();
 * 
 * // 跳转到应用商店评价页面
 * await Bridge.inAppReview.openStoreReview({ appId: '123456789' });
 * ```
 */
export class InAppReviewModule implements BridgeModule {
  readonly moduleName = 'InAppReview';
  readonly methods = [
    'RequestReview',
    'IsAvailable',
    'OpenAppStoreReview'
  ] as const;
  
  constructor(private bridge: BridgeCore) {}

  // ===========================================================================
  // 公开方法
  // ===========================================================================

  /**
   * 请求应用内评价
   * 
   * 触发系统原生的应用内评价弹窗。
   * 
   * **重要说明：**
   * - iOS: 系统会根据自己的策略决定是否显示评价弹窗，每个应用每年最多显示 3 次
   * - Android: Google Play 会根据配额限制决定是否显示，开发者无法控制显示频率
   * - 即使调用成功，也不保证评价弹窗会显示
   * - API 不会返回用户是否真的提交了评价（这是为了防止开发者区别对待用户）
   * 
   * @returns 请求结果，requested 为 true 表示请求已发送（但不保证弹窗显示）
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await Bridge.inAppReview.requestReview();
   *   if (result.requested) {
   *     console.log('评价请求已发送');
   *   }
   * } catch (error) {
   *   console.error('请求评价失败:', error);
   * }
   * ```
   */
  async requestReview(): Promise<RequestReviewResult> {
    return this.bridge.send<RequestReviewResult>('InAppReview.RequestReview');
  }

  /**
   * 检查应用内评价是否可用
   * 
   * 检查当前设备/环境是否支持应用内评价功能。
   * 
   * **注意：**
   * - iOS: 从 iOS 10.3 开始支持，返回的 isSupported 通常为 true
   * - Android: 需要设备安装了 Google Play Store
   * 
   * @returns 可用性检查结果
   * 
   * @example
   * ```typescript
   * const availability = await Bridge.inAppReview.isAvailable();
   * if (availability.isSupported) {
   *   // 可以请求评价
   *   await Bridge.inAppReview.requestReview();
   * } else {
   *   console.log('不支持应用内评价:', availability.reason);
   *   // 可以跳转到应用商店
   *   await Bridge.inAppReview.openStoreReview({ appId: '123456789' });
   * }
   * ```
   */
  async isAvailable(): Promise<ReviewAvailability> {
    return this.bridge.send<ReviewAvailability>('InAppReview.IsAvailable');
  }

  /**
   * 打开应用商店评价页面
   * 
   * 直接跳转到应用商店（App Store/Google Play）的评价页面。
   * 这是一个备选方案，当应用内评价不可用或者想要直接引导用户时使用。
   * 
   * @param params 参数
   * @param params.appId iOS App Store 应用 ID 或 Android 包名
   * @param params.packageName Android 专用包名（可选）
   * 
   * @returns 是否成功打开
   * 
   * @example
   * ```typescript
   * // iOS
   * await Bridge.inAppReview.openStoreReview({ appId: '123456789' });
   * 
   * // Android（使用当前应用包名）
   * await Bridge.inAppReview.openStoreReview();
   * 
   * // Android（指定包名）
   * await Bridge.inAppReview.openStoreReview({ packageName: 'com.example.app' });
   * ```
   */
  async openStoreReview(params?: OpenStoreReviewParams): Promise<OpenStoreReviewResult> {
    return this.bridge.send<OpenStoreReviewResult>(
      'InAppReview.OpenAppStoreReview',
      (params || {}) as Record<string, unknown>
    );
  }
}
