/**
 * Clipboard 模块 - 系统剪贴板访问
 *
 * 通过 Native Bridge 实现剪贴板的读写操作
 * 所有操作均由 Native 端执行，遵守平台隐私与安全限制
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 剪贴板内容类型
 */
export type ClipboardContentType =
  | 'text' // 纯文本
  | 'url' // URL
  | 'image' // 图片
  | 'html' // HTML 富文本

/**
 * 读取剪贴板响应
 */
export interface ClipboardReadResult {
  /** 内容类型 */
  type: ClipboardContentType
  /** 内容（可能为 null） */
  content: string | null
}

/**
 * 写入剪贴板参数
 */
export interface ClipboardWriteParams extends Record<string, unknown> {
  /** 内容类型 */
  type: ClipboardContentType
  /** 内容 */
  content: string
}

/**
 * 检查剪贴板是否有内容结果
 */
export interface ClipboardHasContentResult {
  /** 内容类型 */
  type: ClipboardContentType
  /** 是否有内容 */
  hasContent: boolean
}

/**
 * 获取可用类型结果
 */
export interface ClipboardAvailableTypesResult {
  /** 可用的内容类型列表 */
  types: ClipboardContentType[]
  /** 是否为空 */
  isEmpty: boolean
}

// =============================================================================
// Clipboard 模块实现
// =============================================================================

export class ClipboardModule implements BridgeModule {
  readonly moduleName = 'Clipboard'
  readonly methods = [
    'Read',
    'Write',
    'HasContent',
    'Clear',
    'GetAvailableTypes',
  ] as const

  constructor(private bridge: BridgeCore) {}

  /**
   * 读取剪贴板内容
   * @param type 指定读取的内容类型（默认为 'text'）
   * @returns 剪贴板内容
   */
  async read(
    type: ClipboardContentType = 'text'
  ): Promise<ClipboardReadResult> {
    return this.bridge.send<ClipboardReadResult>('Clipboard.Read', { type })
  }

  /**
   * 写入剪贴板内容
   * @param params 写入参数
   */
  async write(params: ClipboardWriteParams): Promise<void> {
    return this.bridge.send<void>('Clipboard.Write', params)
  }

  /**
   * 写入纯文本到剪贴板（便捷方法）
   * @param text 文本内容
   */
  async writeText(text: string): Promise<void> {
    return this.write({ type: 'text', content: text })
  }

  /**
   * 读取剪贴板纯文本（便捷方法）
   * @returns 文本内容
   */
  async readText(): Promise<string | null> {
    const result = await this.read('text')
    return result.content
  }

  /**
   * 检查剪贴板是否有指定类型的内容
   * @param type 内容类型（默认为 'text'）
   * @returns 是否有内容
   */
  async hasContent(
    type: ClipboardContentType = 'text'
  ): Promise<ClipboardHasContentResult> {
    return this.bridge.send<ClipboardHasContentResult>('Clipboard.HasContent', {
      type,
    })
  }

  /**
   * 获取剪贴板中所有可用的内容类型
   * @returns 可用类型列表
   */
  async getAvailableTypes(): Promise<ClipboardAvailableTypesResult> {
    return this.bridge.send<ClipboardAvailableTypesResult>(
      'Clipboard.GetAvailableTypes'
    )
  }

  /**
   * 清空剪贴板
   */
  async clear(): Promise<void> {
    return this.bridge.send<void>('Clipboard.Clear')
  }
}
