/**
 * App 模块 - 宿主应用级别信息与控制
 * 
 * 用于获取应用启动参数、生命周期状态等
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core';
import { BridgeModule } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 应用生命周期状态
 */
export type LifecycleState = 
  | 'foreground'  // 前台运行
  | 'background'  // 后台运行
  | 'inactive';   // 非活动状态（iOS 特有，如来电时）

/**
 * 启动来源类型
 */
export type LaunchSource = 
  | 'normal'          // 正常启动
  | 'urlScheme'       // URL Scheme 启动
  | 'universalLink'   // Universal Link 启动 (iOS)
  | 'appLink'         // App Link 启动 (Android)
  | 'deepLink'        // 深度链接启动
  | 'push'            // 推送通知启动
  | 'shortcut'        // 快捷方式启动 (3D Touch / App Shortcuts)
  | 'widget'          // 小组件启动
  | 'spotlight'       // Spotlight 搜索启动 (iOS)
  | 'handoff'         // Handoff 启动 (iOS)
  | 'siri'            // Siri 启动 (iOS)
  | 'carPlay'         // CarPlay 启动 (iOS)
  | 'unknown';        // 未知来源

/**
 * 应用启动参数
 */
export interface LaunchParams {
  /** 启动来源 */
  source: LaunchSource;
  /** 启动 URL（如果通过 URL Scheme / Deep Link 启动） */
  url?: string;
  /** URL 参数解析结果 */
  params: Record<string, string>;
  /** 推送通知数据（如果通过推送启动） */
  pushData?: Record<string, unknown>;
  /** 快捷方式类型（如果通过快捷方式启动） */
  shortcutType?: string;
  /** 用户活动类型（iOS Handoff / Spotlight） */
  userActivityType?: string;
  /** Referrer 信息 (Android) */
  referrer?: string;
}

/**
 * 应用信息
 */
export interface AppInfo {
  /** 应用 Bundle ID (iOS) / Package Name (Android) */
  bundleId: string;
  /** 应用显示名称 */
  appName: string;
  /** 应用版本号 */
  appVersion: string;
  /** 应用构建号 */
  buildNumber: string;
  /** 是否为 Debug 构建 */
  isDebug: boolean;
  /** 是否为 TestFlight 构建 (iOS) */
  isTestFlight?: boolean;
  /** 安装来源 (Android: google_play, huawei, etc.) */
  installSource?: string;
}

/**
 * 应用退出请求结果
 */
export interface ExitResult {
  /** 是否允许退出 */
  allowed: boolean;
  /** 拒绝原因（如果不允许退出） */
  reason?: string;
}

/**
 * 已安装应用信息
 */
export interface InstalledApp {
  /** 包名 */
  packageName: string;
  /** 应用名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 版本代码 */
  versionCode: number;
  /** 是否为系统应用 */
  isSystemApp: boolean;
  /** 应用图标 (Base64 Data URL，可选) */
  icon?: string;
}

/**
 * 获取已安装应用的选项
 */
export interface GetInstalledAppsOptions {
  /** 是否包含系统应用 */
  includeSystemApps?: boolean;
  /** 是否包含应用图标 */
  includeIcons?: boolean;
  /** 最大返回数量 */
  limit?: number;
}

/**
 * 已安装应用列表结果
 */
export interface InstalledAppsResult {
  /** 应用列表 */
  apps: InstalledApp[];
  /** 总数 */
  count: number;
}

/**
 * 应用详情
 */
export interface AppDetails {
  /** 包名 */
  packageName: string;
  /** 应用名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 版本代码 */
  versionCode: number;
  /** 目标 SDK 版本 */
  targetSdk: number;
  /** 最低 SDK 版本 */
  minSdk?: number;
  /** 是否为系统应用 */
  isSystemApp: boolean;
  /** 是否启用 */
  isEnabled: boolean;
  /** 首次安装时间 */
  firstInstallTime: number;
  /** 最后更新时间 */
  lastUpdateTime: number;
  /** 请求的权限列表 */
  permissions: string[];
  /** 应用源目录 */
  sourceDir?: string;
  /** 数据目录 */
  dataDir?: string;
}

/**
 * CanOpenURL 结果
 */
export interface CanOpenURLResult {
  /** URL */
  url: string;
  /** 是否可以打开 */
  canOpen: boolean;
}

// =============================================================================
// App 模块实现
// =============================================================================

export class AppModule implements BridgeModule {
  readonly moduleName = 'App';
  readonly methods = [
    'GetLaunchParams', 
    'Exit', 
    'GetLifecycleState',
    'GetAppInfo',
    'Minimize',
    'GetInstalledApps',
    'GetAppDetails',
    'CanOpenURL'
  ] as const;

  constructor(private bridge: BridgeCore) {}

  /**
   * 获取应用启动参数
   * 包括 URL Scheme / Intent / Universal Link 等启动信息
   * @returns 启动参数
   */
  async getLaunchParams(): Promise<LaunchParams> {
    return this.bridge.send<LaunchParams>('App.GetLaunchParams');
  }

  /**
   * 请求宿主应用退出
   * 注意：宿主应用可自行决定是否允许退出
   * @returns 退出请求结果
   */
  async exit(): Promise<ExitResult> {
    return this.bridge.send<ExitResult>('App.Exit');
  }

  /**
   * 获取当前应用生命周期状态
   * @returns 生命周期状态
   */
  async getLifecycleState(): Promise<LifecycleState> {
    return this.bridge.send<LifecycleState>('App.GetLifecycleState');
  }

  /**
   * 获取应用信息
   * @returns 应用信息
   */
  async getAppInfo(): Promise<AppInfo> {
    return this.bridge.send<AppInfo>('App.GetAppInfo');
  }

  /**
   * 请求将应用最小化到后台
   * 主要用于 Android，iOS 通常不支持
   */
  async minimize(): Promise<void> {
    return this.bridge.send<void>('App.Minimize');
  }

  /**
   * 获取已安装应用列表
   * 注意：Android 11+ 需要 QUERY_ALL_PACKAGES 权限
   * @param options 查询选项
   * @returns 已安装应用列表
   */
  async getInstalledApps(options: GetInstalledAppsOptions = {}): Promise<InstalledAppsResult> {
    return this.bridge.send<InstalledAppsResult>('App.GetInstalledApps', options);
  }

  /**
   * 获取指定应用的详细信息
   * @param packageName 应用包名
   * @returns 应用详情
   */
  async getAppDetails(packageName: string): Promise<AppDetails> {
    return this.bridge.send<AppDetails>('App.GetAppDetails', { packageName });
  }

  /**
   * 检查是否可以打开指定 URL
   * @param url 要检查的 URL
   * @returns 是否可以打开
   */
  async canOpenURL(url: string): Promise<CanOpenURLResult> {
    return this.bridge.send<CanOpenURLResult>('App.CanOpenURL', { url });
  }
}
