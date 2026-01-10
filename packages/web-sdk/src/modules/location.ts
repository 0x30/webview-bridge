/**
 * Location 模块 - 地理位置功能
 *
 * 提供获取位置、位置监听、地理编码等功能
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

/**
 * 位置信息
 */
export interface LocationResult {
  latitude: number
  longitude: number
  altitude: number
  accuracy: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: number
}

/**
 * 获取位置参数
 */
export interface GetPositionParams {
  accuracy?: 'high' | 'medium' | 'low'
  timeout?: number
  maximumAge?: number
}

/**
 * 位置监听参数
 */
export interface WatchPositionParams extends GetPositionParams {
  distanceFilter?: number
  interval?: number
}

/**
 * 权限请求参数
 */
export interface RequestPermissionParams {
  type?: 'whenInUse' | 'always'
}

/**
 * 权限状态
 */
export interface PermissionResult {
  granted: boolean
  status: string
}

/**
 * 权限详细状态
 */
export interface PermissionStatusResult {
  status: string
  isLocationServicesEnabled: boolean
}

/**
 * 位置监听结果
 */
export interface WatchResult {
  watchId: string
}

/**
 * 地址信息
 */
export interface Address {
  name?: string
  thoroughfare?: string
  subThoroughfare?: string
  locality?: string
  subLocality?: string
  administrativeArea?: string
  subAdministrativeArea?: string
  postalCode?: string
  country?: string
  countryCode?: string
  formattedAddress?: string
}

/**
 * 地理编码结果
 */
export interface GeocodeResult {
  latitude: number
  longitude: number
  address: Address
}

/**
 * 位置变化事件数据
 */
export interface PositionChangedEvent extends LocationResult {
  watchId?: string
}

/**
 * 权限变化事件数据
 */
export interface PermissionChangedEvent {
  granted: boolean
  status: string
}

// MARK: - Location 模块类

export class LocationModule implements BridgeModule {
  readonly moduleName = 'Location'
  readonly methods = [
    'GetCurrentPosition',
    'WatchPosition',
    'ClearWatch',
    'HasPermission',
    'RequestPermission',
    'GetPermissionStatus',
    'OpenSettings',
    'Geocode',
    'ReverseGeocode',
  ] as const

  private watchCallbacks = new Map<string, (position: PositionChangedEvent) => void>()

  constructor(private bridge: BridgeCore) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.bridge.addEventListener('Location.PositionChanged' as any, (data: PositionChangedEvent) => {
      if (data.watchId && this.watchCallbacks.has(data.watchId)) {
        this.watchCallbacks.get(data.watchId)?.(data)
      }
    })
  }

  async hasPermission(): Promise<PermissionResult> {
    return this.bridge.send<PermissionResult>('Location.HasPermission')
  }

  async requestPermission(params?: RequestPermissionParams): Promise<PermissionResult> {
    return this.bridge.send<PermissionResult>('Location.RequestPermission', params as Record<string, unknown>)
  }

  async getPermissionStatus(): Promise<PermissionStatusResult> {
    return this.bridge.send<PermissionStatusResult>('Location.GetPermissionStatus')
  }

  async openSettings(): Promise<{ opened: boolean }> {
    return this.bridge.send<{ opened: boolean }>('Location.OpenSettings')
  }

  async getCurrentPosition(params?: GetPositionParams): Promise<LocationResult> {
    return this.bridge.send<LocationResult>('Location.GetCurrentPosition', params as Record<string, unknown>)
  }

  async watchPosition(
    callback: (position: PositionChangedEvent) => void,
    params?: WatchPositionParams
  ): Promise<string> {
    const result = await this.bridge.send<WatchResult>('Location.WatchPosition', params as Record<string, unknown>)
    this.watchCallbacks.set(result.watchId, callback)
    return result.watchId
  }

  async clearWatch(watchId: string): Promise<{ cleared: boolean }> {
    this.watchCallbacks.delete(watchId)
    return this.bridge.send<{ cleared: boolean }>('Location.ClearWatch', { watchId })
  }

  async clearAllWatches(): Promise<void> {
    const watchIds = Array.from(this.watchCallbacks.keys())
    for (const watchId of watchIds) {
      await this.clearWatch(watchId)
    }
  }

  async geocode(address: string): Promise<GeocodeResult> {
    return this.bridge.send<GeocodeResult>('Location.Geocode', { address })
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<Address> {
    return this.bridge.send<Address>('Location.ReverseGeocode', { latitude, longitude })
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  onPermissionChanged(callback: (data: PermissionChangedEvent) => void): () => void {
    this.bridge.addEventListener('Location.PermissionChanged' as any, callback)
    return () => {
      this.bridge.removeEventListener('Location.PermissionChanged' as any, callback)
    }
  }
}

export default LocationModule
