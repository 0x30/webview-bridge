/**
 * Storage 模块 - 本地持久化存储
 * 
 * 访问宿主应用的本地存储
 * iOS 使用 UserDefaults / Keychain
 * Android 使用 SharedPreferences / Keystore
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 存储安全级别
 */
export type StorageSecurityLevel = 
  | 'standard'   // 标准存储（UserDefaults / SharedPreferences）
  | 'secure';    // 安全存储（Keychain / Keystore）

/**
 * 存储设置参数
 */
export interface StorageSetParams {
  /** 存储键 */
  key: string;
  /** 存储值 */
  value: string;
  /** 安全级别，默认 standard */
  securityLevel?: StorageSecurityLevel;
  /** 是否跨设备同步（iCloud Keychain）- 仅 iOS */
  synchronizable?: boolean;
  /** 访问控制（生物识别保护）- 仅 secure 级别 */
  accessControl?: StorageAccessControl;
}

/**
 * 存储获取参数
 */
export interface StorageGetParams {
  /** 存储键 */
  key: string;
  /** 安全级别，默认 standard */
  securityLevel?: StorageSecurityLevel;
}

/**
 * 存储删除参数
 */
export interface StorageRemoveParams {
  /** 存储键 */
  key: string;
  /** 安全级别，默认 standard */
  securityLevel?: StorageSecurityLevel;
}

/**
 * 存储访问控制（安全存储的生物识别保护）
 */
export type StorageAccessControl = 
  | 'none'                  // 无访问控制
  | 'biometryAny'           // 任意已注册的生物识别
  | 'biometryCurrentSet'    // 当前注册的生物识别
  | 'devicePasscode'        // 设备密码
  | 'biometryOrPasscode';   // 生物识别或密码

/**
 * 存储获取结果
 */
export interface StorageGetResult {
  /** 存储键 */
  key: string;
  /** 存储值（如果不存在则为 null） */
  value: string | null;
  /** 是否存在 */
  exists: boolean;
}

/**
 * 批量获取结果
 */
export interface StorageMultiGetResult {
  /** 结果列表 */
  results: StorageGetResult[];
}

/**
 * 存储键列表结果
 */
export interface StorageKeysResult {
  /** 键列表 */
  keys: string[];
}

/**
 * 存储信息
 */
export interface StorageInfo {
  /** 当前存储的键数量 */
  count: number;
  /** 已使用的存储大小（字节，如果可获取） */
  usedSize?: number;
}

// =============================================================================
// Storage 模块实现
// =============================================================================

export class StorageModule implements BridgeModule {
  readonly moduleName = 'Storage';
  readonly methods = [
    'Set',
    'Get',
    'Remove',
    'Clear',
    'GetKeys',
    'MultiGet',
    'MultiSet',
    'MultiRemove',
    'GetInfo'
  ] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 设置存储值
   * @param params 设置参数
   */
  async set(params: StorageSetParams): Promise<void> {
    return this.bridge.send<void>('Storage.Set', params as unknown as Record<string, unknown>);
  }

  /**
   * 获取存储值
   * @param key 存储键
   * @param securityLevel 安全级别
   * @returns 存储结果
   */
  async get(key: string, securityLevel?: StorageSecurityLevel): Promise<StorageGetResult> {
    return this.bridge.send<StorageGetResult>('Storage.Get', { key, securityLevel });
  }

  /**
   * 删除存储值
   * @param key 存储键
   * @param securityLevel 安全级别
   */
  async remove(key: string, securityLevel?: StorageSecurityLevel): Promise<void> {
    return this.bridge.send<void>('Storage.Remove', { key, securityLevel });
  }

  /**
   * 清空所有存储
   * @param securityLevel 安全级别（仅清空指定级别的存储）
   */
  async clear(securityLevel?: StorageSecurityLevel): Promise<void> {
    return this.bridge.send<void>('Storage.Clear', { securityLevel });
  }

  /**
   * 获取所有存储键
   * @param securityLevel 安全级别
   * @returns 键列表
   */
  async getKeys(securityLevel?: StorageSecurityLevel): Promise<StorageKeysResult> {
    return this.bridge.send<StorageKeysResult>('Storage.GetKeys', { securityLevel });
  }

  /**
   * 批量获取多个值
   * @param keys 键列表
   * @param securityLevel 安全级别
   * @returns 批量结果
   */
  async multiGet(keys: string[], securityLevel?: StorageSecurityLevel): Promise<StorageMultiGetResult> {
    return this.bridge.send<StorageMultiGetResult>('Storage.MultiGet', { 
      keys, 
      securityLevel 
    });
  }

  /**
   * 批量设置多个值
   * @param items 键值对列表
   * @param securityLevel 安全级别
   */
  async multiSet(
    items: Array<{ key: string; value: string }>, 
    securityLevel?: StorageSecurityLevel
  ): Promise<void> {
    return this.bridge.send<void>('Storage.MultiSet', { items, securityLevel });
  }

  /**
   * 批量删除多个值
   * @param keys 键列表
   * @param securityLevel 安全级别
   */
  async multiRemove(keys: string[], securityLevel?: StorageSecurityLevel): Promise<void> {
    return this.bridge.send<void>('Storage.MultiRemove', { keys, securityLevel });
  }

  /**
   * 获取存储信息
   * @param securityLevel 安全级别
   * @returns 存储信息
   */
  async getInfo(securityLevel?: StorageSecurityLevel): Promise<StorageInfo> {
    return this.bridge.send<StorageInfo>('Storage.GetInfo', { securityLevel });
  }

  // =========== 便捷方法 ===========

  /**
   * 设置标准存储值（便捷方法）
   * @param key 键
   * @param value 值
   */
  async setItem(key: string, value: string): Promise<void> {
    return this.set({ key, value, securityLevel: 'standard' });
  }

  /**
   * 获取标准存储值（便捷方法）
   * @param key 键
   * @returns 值或 null
   */
  async getItem(key: string): Promise<string | null> {
    const result = await this.get(key, 'standard');
    return result.value;
  }

  /**
   * 删除标准存储值（便捷方法）
   * @param key 键
   */
  async removeItem(key: string): Promise<void> {
    return this.remove(key, 'standard');
  }

  /**
   * 设置安全存储值（便捷方法）
   * @param key 键
   * @param value 值
   * @param accessControl 访问控制
   */
  async setSecureItem(
    key: string, 
    value: string, 
    accessControl?: StorageAccessControl
  ): Promise<void> {
    return this.set({ key, value, securityLevel: 'secure', accessControl });
  }

  /**
   * 获取安全存储值（便捷方法）
   * @param key 键
   * @returns 值或 null
   */
  async getSecureItem(key: string): Promise<string | null> {
    const result = await this.get(key, 'secure');
    return result.value;
  }

  /**
   * 删除安全存储值（便捷方法）
   * @param key 键
   */
  async removeSecureItem(key: string): Promise<void> {
    return this.remove(key, 'secure');
  }
}
