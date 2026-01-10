/**
 * Biometrics 模块 - 生物识别认证
 *
 * 提供 Touch ID / Face ID / 指纹 认证功能
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

export type BiometryType = 'none' | 'touchId' | 'faceId' | 'fingerprint' | 'face' | 'iris' | 'multiple' | 'unknown'

export interface BiometricsAvailability {
  isAvailable: boolean
  biometryType: BiometryType
  errorCode?: number
  errorMessage?: string
  strongBiometrics?: boolean
  weakBiometrics?: boolean
}

export interface BiometryTypeInfo {
  type: BiometryType
  displayName: string
}

export interface AuthenticateParams {
  reason?: string
  title?: string
  subtitle?: string
  fallbackTitle?: string
  cancelTitle?: string
  allowDeviceCredential?: boolean
}

export interface AuthenticateResult {
  success: boolean
  biometryType?: BiometryType
  authenticationType?: 'biometric' | 'deviceCredential' | 'unknown'
  errorCode?: number
  errorMessage?: string
  reason?: string
}

export interface EnrollmentResult {
  isEnrolled: boolean
  biometryType: BiometryType
  reason?: string
}

// MARK: - Biometrics 模块类

export class BiometricsModule implements BridgeModule {
  readonly moduleName = 'Biometrics'
  readonly methods = [
    'IsAvailable',
    'GetBiometryType',
    'Authenticate',
    'CheckEnrollment',
  ] as const

  constructor(private bridge: BridgeCore) {}

  async isAvailable(): Promise<BiometricsAvailability> {
    return this.bridge.send<BiometricsAvailability>('Biometrics.IsAvailable')
  }

  async getBiometryType(): Promise<BiometryTypeInfo> {
    return this.bridge.send<BiometryTypeInfo>('Biometrics.GetBiometryType')
  }

  async authenticate(params?: AuthenticateParams): Promise<AuthenticateResult> {
    return this.bridge.send<AuthenticateResult>('Biometrics.Authenticate', params as Record<string, unknown>)
  }

  async checkEnrollment(): Promise<EnrollmentResult> {
    return this.bridge.send<EnrollmentResult>('Biometrics.CheckEnrollment')
  }

  async hasTouchId(): Promise<boolean> {
    const result = await this.getBiometryType()
    return result.type === 'touchId' || result.type === 'fingerprint'
  }

  async hasFaceId(): Promise<boolean> {
    const result = await this.getBiometryType()
    return result.type === 'faceId' || result.type === 'face'
  }

  async verify(reason?: string): Promise<void> {
    const result = await this.authenticate({ reason })
    if (!result.success) {
      throw new Error(result.errorMessage || '生物识别认证失败')
    }
  }
}

export default BiometricsModule
