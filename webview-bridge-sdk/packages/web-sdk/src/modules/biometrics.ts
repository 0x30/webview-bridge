/**
 * Biometrics 模块 - 生物识别认证
 *
 * 提供 Touch ID / Face ID / 指纹 认证功能
 */

import { BridgeCore } from '../core';

// MARK: - 类型定义

/**
 * 生物识别类型
 */
export type BiometryType = 'none' | 'touchId' | 'faceId' | 'fingerprint' | 'face' | 'iris' | 'multiple' | 'unknown';

/**
 * 可用性检查结果
 */
export interface BiometricsAvailability {
  /** 是否可用 */
  isAvailable: boolean;
  /** 生物识别类型 */
  biometryType: BiometryType;
  /** 错误码（如有） */
  errorCode?: number;
  /** 错误信息（如有） */
  errorMessage?: string;
  /** 强生物识别是否可用（Android） */
  strongBiometrics?: boolean;
  /** 弱生物识别是否可用（Android） */
  weakBiometrics?: boolean;
}

/**
 * 生物识别类型信息
 */
export interface BiometryTypeInfo {
  /** 类型标识 */
  type: BiometryType;
  /** 显示名称 */
  displayName: string;
}

/**
 * 认证参数
 */
export interface AuthenticateParams {
  /** 认证原因/描述 */
  reason?: string;
  /** 标题（Android） */
  title?: string;
  /** 副标题（Android） */
  subtitle?: string;
  /** 回退按钮标题（iOS） */
  fallbackTitle?: string;
  /** 取消按钮标题 */
  cancelTitle?: string;
  /** 是否允许使用设备密码 */
  allowDeviceCredential?: boolean;
}

/**
 * 认证结果
 */
export interface AuthenticateResult {
  /** 是否成功 */
  success: boolean;
  /** 生物识别类型 */
  biometryType?: BiometryType;
  /** 认证类型（Android） */
  authenticationType?: 'biometric' | 'deviceCredential' | 'unknown';
  /** 错误码（如失败） */
  errorCode?: number;
  /** 错误信息（如失败） */
  errorMessage?: string;
  /** 失败原因 */
  reason?: 'userCancel' | 'userFallback' | 'systemCancel' | 'appCancel' | 'lockout' | 'lockoutPermanent' | 'failed' | 'timeout' | 'notEnrolled' | 'noHardware' | string;
}

/**
 * 注册检查结果
 */
export interface EnrollmentResult {
  /** 是否已注册 */
  isEnrolled: boolean;
  /** 生物识别类型 */
  biometryType: BiometryType;
  /** 原因 */
  reason?: 'enrolled' | 'notEnrolled' | 'notAvailable' | 'lockout' | 'noHardware' | 'unknown' | string;
}

// MARK: - Biometrics 模块类

export class BiometricsModule {
  private core: BridgeCore;

  constructor(core: BridgeCore) {
    this.core = core;
  }

  /**
   * 检查生物识别是否可用
   */
  async isAvailable(): Promise<BiometricsAvailability> {
    return await this.core.invoke<BiometricsAvailability>('Biometrics.IsAvailable');
  }

  /**
   * 获取生物识别类型
   */
  async getBiometryType(): Promise<BiometryTypeInfo> {
    return await this.core.invoke<BiometryTypeInfo>('Biometrics.GetBiometryType');
  }

  /**
   * 进行生物识别认证
   */
  async authenticate(params?: AuthenticateParams): Promise<AuthenticateResult> {
    return await this.core.invoke<AuthenticateResult>('Biometrics.Authenticate', params);
  }

  /**
   * 检查生物识别是否已注册
   */
  async checkEnrollment(): Promise<EnrollmentResult> {
    return await this.core.invoke<EnrollmentResult>('Biometrics.CheckEnrollment');
  }

  /**
   * 便捷方法：检查是否支持 Touch ID
   */
  async hasTouchId(): Promise<boolean> {
    const result = await this.getBiometryType();
    return result.type === 'touchId' || result.type === 'fingerprint';
  }

  /**
   * 便捷方法：检查是否支持 Face ID
   */
  async hasFaceId(): Promise<boolean> {
    const result = await this.getBiometryType();
    return result.type === 'faceId' || result.type === 'face';
  }

  /**
   * 便捷方法：快速认证
   * @throws 认证失败时抛出错误
   */
  async verify(reason?: string): Promise<void> {
    const result = await this.authenticate({ reason });
    if (!result.success) {
      throw new Error(result.errorMessage || '生物识别认证失败');
    }
  }
}

export default BiometricsModule;
