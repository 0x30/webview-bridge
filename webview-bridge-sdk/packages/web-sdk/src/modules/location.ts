/**
 * Location 模块 - 地理位置功能
 *
 * 提供获取位置、位置监听、地理编码等功能
 */

import { BridgeCore } from '../core';

// MARK: - 类型定义

/**
 * 位置坐标
 */
export interface Coordinates {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 海拔（米） */
  altitude: number | null;
  /** 水平精度（米） */
  accuracy: number;
  /** 垂直精度（米） */
  altitudeAccuracy: number | null;
  /** 航向（度） */
  heading: number | null;
  /** 速度（米/秒） */
  speed: number | null;
}

/**
 * 位置信息
 */
export interface Position {
  /** 坐标 */
  coords: Coordinates;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 扁平化的位置信息
 */
export interface LocationResult {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

/**
 * 获取位置参数
 */
export interface GetPositionParams {
  /**
   * 精度级别
   * - high: 高精度（GPS）
   * - medium: 中等精度
   * - low: 低精度（网络定位）
   */
  accuracy?: 'high' | 'medium' | 'low';
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大缓存时间（毫秒） */
  maximumAge?: number;
}

/**
 * 位置监听参数
 */
export interface WatchPositionParams extends GetPositionParams {
  /** 最小距离变化（米） */
  distanceFilter?: number;
  /** 更新间隔（毫秒） */
  interval?: number;
}

/**
 * 权限请求参数
 */
export interface RequestPermissionParams {
  /**
   * 权限类型
   * - whenInUse: 仅使用时
   * - always: 始终（后台定位）
   */
  type?: 'whenInUse' | 'always';
}

/**
 * 权限状态
 */
export interface PermissionResult {
  granted: boolean;
  status: 'notDetermined' | 'restricted' | 'denied' | 'authorizedWhenInUse' | 'authorizedAlways';
}

/**
 * 权限详细状态
 */
export interface PermissionStatusResult {
  status: string;
  isLocationServicesEnabled: boolean;
  permissions?: {
    granted: boolean;
    fineLocation?: boolean;
    coarseLocation?: boolean;
  };
  isGpsEnabled?: boolean;
  isNetworkEnabled?: boolean;
}

/**
 * 位置监听结果
 */
export interface WatchResult {
  watchId: string;
}

/**
 * 地理编码参数
 */
export interface GeocodeParams {
  /** 地址 */
  address: string;
}

/**
 * 反向地理编码参数
 */
export interface ReverseGeocodeParams {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
}

/**
 * 地址信息
 */
export interface Address {
  /** 名称 */
  name?: string;
  /** 街道 */
  thoroughfare?: string;
  /** 门牌号 */
  subThoroughfare?: string;
  /** 城市 */
  locality?: string;
  /** 区/县 */
  subLocality?: string;
  /** 省/州 */
  administrativeArea?: string;
  /** 子行政区 */
  subAdministrativeArea?: string;
  /** 邮政编码 */
  postalCode?: string;
  /** 国家 */
  country?: string;
  /** 国家代码 */
  countryCode?: string;
  /** 完整地址 */
  formattedAddress?: string;
}

/**
 * 地理编码结果
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: Address;
}

/**
 * 位置变化事件数据
 */
export interface PositionChangedEvent extends LocationResult {
  watchId?: string;
}

/**
 * 权限变化事件数据
 */
export interface PermissionChangedEvent {
  granted: boolean;
  status: string;
}

// MARK: - Location 模块类

export class LocationModule {
  private core: BridgeCore;
  private watchCallbacks = new Map<string, (position: PositionChangedEvent) => void>();

  constructor(core: BridgeCore) {
    this.core = core;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 监听位置变化事件
    this.core.on('Location.PositionChanged', (data: PositionChangedEvent) => {
      if (data.watchId && this.watchCallbacks.has(data.watchId)) {
        this.watchCallbacks.get(data.watchId)?.(data);
      }
    });
  }

  /**
   * 检查是否有位置权限
   */
  async hasPermission(): Promise<PermissionResult> {
    return await this.core.invoke<PermissionResult>('Location.HasPermission');
  }

  /**
   * 请求位置权限
   */
  async requestPermission(params?: RequestPermissionParams): Promise<PermissionResult> {
    return await this.core.invoke<PermissionResult>('Location.RequestPermission', params);
  }

  /**
   * 获取权限状态
   */
  async getPermissionStatus(): Promise<PermissionStatusResult> {
    return await this.core.invoke<PermissionStatusResult>('Location.GetPermissionStatus');
  }

  /**
   * 打开系统设置
   */
  async openSettings(): Promise<{ opened: boolean }> {
    return await this.core.invoke<{ opened: boolean }>('Location.OpenSettings');
  }

  /**
   * 获取当前位置
   */
  async getCurrentPosition(params?: GetPositionParams): Promise<LocationResult> {
    return await this.core.invoke<LocationResult>('Location.GetCurrentPosition', params);
  }

  /**
   * 监听位置变化
   */
  async watchPosition(
    callback: (position: PositionChangedEvent) => void,
    params?: WatchPositionParams
  ): Promise<string> {
    const result = await this.core.invoke<WatchResult>('Location.WatchPosition', params);
    this.watchCallbacks.set(result.watchId, callback);
    return result.watchId;
  }

  /**
   * 停止位置监听
   */
  async clearWatch(watchId: string): Promise<{ cleared: boolean }> {
    this.watchCallbacks.delete(watchId);
    return await this.core.invoke<{ cleared: boolean }>('Location.ClearWatch', { watchId });
  }

  /**
   * 停止所有位置监听
   */
  async clearAllWatches(): Promise<void> {
    const watchIds = Array.from(this.watchCallbacks.keys());
    for (const watchId of watchIds) {
      await this.clearWatch(watchId);
    }
  }

  /**
   * 地理编码（地址转坐标）
   */
  async geocode(address: string): Promise<GeocodeResult> {
    return await this.core.invoke<GeocodeResult>('Location.Geocode', { address });
  }

  /**
   * 反向地理编码（坐标转地址）
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<Address> {
    return await this.core.invoke<Address>('Location.ReverseGeocode', { latitude, longitude });
  }

  /**
   * 计算两点之间的距离（米）
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * 监听权限变化
   */
  onPermissionChanged(callback: (data: PermissionChangedEvent) => void): () => void {
    return this.core.on('Location.PermissionChanged', callback);
  }
}

export default LocationModule;
