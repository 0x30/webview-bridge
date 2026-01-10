/**
 * Permission 模块 - 系统权限统一管理
 * 
 * 覆盖 iOS 和 Android 权限的并集，提供统一的权限查询和请求接口
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 权限类型定义
// =============================================================================

/**
 * 权限类型枚举
 * 覆盖 iOS 和 Android 的权限并集
 */
export type PermissionType =
  // =========== 联系人与通讯 ===========
  | 'contacts'              // 通讯录访问
  | 'phone'                 // 电话状态/拨打电话 (Android)
  | 'callLog'               // 通话记录 (Android)
  | 'sms'                   // 短信读写 (Android)
  
  // =========== 媒体与存储 ===========
  | 'camera'                // 相机
  | 'microphone'            // 麦克风/录音
  | 'photos'                // 相册/照片库 (iOS: PHPhotoLibrary, Android: READ_MEDIA_IMAGES)
  | 'photosAddOnly'         // 仅添加照片 (iOS)
  | 'mediaLibrary'          // 媒体库 (iOS: Apple Music)
  | 'storage'               // 外部存储 (Android: READ/WRITE_EXTERNAL_STORAGE)
  | 'manageExternalStorage' // 管理所有文件 (Android 11+ MANAGE_EXTERNAL_STORAGE)
  | 'video'                 // 视频录制
  | 'readMediaImages'       // 读取图片 (Android 13+ READ_MEDIA_IMAGES)
  | 'readMediaVideo'        // 读取视频 (Android 13+ READ_MEDIA_VIDEO)
  | 'readMediaAudio'        // 读取音频 (Android 13+ READ_MEDIA_AUDIO)
  
  // =========== 位置 ===========
  | 'locationWhenInUse'     // 使用时定位
  | 'locationAlways'        // 始终定位
  | 'locationBackground'    // 后台定位 (Android: ACCESS_BACKGROUND_LOCATION)
  | 'preciseLocation'       // 精确位置 (iOS 14+, Android 12+)
  
  // =========== 传感器与运动 ===========
  | 'sensors'               // 传感器 (Android: BODY_SENSORS)
  | 'motion'                // 运动与健身 (iOS: CMMotionActivityManager)
  | 'activityRecognition'   // 活动识别 (Android: ACTIVITY_RECOGNITION)
  | 'bodySensors'           // 身体传感器 (Android: 心率等)
  | 'bodySensorsBackground' // 后台身体传感器 (Android 13+)
  
  // =========== 健康与健身 ===========
  | 'health'                // 健康数据 (iOS: HealthKit)
  | 'healthShare'           // 健康数据分享 (iOS)
  | 'healthUpdate'          // 健康数据更新 (iOS)
  
  // =========== 通知与提醒 ===========
  | 'notifications'         // 推送通知 (iOS: UNUserNotificationCenter)
  | 'criticalAlerts'        // 紧急通知 (iOS)
  | 'postNotifications'     // 发送通知 (Android 13+ POST_NOTIFICATIONS)
  | 'reminders'             // 提醒事项 (iOS: EKEventStore)
  
  // =========== 日历与事件 ===========
  | 'calendar'              // 日历读写
  | 'calendarWriteOnly'     // 仅写入日历 (iOS 17+)
  
  // =========== 蓝牙与连接 ===========
  | 'bluetooth'             // 蓝牙 (iOS: CBCentralManager)
  | 'bluetoothScan'         // 蓝牙扫描 (Android 12+ BLUETOOTH_SCAN)
  | 'bluetoothConnect'      // 蓝牙连接 (Android 12+ BLUETOOTH_CONNECT)
  | 'bluetoothAdvertise'    // 蓝牙广播 (Android 12+ BLUETOOTH_ADVERTISE)
  | 'nearbyDevices'         // 附近设备 (Android 12+ NEARBY_WIFI_DEVICES)
  | 'nearbyWifiDevices'     // 附近 WiFi 设备 (Android 13+)
  
  // =========== 网络 ===========
  | 'wifi'                  // WiFi 状态 (Android: ACCESS_WIFI_STATE)
  | 'networkState'          // 网络状态 (Android: ACCESS_NETWORK_STATE)
  | 'localNetwork'          // 本地网络 (iOS 14+)
  
  // =========== 智能家居 ===========
  | 'homeKit'               // HomeKit (iOS)
  
  // =========== 语音与识别 ===========
  | 'speechRecognition'     // 语音识别 (iOS: SFSpeechRecognizer)
  
  // =========== 追踪与广告 ===========
  | 'appTracking'           // 应用追踪透明度 (iOS 14+: ATTrackingManager)
  
  // =========== 生物识别 ===========
  | 'biometrics'            // 生物识别 (Face ID / Touch ID / 指纹)
  | 'faceId'                // Face ID (iOS)
  
  // =========== 剪贴板 ===========
  | 'clipboard'             // 剪贴板访问 (iOS 14+ 需要)
  
  // =========== Android 特有权限 ===========
  | 'installPackages'       // 安装未知应用 (REQUEST_INSTALL_PACKAGES)
  | 'systemAlertWindow'     // 悬浮窗 (SYSTEM_ALERT_WINDOW)
  | 'writeSettings'         // 修改系统设置 (WRITE_SETTINGS)
  | 'accessibilityService'  // 无障碍服务
  | 'usageStats'            // 使用情况统计 (PACKAGE_USAGE_STATS)
  | 'notificationPolicy'    // 勿扰模式 (ACCESS_NOTIFICATION_POLICY)
  | 'exactAlarm'            // 精确闹钟 (Android 12+ SCHEDULE_EXACT_ALARM)
  | 'scheduleExactAlarm'    // 调度精确闹钟 (Android 12+)
  | 'ignoreBatteryOptimizations' // 忽略电池优化 (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
  | 'requestDeletePackages' // 请求删除应用
  | 'readPhoneState'        // 读取电话状态 (READ_PHONE_STATE)
  | 'readPhoneNumbers'      // 读取电话号码 (READ_PHONE_NUMBERS)
  | 'answerPhoneCalls'      // 接听电话 (ANSWER_PHONE_CALLS)
  | 'readCallLog'           // 读取通话记录 (READ_CALL_LOG)
  | 'writeCallLog'          // 写入通话记录 (WRITE_CALL_LOG)
  | 'addVoicemail'          // 添加语音邮件 (ADD_VOICEMAIL)
  | 'useSip'                // 使用 SIP (USE_SIP)
  | 'receiveMms'            // 接收彩信 (RECEIVE_MMS)
  | 'receiveSms'            // 接收短信 (RECEIVE_SMS)
  | 'receiveWapPush'        // 接收 WAP 推送 (RECEIVE_WAP_PUSH)
  | 'sendSms'               // 发送短信 (SEND_SMS)
  | 'readSms'               // 读取短信 (READ_SMS)
  | 'nfc'                   // NFC (NFC)
  | 'uwb'                   // 超宽带 (UWB_RANGING - Android 12+)
  
  // =========== iOS 特有权限 ===========
  | 'siri'                  // Siri 与快捷指令
  | 'focusStatus'           // 专注状态 (iOS 15+)
  | 'musicKit'              // Apple Music
  | 'appleMusic'            // Apple Music (等同 musicKit)
  | 'applePay';             // Apple Pay

