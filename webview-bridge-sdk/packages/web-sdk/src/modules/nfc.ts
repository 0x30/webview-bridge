/**
 * NFC 模块 - 近场通信功能
 *
 * 提供 NFC 读写功能
 */

import { BridgeCore } from '../core';

// MARK: - 类型定义

/**
 * TNF (Type Name Format) 类型
 */
export type TNFType = 'empty' | 'wellKnown' | 'media' | 'absoluteUri' | 'external' | 'unknown' | 'unchanged';

/**
 * NFC 可用性
 */
export interface NFCAvailability {
  /** 是否可用 */
  isAvailable: boolean;
  /** 是否支持 NDEF */
  ndefSupported: boolean;
  /** 是否支持标签操作 */
  tagSupported: boolean;
}

/**
 * NFC 启用状态
 */
export interface NFCEnabled {
  /** 是否已启用 */
  isEnabled: boolean;
}

/**
 * NDEF 记录
 */
export interface NDEFRecord {
  /** TNF 类型 */
  tnf: TNFType;
  /** 类型 */
  type: string;
  /** 标识符 */
  id?: string;
  /** 原始 payload（Base64） */
  payload: string;
  /** 文本内容（如果是文本记录） */
  text?: string;
  /** 语言代码（如果是文本记录） */
  locale?: string;
  /** URI（如果是 URI 记录） */
  uri?: string;
  /** payload 文本表示 */
  payloadText?: string;
}

/**
 * 扫描参数
 */
export interface ScanParams {
  /** 提示信息 */
  alertMessage?: string;
  /** 是否保持会话活跃（iOS） */
  keepSessionAlive?: boolean;
}

/**
 * 扫描结果
 */
export interface ScanResult {
  /** 是否正在扫描 */
  scanning?: boolean;
  /** 消息 */
  message?: string;
  /** 读取到的记录 */
  records?: NDEFRecord[];
  /** 标签容量（字节） */
  capacity?: number;
  /** 是否可写（Android） */
  isWritable?: boolean;
  /** 是否已取消 */
  cancelled?: boolean;
}

/**
 * 写入记录参数
 */
export interface WriteRecordParams {
  /** TNF 类型 */
  tnf?: TNFType;
  /** 类型 */
  type: string;
  /** 标识符 */
  id?: string;
  /** Payload */
  payload: string;
}

/**
 * 写入参数
 */
export interface WriteParams {
  /** 文本内容 */
  text?: string;
  /** URI */
  uri?: string;
  /** 自定义记录 */
  records?: WriteRecordParams[];
  /** 提示信息 */
  alertMessage?: string;
}

/**
 * 写入结果
 */
export interface WriteResult {
  /** 是否准备就绪（Android） */
  ready?: boolean;
  /** 是否成功 */
  success?: boolean;
  /** 标签容量 */
  capacity?: number;
  /** 是否格式化了标签 */
  formatted?: boolean;
  /** 消息 */
  message?: string;
}

/**
 * 标签检测事件数据
 */
export interface TagDetectedEvent {
  /** NDEF 记录 */
  records: NDEFRecord[];
  /** 标签容量 */
  capacity?: number;
  /** 是否可写 */
  isWritable?: boolean;
}

/**
 * 写入成功事件数据
 */
export interface WriteSuccessEvent {
  success: boolean;
  capacity?: number;
  formatted?: boolean;
}

/**
 * 写入错误事件数据
 */
export interface WriteErrorEvent {
  success: false;
  error: string;
}

/**
 * NFC 错误事件数据
 */
export interface NFCErrorEvent {
  error: string;
}

// MARK: - NFC 模块类

export class NFCModule {
  private core: BridgeCore;

  constructor(core: BridgeCore) {
    this.core = core;
  }

  /**
   * 检查 NFC 是否可用
   */
  async isAvailable(): Promise<NFCAvailability> {
    return await this.core.invoke<NFCAvailability>('NFC.IsAvailable');
  }

  /**
   * 检查 NFC 是否已启用
   */
  async isEnabled(): Promise<NFCEnabled> {
    return await this.core.invoke<NFCEnabled>('NFC.IsEnabled');
  }

  /**
   * 开始扫描 NFC 标签
   */
  async startScan(params?: ScanParams): Promise<ScanResult> {
    return await this.core.invoke<ScanResult>('NFC.StartScan', params);
  }

  /**
   * 停止扫描
   */
  async stopScan(): Promise<{ stopped: boolean }> {
    return await this.core.invoke<{ stopped: boolean }>('NFC.StopScan');
  }

  /**
   * 写入 NFC 标签
   */
  async writeTag(params: WriteParams): Promise<WriteResult> {
    return await this.core.invoke<WriteResult>('NFC.WriteTag', params);
  }

  /**
   * 打开 NFC 设置（Android）
   */
  async openSettings(): Promise<{ opened: boolean }> {
    return await this.core.invoke<{ opened: boolean }>('NFC.OpenSettings');
  }

  /**
   * 写入文本到 NFC 标签
   */
  async writeText(text: string, alertMessage?: string): Promise<WriteResult> {
    return await this.writeTag({ text, alertMessage });
  }

  /**
   * 写入 URI 到 NFC 标签
   */
  async writeUri(uri: string, alertMessage?: string): Promise<WriteResult> {
    return await this.writeTag({ uri, alertMessage });
  }

  /**
   * 监听标签检测事件
   */
  onTagDetected(callback: (data: TagDetectedEvent) => void): () => void {
    return this.core.on('NFC.TagDetected', callback);
  }

  /**
   * 监听写入成功事件
   */
  onWriteSuccess(callback: (data: WriteSuccessEvent) => void): () => void {
    return this.core.on('NFC.WriteSuccess', callback);
  }

  /**
   * 监听写入错误事件
   */
  onWriteError(callback: (data: WriteErrorEvent) => void): () => void {
    return this.core.on('NFC.WriteError', callback);
  }

  /**
   * 监听错误事件
   */
  onError(callback: (data: NFCErrorEvent) => void): () => void {
    return this.core.on('NFC.Error', callback);
  }

  /**
   * 监听会话激活事件（iOS）
   */
  onSessionActive(callback: () => void): () => void {
    return this.core.on('NFC.SessionActive', callback);
  }
}

export default NFCModule;
