/**
 * Custom 模块 - 自定义模块示例
 * 
 * 演示如何创建自定义原生模块，提供 Alert、Confirm、Prompt 等 UI 交互
 * 注意：此模块需要在 Native 端注册对应的 CustomModule
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * Alert 选项
 */
export interface AlertOptions {
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message: string;
  /** 按钮文字 */
  buttonText?: string;
}

/**
 * Alert 结果
 */
export interface AlertResult {
  /** 用户操作 */
  action: 'confirm';
}

/**
 * Confirm 选项
 */
export interface ConfirmOptions {
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message: string;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
}

/**
 * Confirm 结果
 */
export interface ConfirmResult {
  /** 是否确认 */
  confirmed: boolean;
  /** 用户操作 */
  action: 'confirm' | 'cancel';
}

/**
 * Prompt 选项
 */
export interface PromptOptions {
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message?: string;
  /** 输入框占位符 */
  placeholder?: string;
  /** 默认值 */
  defaultValue?: string;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
}

/**
 * Prompt 结果
 */
export interface PromptResult {
  /** 是否确认 */
  confirmed: boolean;
  /** 用户操作 */
  action: 'confirm' | 'cancel';
  /** 输入的值（仅确认时有值） */
  value: string | null;
}

/**
 * Toast 选项
 */
export interface ToastOptions {
  /** 消息内容 */
  message: string;
  /** 显示时长 */
  duration?: 'short' | 'long';
}

/**
 * Loading 选项
 */
export interface LoadingOptions {
  /** 加载提示文字 */
  message?: string;
}

/**
 * ActionSheet 选项
 */
export interface ActionSheetOptions {
  /** 标题 */
  title?: string;
  /** 选项列表 */
  options: string[];
  /** 取消按钮文字 */
  cancelText?: string;
}

/**
 * ActionSheet 结果
 */
export interface ActionSheetResult {
  /** 选中的索引（取消时为 -1） */
  index: number;
  /** 选中的选项文字 */
  option: string | null;
  /** 是否取消 */
  cancelled: boolean;
}

// =============================================================================
// Custom 模块实现
// =============================================================================

export class CustomModule implements BridgeModule {
  readonly moduleName = 'Custom';
  readonly methods = [
    'Alert',
    'Confirm',
    'Prompt',
    'Toast',
    'ShowLoading',
    'HideLoading',
    'ActionSheet'
  ] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 显示原生警告框
   * @param options Alert 选项
   * @returns Alert 结果
   */
  async alert(options: AlertOptions): Promise<AlertResult> {
    return this.bridge.send<AlertResult>('Custom.Alert', options as unknown as Record<string, unknown>);
  }

  /**
   * 显示确认对话框
   * @param options Confirm 选项
   * @returns Confirm 结果
   */
  async confirm(options: ConfirmOptions): Promise<ConfirmResult> {
    return this.bridge.send<ConfirmResult>('Custom.Confirm', options as unknown as Record<string, unknown>);
  }

  /**
   * 显示输入对话框
   * @param options Prompt 选项
   * @returns Prompt 结果
   */
  async prompt(options: PromptOptions): Promise<PromptResult> {
    return this.bridge.send<PromptResult>('Custom.Prompt', options as unknown as Record<string, unknown>);
  }

  /**
   * 显示 Toast 消息
   * @param options Toast 选项
   */
  async toast(options: ToastOptions): Promise<void> {
    return this.bridge.send<void>('Custom.Toast', options as unknown as Record<string, unknown>);
  }

  /**
   * 显示加载指示器
   * @param options Loading 选项
   */
  async showLoading(options: LoadingOptions = {}): Promise<void> {
    return this.bridge.send<void>('Custom.ShowLoading', options as unknown as Record<string, unknown>);
  }

  /**
   * 隐藏加载指示器
   */
  async hideLoading(): Promise<void> {
    return this.bridge.send<void>('Custom.HideLoading');
  }

  /**
   * 显示操作表
   * @param options ActionSheet 选项
   * @returns ActionSheet 结果
   */
  async actionSheet(options: ActionSheetOptions): Promise<ActionSheetResult> {
    return this.bridge.send<ActionSheetResult>('Custom.ActionSheet', options as unknown as Record<string, unknown>);
  }
}
