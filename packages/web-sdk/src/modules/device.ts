/**
 * Device 模块 - 设备与系统信息
 * 
 * 获取设备硬件信息、系统信息、屏幕信息等
 * 所有字段一经发布，禁止随意删除或改名
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 操作系统类型
 */
export type OSType = 'ios' | 'android';

/**
 * 安全区域边距
 */
export interface SafeAreaInsets {
  /** 顶部安全区域（状态栏、刘海等） */
  top: number;
  /** 底部安全区域（Home Indicator 等） */
  bottom: number;
  /** 左侧安全区域 */
  left: number;
  /** 右侧安全区域 */
  right: number;
}

/**
 * 屏幕信息
 */
export interface ScreenInfo {
  /** 屏幕宽度（逻辑像素） */
  width: number;
  /** 屏幕高度（逻辑像素） */
  height: number;
  /** 屏幕缩放比例（devicePixelRatio） */
  scale: number;
  /** 安全区域边距 */
  safeArea: SafeAreaInsets;
  /** 物理屏幕宽度（物理像素） */
  physicalWidth: number;
  /** 物理屏幕高度（物理像素） */
  physicalHeight: number;
  /** 屏幕刷新率 */
  refreshRate?: number;
  /** 是否支持 HDR */
  hdrSupported?: boolean;
  /** 屏幕亮度（0-1） */
  brightness?: number;
}

/**
 * 电池信息
 */
export interface BatteryInfo {
  /** 电池电量（0-100） */
  level: number;
  /** 是否正在充电 */
  isCharging: boolean;
  /** 充电状态 */
  state: 'charging' | 'discharging' | 'full' | 'notCharging' | 'unknown';
  /** 是否为低电量模式 */
  isLowPowerMode: boolean;
}

/**
 * 网络信息
 */
export interface NetworkInfo {
  /** 网络类型 */
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  /** 是否已连接 */
  isConnected: boolean;
  /** WiFi SSID（需要位置权限） */
  wifiSSID?: string;
  /** 蜂窝网络类型 */
  cellularType?: '2g' | '3g' | '4g' | '5g' | 'unknown';
  /** 运营商名称 */
  carrierName?: string;
  /** 是否为计量网络（可能产生流量费用） */
  isMetered?: boolean;
  /** 是否启用 VPN */
  isVpnActive?: boolean;
}

/**
 * 存储信息
 */
export interface StorageInfo {
  /** 总存储空间（字节） */
  totalSpace: number;
  /** 可用存储空间（字节） */
  freeSpace: number;
  /** 已用存储空间（字节） */
  usedSpace: number;
}

/**
 * 内存信息
 */
export interface MemoryInfo {
  /** 总内存（字节） */
  totalMemory: number;
  /** 可用内存（字节） */
  availableMemory: number;
  /** 已用内存（字节） */
  usedMemory: number;
  /** 低内存阈值（字节） */
  lowMemoryThreshold?: number;
}

/**
 * 设备能力信息
 */
export interface DeviceCapabilities {
  /** 是否有前置摄像头 */
  hasFrontCamera: boolean;
  /** 是否有后置摄像头 */
  hasRearCamera: boolean;
  /** 是否支持 Touch ID */
  hasTouchId: boolean;
  /** 是否支持 Face ID */
  hasFaceId: boolean;
  /** 是否支持生物识别 */
  hasBiometrics: boolean;
  /** 是否支持 NFC */
  hasNfc: boolean;
  /** 是否支持蓝牙 */
  hasBluetooth: boolean;
  /** 是否支持陀螺仪 */
  hasGyroscope: boolean;
  /** 是否支持加速计 */
  hasAccelerometer: boolean;
  /** 是否支持磁力计 */
  hasMagnetometer: boolean;
  /** 是否支持气压计 */
  hasBarometer: boolean;
  /** 是否支持 GPS */
  hasGps: boolean;
  /** 是否支持震动 */
  hasVibrator: boolean;
  /** 是否支持 Haptic Feedback */
  hasHaptics: boolean;
  /** 是否支持 ARKit/ARCore */
  hasAr: boolean;
}

/**
 * 完整设备信息
 */
export interface DeviceInfo {
  /** 操作系统类型 */
  os: OSType;
  /** 操作系统版本 */
  osVersion: string;
  /** 操作系统完整版本号 */
  osFullVersion: string;
  /** SDK/API 版本 (Android API Level) */
  sdkVersion?: number;
  /** 应用版本号 */
  appVersion: string;
  /** 应用构建号 */
  buildNumber: string;
  /** 设备型号标识符 (如 iPhone14,5 / SM-G998B) */
  deviceModel: string;
  /** 设备市场名称 (如 iPhone 13 Pro / Galaxy S21 Ultra) */
  deviceName: string;
  /** 设备制造商 */
  manufacturer: string;
  /** 设备品牌 */
  brand: string;
  /** 系统语言 */
  language: string;
  /** 系统地区 */
  region: string;
  /** 时区标识符 */
  timezone: string;
  /** 时区偏移（分钟） */
  timezoneOffset: number;
  /** 屏幕信息 */
  screenInfo: ScreenInfo;
  /** 是否为模拟器/模拟器 */
  isEmulator: boolean;
  /** 是否已越狱/Root */
  isJailbroken: boolean;
  /** 是否为平板设备 */
  isTablet: boolean;
  /** 设备唯一标识符（广告 ID 或 Vendor ID） */
  deviceId?: string;
}

// =============================================================================
// Device 模块实现
// =============================================================================

export class DeviceModule implements BridgeModule {
  readonly moduleName = 'Device';
  readonly methods = [
    'GetInfo',
    'GetBatteryInfo',
    'GetNetworkInfo',
    'GetStorageInfo',
    'GetMemoryInfo',
    'GetCapabilities'
  ] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 获取设备基本信息
   * @returns 设备信息
   */
  async getInfo(): Promise<DeviceInfo> {
    return this.bridge.send<DeviceInfo>('Device.GetInfo');
  }

  /**
   * 获取电池信息
   * @returns 电池信息
   */
  async getBatteryInfo(): Promise<BatteryInfo> {
    return this.bridge.send<BatteryInfo>('Device.GetBatteryInfo');
  }

  /**
   * 获取网络信息
   * @returns 网络信息
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    return this.bridge.send<NetworkInfo>('Device.GetNetworkInfo');
  }

  /**
   * 获取存储信息
   * @returns 存储信息
   */
  async getStorageInfo(): Promise<StorageInfo> {
    return this.bridge.send<StorageInfo>('Device.GetStorageInfo');
  }

  /**
   * 获取内存信息
   * @returns 内存信息
   */
  async getMemoryInfo(): Promise<MemoryInfo> {
    return this.bridge.send<MemoryInfo>('Device.GetMemoryInfo');
  }

  /**
   * 获取设备能力信息
   * @returns 设备能力
   */
  async getCapabilities(): Promise<DeviceCapabilities> {
    return this.bridge.send<DeviceCapabilities>('Device.GetCapabilities');
  }
}
