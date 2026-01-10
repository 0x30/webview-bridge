/**
 * Clipboard 模块 - 系统剪贴板访问
 * 
 * 通过 Native Bridge 实现剪贴板的读写操作
 * 所有操作均由 Native 端执行，遵守平台隐私与安全限制
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 剪贴板内容类型
 */
export type ClipboardContentType = 
  | 'text'      // 纯文本
  | 'url'       // URL
  | 'image'     // 图片
  | 'html';     // HTML 富文本

/**
 * 剪贴板内容
 */
export interface ClipboardContent {
  /** 内容类型 */
  type: ClipboardContentType;
  /** 文本内容 */
  text?: string;
  /** URL 内容 */
  url?: string;
  /** 图片 Base64（如果是图片类型） */
  imageBase64?: string;
  /** HTML 内容 */
  html?: string;
}

/**
 * 设置剪贴板参数
 */
export interface ClipboardSetParams {
  /** 内容类型 */
  type: ClipboardContentType;
  /** 文本内容 */
  text?: string;
  /** URL 内容 */
  url?: string;
  /** 图片 Base64 */
  imageBase64?: string;
  /** HTML 内容 */
  html?: string;
  /** 过期时间（秒），0 表示不过期（iOS 16+ 支持） */
  expirationSeconds?: number;
}

/**
 * 剪贴板是否有内容结果
 */
export interface ClipboardHasContentResult {
  /** 是否有内容 */
  hasContent: boolean;
  /** 可用的内容类型列表 */
  availableTypes: ClipboardContentType[];
}

// =============================================================================
// Clipboard 模块实现
// =============================================================================

export class ClipboardModule implements BridgeModule {
  readonly moduleName = 'Clipboard';
  readonly methods = ['Get', 'Set', 'HasContent', 'Clear'] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 获取剪贴板内容
   * @param type 指定获取的内容类型，不传则返回所有可用内容
   * @returns 剪贴板内容
   */
  async get(type?: ClipboardContentType): Promise<ClipboardContent> {
    return this.bridge.send<ClipboardContent>('Clipboard.Get', { type });
  }

  /**
   * 设置剪贴板内容
   * @param params 设置参数
   */
  async set(params: ClipboardSetParams): Promise<void> {
    return this.bridge.send<void>('Clipboard.Set', params);
  }

  /**
   * 设置纯文本到剪贴板（便捷方法）
   * @param text 文本内容
   */
  async setText(text: string): Promise<void> {
    return this.set({ type: 'text', text });
  }

  /**
   * 获取剪贴板纯文本（便捷方法）
   * @returns 文本内容
   */
  async getText(): Promise<string | undefined> {
    const content = await this.get('text');
    return content.text;
  }

  /**
   * 检查剪贴板是否有内容
   * @returns 是否有内容及可用类型
   */
  async hasContent(): Promise<ClipboardHasContentResult> {
    return this.bridge.send<ClipboardHasContentResult>('Clipboard.HasContent');
  }

  /**
   * 清空剪贴板
   */
  async clear(): Promise<void> {
    return this.bridge.send<void>('Clipboard.Clear');
  }
}