/**
 * 权限状态枚举
 */
export type PermissionStatus =
  | 'granted'           // 已授权
  | 'denied'            // 已拒绝
  | 'restricted'        // 受限（如家长控制、企业策略）
  | 'notDetermined'     // 未决定（首次请求前）
  | 'limited'           // 有限授权（如 iOS 14+ 相册选择部分照片）
  | 'permanentlyDenied' // 永久拒绝（需要去设置中开启）
  | 'provisional';      // 临时授权（iOS 通知的临时授权）

/**
 * 权限查询/请求结果
 */
export interface PermissionResult {
  /** 权限类型 */
  permission: PermissionType;
  /** 权限状态 */
  status: PermissionStatus;
  /** 是否可以再次请求（某些平台拒绝后不可再请求） */
  canRequestAgain?: boolean;
  /** 是否应该显示权限说明（Android shouldShowRequestPermissionRationale） */
  shouldShowRationale?: boolean;
}

/**
 * 批量权限请求结果
 */
export interface MultiplePermissionResult {
  /** 全部权限结果 */
  results: PermissionResult[];
  /** 是否全部授权 */
  allGranted: boolean;
  /** 已授权的权限列表 */
  granted: PermissionType[];
  /** 被拒绝的权限列表 */
  denied: PermissionType[];
}

/**
 * 权限请求选项
 */
export interface PermissionRequestOptions {
  /** 权限类型 */
  permission: PermissionType;
  /** 权限说明（Android 可显示给用户） */
  rationale?: string;
}

/**
 * 权限分组（用于 UI 展示）
 */
