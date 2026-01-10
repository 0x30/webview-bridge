/**
 * Network 模块 - 网络状态监控
 *
 * 提供网络连接状态检查和监听功能
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'vpn' | 'other' | 'none' | 'unknown'

export type CellularType = '2g' | '3g' | '4g' | '5g' | 'unknown'

export interface NetworkStatus {
  isConnected: boolean
  type: ConnectionType
  isExpensive: boolean
  isConstrained: boolean
  supportsIPv4?: boolean
  supportsIPv6?: boolean
  supportsDNS?: boolean
  cellularType?: CellularType
  downstreamBandwidthKbps?: number
  upstreamBandwidthKbps?: number
}

export interface MonitoringResult {
  monitoring: boolean
  message?: string
}

// MARK: - Network 模块类

export class NetworkModule implements BridgeModule {
  readonly moduleName = 'Network'
  readonly methods = [
    'GetStatus',
    'StartMonitoring',
    'StopMonitoring',
  ] as const

  private statusCallback: ((status: NetworkStatus) => void) | null = null

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.bridge.addEventListener('Network.StatusChanged' as any, (data: NetworkStatus) => {
      this.statusCallback?.(data)
    })
  }

  async getStatus(): Promise<NetworkStatus> {
    return this.bridge.send<NetworkStatus>('Network.GetStatus')
  }

  async startMonitoring(callback?: (status: NetworkStatus) => void): Promise<MonitoringResult> {
    if (callback) {
      this.statusCallback = callback
    }
    return this.bridge.send<MonitoringResult>('Network.StartMonitoring')
  }

  async stopMonitoring(): Promise<MonitoringResult> {
    this.statusCallback = null
    return this.bridge.send<MonitoringResult>('Network.StopMonitoring')
  }

  async isConnected(): Promise<boolean> {
    const status = await this.getStatus()
    return status.isConnected
  }

  async isWifi(): Promise<boolean> {
    const status = await this.getStatus()
    return status.type === 'wifi'
  }

  async isCellular(): Promise<boolean> {
    const status = await this.getStatus()
    return status.type === 'cellular'
  }

  async isExpensive(): Promise<boolean> {
    const status = await this.getStatus()
    return status.isExpensive
  }

  onStatusChanged(callback: (status: NetworkStatus) => void): () => void {
    this.bridge.addEventListener('Network.StatusChanged' as any, callback)
    return () => {
      this.bridge.removeEventListener('Network.StatusChanged' as any, callback)
    }
  }
}

export default NetworkModule
