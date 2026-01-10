/**
 * Media 模块 - 相机相册功能
 *
 * 提供拍照、录像、选择相册图片/视频等功能
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 媒体类型
 */
export type MediaType = 'image' | 'video' | 'any'

/**
 * 相机设备
 */
export type CameraDevice = 'front' | 'rear'

/**
 * 视频质量
 */
export type VideoQuality = 'low' | 'medium' | 'high'

/**
 * 权限类型
 */
export type MediaPermissionType = 'camera' | 'photos' | 'microphone' | 'storage'

/**
 * 媒体权限结果
 */
export interface MediaPermissionResult {
  /** 权限类型 */
  type: MediaPermissionType
  /** 是否已授权 */
  granted: boolean
  /** 权限状态 */
  status: 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'limited' | 'unknown'
}

/**
 * 拍照参数
 */
export interface TakePhotoParams {
  /** 摄像头选择 */
  cameraDevice?: CameraDevice
  /** 是否允许编辑 */
  allowsEditing?: boolean
  /** 图片质量 (0-1) */
  quality?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
}

/**
 * 录像参数
 */
export interface RecordVideoParams {
  /** 摄像头选择 */
  cameraDevice?: CameraDevice
  /** 视频质量 */
  quality?: VideoQuality
  /** 最大时长（秒） */
  maxDuration?: number
}

/**
 * 选择媒体参数
 */
export interface PickMediaParams {
  /** 媒体类型 */
  mediaType?: MediaType
  /** 最大选择数量 */
  maxCount?: number
  /** 图片质量 (0-1) */
  quality?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
}

/**
 * 媒体结果
 */
export interface MediaResult {
  /** Base64 数据 */
  base64: string
  /** 宽度 */
  width?: number
  /** 高度 */
  height?: number
  /** MIME 类型 */
  mimeType: string
  /** 时长（视频） */
  duration?: number
  /** 文件 URL（本地路径） */
  url?: string
}

/**
 * 取消结果
 */
export interface MediaCancelledResult {
  /** 是否取消 */
  cancelled: true
}

/**
 * 多媒体结果
 */
export interface MultiMediaResult {
  /** 媒体项列表 */
  items: MediaResult[]
}

/**
 * 相册信息
 */
export interface Album {
  /** 相册标识符 */
  identifier: string
  /** 相册标题 */
  title: string
  /** 照片数量 */
  count: number
  /** 相册类型 */
  type: 'smart' | 'user'
}

/**
 * 照片信息
 */
export interface PhotoInfo {
  /** 照片标识符 */
  identifier: string
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
  /** 创建日期（时间戳） */
  creationDate: number
  /** 媒体类型 */
  mediaType: 'image' | 'video'
  /** 时长（视频） */
  duration?: number
}

/**
 * 获取照片参数
 */
export interface GetPhotosParams {
  /** 相册 ID */
  albumId?: string
  /** 媒体类型 */
  mediaType?: MediaType
  /** 偏移量 */
  offset?: number
  /** 限制数量 */
  limit?: number
}

/**
 * 获取照片结果
 */
export interface GetPhotosResult {
  /** 照片列表 */
  photos: PhotoInfo[]
  /** 总数 */
  total: number
  /** 偏移量 */
  offset: number
  /** 限制数量 */
  limit: number
}

// =============================================================================
// Media 模块实现
// =============================================================================

export class MediaModule implements BridgeModule {
  readonly moduleName = 'Media'
  readonly methods = [
    'TakePhoto',
    'RecordVideo',
    'PickImage',
    'PickVideo',
    'PickMedia',
    'GetAlbums',
    'GetPhotos',
    'SaveToAlbum',
  ] as const

  constructor(private bridge: BridgeCore) {}

  /**
   * 拍照
   * @param params 拍照参数
   */
  async takePhoto(params?: TakePhotoParams): Promise<MediaResult | MediaCancelledResult> {
    return this.bridge.send<MediaResult | MediaCancelledResult>('Media.TakePhoto', params as Record<string, unknown>)
  }

  /**
   * 录像
   * @param params 录像参数
   */
  async recordVideo(params?: RecordVideoParams): Promise<MediaResult | MediaCancelledResult> {
    return this.bridge.send<MediaResult | MediaCancelledResult>('Media.RecordVideo', params as Record<string, unknown>)
  }

  /**
   * 选择图片
   * @param params 选择参数
   */
  async pickImage(params?: PickMediaParams): Promise<MediaResult | MultiMediaResult | MediaCancelledResult> {
    return this.bridge.send<MediaResult | MultiMediaResult | MediaCancelledResult>('Media.PickImage', params as Record<string, unknown>)
  }

  /**
   * 选择视频
   * @param params 选择参数
   */
  async pickVideo(params?: PickMediaParams): Promise<MediaResult | MediaCancelledResult> {
    return this.bridge.send<MediaResult | MediaCancelledResult>('Media.PickVideo', params as Record<string, unknown>)
  }

  /**
   * 选择媒体（图片或视频）
   * @param params 选择参数
   */
  async pickMedia(params?: PickMediaParams): Promise<MediaResult | MultiMediaResult | MediaCancelledResult> {
    return this.bridge.send<MediaResult | MultiMediaResult | MediaCancelledResult>('Media.PickMedia', params as Record<string, unknown>)
  }

  /**
   * 获取相册列表
   */
  async getAlbums(): Promise<{ albums: Album[] }> {
    return this.bridge.send<{ albums: Album[] }>('Media.GetAlbums')
  }

  /**
   * 获取照片列表
   * @param params 查询参数
   */
  async getPhotos(params?: GetPhotosParams): Promise<GetPhotosResult> {
    return this.bridge.send<GetPhotosResult>('Media.GetPhotos', params as Record<string, unknown>)
  }

  /**
   * 保存图片到相册
   * @param base64Data Base64 图片数据
   */
  async saveToAlbum(base64Data: string): Promise<{ success: boolean }> {
    return this.bridge.send<{ success: boolean }>('Media.SaveToAlbum', { data: base64Data })
  }
}