export const PermissionGroups = {
  /** 联系人与通讯 */
  CONTACTS_COMMUNICATION: [
    'contacts', 'phone', 'callLog', 'sms', 'readPhoneState', 
    'readPhoneNumbers', 'answerPhoneCalls', 'readCallLog', 'writeCallLog',
    'addVoicemail', 'useSip', 'receiveMms', 'receiveSms', 'receiveWapPush',
    'sendSms', 'readSms'
  ] as PermissionType[],
  
  /** 媒体与存储 */
  MEDIA_STORAGE: [
    'camera', 'microphone', 'photos', 'photosAddOnly', 'mediaLibrary', 
    'storage', 'manageExternalStorage', 'video', 'readMediaImages',
    'readMediaVideo', 'readMediaAudio'
  ] as PermissionType[],
  
  /** 位置 */
  LOCATION: [
    'locationWhenInUse', 'locationAlways', 'locationBackground', 'preciseLocation'
  ] as PermissionType[],
  
  /** 传感器与运动 */
  SENSORS_MOTION: [
    'sensors', 'motion', 'activityRecognition', 'bodySensors', 'bodySensorsBackground'
  ] as PermissionType[],
  
  /** 健康 */
  HEALTH: ['health', 'healthShare', 'healthUpdate'] as PermissionType[],
  
  /** 通知 */
  NOTIFICATIONS: [
    'notifications', 'criticalAlerts', 'postNotifications', 'notificationPolicy'
  ] as PermissionType[],
  
  /** 日历与提醒 */
  CALENDAR: ['calendar', 'calendarWriteOnly', 'reminders'] as PermissionType[],
  
  /** 蓝牙与网络 */
  CONNECTIVITY: [
    'bluetooth', 'bluetoothScan', 'bluetoothConnect', 'bluetoothAdvertise',
    'nearbyDevices', 'nearbyWifiDevices', 'wifi', 'networkState', 'localNetwork',
    'nfc', 'uwb'
  ] as PermissionType[],
  
  /** 生物识别 */
  BIOMETRICS: ['biometrics', 'faceId'] as PermissionType[],
  
  /** 系统设置 */
  SYSTEM: [
    'installPackages', 'systemAlertWindow', 'writeSettings',
    'accessibilityService', 'usageStats', 'exactAlarm', 'scheduleExactAlarm',
    'ignoreBatteryOptimizations', 'requestDeletePackages'
  ] as PermissionType[],
  
  /** 隐私追踪 */
  PRIVACY: ['appTracking', 'clipboard'] as PermissionType[],
  
  /** Apple 服务 */
  APPLE_SERVICES: [
    'siri', 'homeKit', 'focusStatus', 'musicKit', 'appleMusic', 'applePay'
  ] as PermissionType[],
} as const;

// =============================================================================
// Permission 模块实现
// =============================================================================

export class PermissionModule implements BridgeModule {
  readonly moduleName = 'Permission';
  readonly methods = ['GetStatus', 'Request', 'RequestMultiple', 'OpenSettings'] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 获取指定权限的当前状态
   * @param permission 权限类型
   * @returns 权限状态结果
   */
  async getStatus(permission: PermissionType): Promise<PermissionResult> {
    return this.bridge.send<PermissionResult>('Permission.GetStatus', {
      permission,
    });
  }

  /**
   * 请求指定权限
   * @param permission 权限类型
   * @param rationale 权限说明（可选，Android 可显示给用户）
   * @returns 权限请求结果
   */
  async request(permission: PermissionType, rationale?: string): Promise<PermissionResult> {
    return this.bridge.send<PermissionResult>('Permission.Request', {
      permission,
      rationale,
    });
  }

  /**
   * 批量请求多个权限
   * @param permissions 权限类型数组
   * @returns 批量权限请求结果
   */
  async requestMultiple(permissions: PermissionType[]): Promise<MultiplePermissionResult> {
    return this.bridge.send<MultiplePermissionResult>('Permission.RequestMultiple', {
      permissions,
    });
  }

  /**
   * 检查权限是否已授权
   * @param permission 权限类型
   * @returns 是否已授权
   */
  async isGranted(permission: PermissionType): Promise<boolean> {
    const result = await this.getStatus(permission);
    return result.status === 'granted' || result.status === 'limited';
  }

  /**
   * 打开应用设置页面（用于引导用户手动开启权限）
   */
  async openSettings(): Promise<void> {
    return this.bridge.send<void>('Permission.OpenSettings');
  }

  /**
   * 获取多个权限的状态
   * @param permissions 权限类型数组
   * @returns 权限状态数组
   */
  async getMultipleStatus(permissions: PermissionType[]): Promise<PermissionResult[]> {
    return this.bridge.send<PermissionResult[]>('Permission.GetMultipleStatus', {
      permissions,
    });
  }
}
