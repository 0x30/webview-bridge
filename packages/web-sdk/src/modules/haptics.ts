/**
 * Haptics 模块 - 设备震动与触觉反馈
 * 
 * 提供震动、触觉反馈等能力
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 触觉反馈强度
 */
export type ImpactStyle = 
  | 'light'   // 轻度
  | 'medium'  // 中度
  | 'heavy'   // 重度
  | 'soft'    // 柔和 (iOS 13+)
  | 'rigid';  // 刚硬 (iOS 13+)

/**
 * 通知反馈类型
 */
export type NotificationFeedbackType = 
  | 'success'  // 成功
  | 'warning'  // 警告
  | 'error';   // 错误

/**
 * 选择反馈（如滚动选择器）
 */
export type SelectionFeedbackType = 'selection';

/**
 * 震动模式项
 * 正数表示震动持续时间（毫秒）
 * 负数表示暂停时间（毫秒的绝对值）
 */
export type VibrationPattern = number[];

/**
 * 震动选项
 */
export interface VibrateOptions {
  /** 震动持续时间（毫秒），默认 100ms */
  duration?: number;
  /** 震动模式（用于复杂震动序列） */
  pattern?: VibrationPattern;
  /** 重复次数（-1 表示无限重复，0 表示不重复） */
  repeat?: number;
  /** 震动强度（0-255，Android 支持） */
  amplitude?: number;
}

/**
 * 触觉引擎能力
 */
export interface HapticsCapabilities {
  /** 是否支持触觉反馈 */
  isSupported: boolean;
  /** 是否支持 Impact 反馈 */
  supportsImpact: boolean;
  /** 是否支持 Notification 反馈 */
  supportsNotification: boolean;
  /** 是否支持 Selection 反馈 */
  supportsSelection: boolean;
  /** 是否支持自定义震动模式 */
  supportsCustomPattern: boolean;
  /** 是否支持强度控制 */
  supportsAmplitudeControl: boolean;
}

// =============================================================================
// Haptics 模块实现
// =============================================================================

export class HapticsModule implements BridgeModule {
  readonly moduleName = 'Haptics';
  readonly methods = [
    'Vibrate',
    'Impact',
    'Notification',
    'Selection',
    'Cancel',
    'GetCapabilities'
  ] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 触发标准震动
   * @param options 震动选项
   */
  async vibrate(options?: VibrateOptions): Promise<void> {
    return this.bridge.send<void>('Haptics.Vibrate', (options || {}) as Record<string, unknown>);
  }

  /**
   * 触发 Impact 触觉反馈
   * @param style 反馈强度，默认 medium
   */
  async impact(style: ImpactStyle = 'medium'): Promise<void> {
    return this.bridge.send<void>('Haptics.Impact', { style });
  }

  /**
   * 触发通知类型的触觉反馈
   * @param type 通知类型
   */
  async notification(type: NotificationFeedbackType): Promise<void> {
    return this.bridge.send<void>('Haptics.Notification', { type });
  }

  /**
   * 触发选择变化的触觉反馈（如滚动选择器）
   */
  async selection(): Promise<void> {
    return this.bridge.send<void>('Haptics.Selection');
  }

  /**
   * 取消正在进行的震动
   */
  async cancel(): Promise<void> {
    return this.bridge.send<void>('Haptics.Cancel');
  }

  /**
   * 获取触觉引擎能力信息
   * @returns 能力信息
   */
  async getCapabilities(): Promise<HapticsCapabilities> {
    return this.bridge.send<HapticsCapabilities>('Haptics.GetCapabilities');
  }
}
