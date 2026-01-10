/**
 * Events 模块 - 系统事件类型定义
 * 
 * 定义 Native → Web 事件的类型
 */

// =============================================================================
// 系统事件类型
// =============================================================================

/**
 * 所有系统事件名称
 */
export type SystemEventName =
  | 'System.AppearanceChanged'  // 系统外观变化（深色/浅色模式）
  | 'System.FontScaleChanged'   // 系统字体大小变化
  | 'App.Foreground'            // 应用进入前台
  | 'App.Background'            // 应用进入后台
  | 'App.ExitRequested'         // Native 请求 Web 做清理后退出
  | 'App.MemoryWarning'         // 内存警告
  | 'Network.Changed'           // 网络状态变化
  | 'Keyboard.WillShow'         // 键盘即将显示
  | 'Keyboard.DidShow'          // 键盘已显示
  | 'Keyboard.WillHide'         // 键盘即将隐藏
  | 'Keyboard.DidHide';         // 键盘已隐藏

/**
 * 系统外观变化事件数据
 */
export interface AppearanceChangedEventData {
  /** 当前外观模式 */
  appearance: 'light' | 'dark';
}

/**
 * 字体缩放变化事件数据
 */
export interface FontScaleChangedEventData {
  /** 当前字体缩放比例 */
  scale: number;
}

/**
 * 应用前台事件数据
 */
export interface AppForegroundEventData {
  /** 进入前台的时间戳 */
  timestamp: number;
}

/**
 * 应用后台事件数据
 */
export interface AppBackgroundEventData {
  /** 进入后台的时间戳 */
  timestamp: number;
}

/**
 * 退出请求事件数据
 */
export interface ExitRequestedEventData {
  /** 退出原因 */
  reason?: string;
  /** 超时时间（毫秒），Web 需要在此时间内完成清理 */
  timeout?: number;
}

/**
 * 内存警告事件数据
 */
export interface MemoryWarningEventData {
  /** 警告级别 */
  level: 'low' | 'critical';
}

/**
 * 网络变化事件数据
 */
export interface NetworkChangedEventData {
  /** 网络类型 */
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  /** 是否已连接 */
  isConnected: boolean;
}

/**
 * 键盘显示事件数据
 */
export interface KeyboardShowEventData {
  /** 键盘高度 */
  height: number;
  /** 动画时长（毫秒） */
  animationDuration: number;
}

/**
 * 键盘隐藏事件数据
 */
export interface KeyboardHideEventData {
  /** 动画时长（毫秒） */
  animationDuration: number;
}

/**
 * 事件数据类型映射
 */
export interface EventDataMap {
  'System.AppearanceChanged': AppearanceChangedEventData;
  'System.FontScaleChanged': FontScaleChangedEventData;
  'App.Foreground': AppForegroundEventData;
  'App.Background': AppBackgroundEventData;
  'App.ExitRequested': ExitRequestedEventData;
  'App.MemoryWarning': MemoryWarningEventData;
  'Network.Changed': NetworkChangedEventData;
  'Keyboard.WillShow': KeyboardShowEventData;
  'Keyboard.DidShow': KeyboardShowEventData;
  'Keyboard.WillHide': KeyboardHideEventData;
  'Keyboard.DidHide': KeyboardHideEventData;
}
