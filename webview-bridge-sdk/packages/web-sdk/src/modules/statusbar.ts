/**
 * StatusBar 模块 - 系统状态栏控制
 * 
 * 控制状态栏样式、可见性等
 * 宿主应用可自行决定是否支持
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 状态栏内容样式
 */
export type StatusBarStyle = 
  | 'light'   // 浅色内容（适用于深色背景）
  | 'dark';   // 深色内容（适用于浅色背景）

/**
 * 状态栏动画类型
 */
export type StatusBarAnimation = 
  | 'none'    // 无动画
  | 'fade'    // 淡入淡出
  | 'slide';  // 滑动

/**
 * 设置状态栏样式参数
 */
export interface SetStatusBarStyleParams {
  /** 状态栏内容样式 */
  style: StatusBarStyle;
  /** 动画类型 */
  animation?: StatusBarAnimation;
}

/**
 * 设置状态栏可见性参数
 */
export interface SetStatusBarVisibilityParams {
  /** 是否可见 */
  visible: boolean;
  /** 动画类型 */
  animation?: StatusBarAnimation;
}

/**
 * 状态栏背景色参数
 */
export interface SetStatusBarBackgroundParams {
  /** 背景颜色（十六进制，如 #FFFFFF） */
  color: string;
  /** 是否半透明 (Android) */
  translucent?: boolean;
}

/**
 * 状态栏信息
 */
export interface StatusBarInfo {
  /** 当前样式 */
  style: StatusBarStyle;
  /** 是否可见 */
  visible: boolean;
  /** 状态栏高度（逻辑像素） */
  height: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否半透明 */
  translucent?: boolean;
}

// =============================================================================
// StatusBar 模块实现
// =============================================================================

export class StatusBarModule implements BridgeModule {
  readonly moduleName = 'StatusBar';
  readonly methods = [
    'SetStyle',
    'SetVisible',
    'SetBackgroundColor',
    'GetInfo'
  ] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 设置状态栏内容样式
   * @param style 样式类型
   * @param animation 动画类型
   */
  async setStyle(style: StatusBarStyle, animation?: StatusBarAnimation): Promise<void> {
    return this.bridge.send<void>('StatusBar.SetStyle', { style, animation });
  }

  /**
   * 设置状态栏可见性
   * @param visible 是否可见
   * @param animation 动画类型
   */
  async setVisible(visible: boolean, animation?: StatusBarAnimation): Promise<void> {
    return this.bridge.send<void>('StatusBar.SetVisible', { visible, animation });
  }

  /**
   * 显示状态栏
   * @param animation 动画类型
   */
  async show(animation?: StatusBarAnimation): Promise<void> {
    return this.setVisible(true, animation);
  }

  /**
   * 隐藏状态栏
   * @param animation 动画类型
   */
  async hide(animation?: StatusBarAnimation): Promise<void> {
    return this.setVisible(false, animation);
  }

  /**
   * 设置状态栏背景颜色（主要用于 Android）
   * @param color 颜色值（如 #FFFFFF）
   * @param translucent 是否半透明
   */
  async setBackgroundColor(color: string, translucent?: boolean): Promise<void> {
    return this.bridge.send<void>('StatusBar.SetBackgroundColor', { 
      color, 
      translucent 
    });
  }

  /**
   * 获取状态栏信息
   * @returns 状态栏信息
   */
  async getInfo(): Promise<StatusBarInfo> {
    return this.bridge.send<StatusBarInfo>('StatusBar.GetInfo');
  }
}
