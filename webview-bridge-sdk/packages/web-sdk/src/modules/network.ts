/**
 * Network 模块 - 网络状态监控
 *
 * 提供网络连接状态检查和监听功能
 */

import { BridgeCore } from '../core';

// MARK: - 类型定义

/**
 * 网络连接类型
 */
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'vpn' | 'other' | 'none' | 'unknown';

/**
 * 蜂窝网络类型
 */
export type CellularType = '2g' | '3g' | '4g' | '5g' | 'unknown';

/**
 * 网络状态
 */
export interface NetworkStatus {
  /** 是否已连接 */
  isConnected: boolean;
  /** 连接类型 */
  type: ConnectionType;
  /** 是否计量网络（使用流量） */
  isExpensive: boolean;
  /** 是否受限 */
  isConstrained: boolean;
  /** 是否支持 IPv4（iOS） */
  supportsIPv4?: boolean;
  /** 是否支持 IPv6（iOS） */
  supportsIPv6?: boolean;
  /** 是否支持 DNS（iOS） */
  supportsDNS?: boolean;
  /** 蜂窝网络类型（Android） */
  cellularType?: CellularType;
  /** 下行带宽（kbps，Android Q+） */
  downstreamBandwidthKbps?: number;
  /** 上行带宽（kbps，Android Q+） */
  upstreamBandwidthKbps?: number;
}

/**
 * 监听结果
 */
export interface MonitoringResult {
  /** 是否正在监听 */
  monitoring: boolean;
  /** 消息 */
  message?: string;
}

// MARK: - Network 模块类

export class NetworkModule {
  private core: BridgeCore;
  private statusCallback: ((status: NetworkStatus) => void) | null = null;

  constructor(core: BridgeCore) {
    this.core = core;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.core.on('Network.StatusChanged', (data: NetworkStatus) => {
      this.statusCallback?.(data);
    });
  }

  /**
   * 获取当前网络状态
   */
  async getStatus(): Promise<NetworkStatus> {
    return await this.core.invoke<NetworkStatus>('Network.GetStatus');
  }

  /**
   * 开始监听网络状态变化
   */
  async startMonitoring(callback?: (status: NetworkStatus) => void): Promise<MonitoringResult> {
    if (callback) {
      this.statusCallback = callback;
    }
    return await this.core.invoke<MonitoringResult>('Network.StartMonitoring');
  }

  /**
   * 停止监听网络状态变化
   */
  async stopMonitoring(): Promise<MonitoringResult> {
    this.statusCallback = null;
    return await this.core.invoke<MonitoringResult>('Network.StopMonitoring');
  }

  /**
   * 检查是否已连接网络
   */
  async isConnected(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isConnected;
  }

  /**
   * 检查是否为 WiFi 连接
   */
  async isWifi(): Promise<boolean> {
    const status = await this.getStatus();
    return status.type === 'wifi';
  }

  /**
   * 检查是否为蜂窝网络连接
   */
  async isCellular(): Promise<boolean> {
    const status = await this.getStatus();
    return status.type === 'cellular';
  }

  /**
   * 检查是否为计量网络（使用流量）
   */
  async isExpensive(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isExpensive;
  }

  /**
   * 监听网络状态变化事件
   */
  onStatusChanged(callback: (status: NetworkStatus) => void): () => void {
    return this.core.on('Network.StatusChanged', callback);
  }
}

export default NetworkModule;
