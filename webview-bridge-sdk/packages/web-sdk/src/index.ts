/**
 * WebView Bridge SDK
 * 
 * 跨平台 WebView Bridge SDK - Web JS 端
 * 
 * @packageDocumentation
 */

import { BridgeCore } from './core';
import { BridgeConfig, EventHandler } from './types';
import {
  AppModule,
  DeviceModule,
  PermissionModule,
  ClipboardModule,
  HapticsModule,
  StatusBarModule,
  SystemModule,
  StorageModule,
  ContactsModule,
  MediaModule,
  LocationModule,
  BiometricsModule,
  NFCModule,
  NetworkModule,
} from './modules';
import { SystemEventName, EventDataMap } from './events';

// =============================================================================
// Bridge 主类
// =============================================================================

/**
 * WebView Bridge SDK 主类
 * 
 * 提供语义化的 API 访问所有 Native 能力
 * 
 * @example
 * ```typescript
 * import { Bridge } from '@aspect/webview-bridge';
 * 
 * // 等待 Bridge 就绪
 * await Bridge.whenReady();
 * 
 * // 获取设备信息
 * const deviceInfo = await Bridge.device.getInfo();
 * 
 * // 请求权限
 * const result = await Bridge.permission.request('camera');
 * 
 * // 监听事件
 * Bridge.addEventListener('App.Foreground', (data) => {
 *   console.log('应用进入前台');
 * });
 * ```
 */
class WebViewBridge {
  private core: BridgeCore;

  /** App 模块 - 应用级别信息与控制 */
  public readonly app: AppModule;
  
  /** Device 模块 - 设备与系统信息 */
  public readonly device: DeviceModule;
  
  /** Permission 模块 - 权限管理 */
  public readonly permission: PermissionModule;
  
  /** Clipboard 模块 - 剪贴板访问 */
  public readonly clipboard: ClipboardModule;
  
  /** Haptics 模块 - 触觉反馈 */
  public readonly haptics: HapticsModule;
  
  /** StatusBar 模块 - 状态栏控制 */
  public readonly statusBar: StatusBarModule;
  
  /** System 模块 - 系统级功能 */
  public readonly system: SystemModule;
  
  /** Storage 模块 - 本地存储 */
  public readonly storage: StorageModule;

  /** Contacts 模块 - 联系人 */
  public readonly contacts: ContactsModule;

  /** Media 模块 - 相机与相册 */
  public readonly media: MediaModule;

  /** Location 模块 - 位置服务 */
  public readonly location: LocationModule;

  /** Biometrics 模块 - 生物识别 */
  public readonly biometrics: BiometricsModule;

  /** NFC 模块 - 近场通信 */
  public readonly nfc: NFCModule;

  /** Network 模块 - 网络状态 */
  public readonly network: NetworkModule;

  constructor(config?: BridgeConfig) {
    this.core = BridgeCore.getInstance(config);
    
    // 初始化所有模块
    this.app = new AppModule(this.core);
    this.device = new DeviceModule(this.core);
    this.permission = new PermissionModule(this.core);
    this.clipboard = new ClipboardModule(this.core);
    this.haptics = new HapticsModule(this.core);
    this.statusBar = new StatusBarModule(this.core);
    this.system = new SystemModule(this.core);
    this.storage = new StorageModule(this.core);
    this.contacts = new ContactsModule(this.core);
    this.media = new MediaModule(this.core);
    this.location = new LocationModule(this.core);
    this.biometrics = new BiometricsModule(this.core);
    this.nfc = new NFCModule(this.core);
    this.network = new NetworkModule(this.core);
  }

  /**
   * 等待 Bridge 就绪
   */
  async whenReady(): Promise<void> {
    return this.core.whenReady();
  }

  /**
   * 检查 Bridge 是否就绪
   */
  get isReady(): boolean {
    return this.core.getIsReady();
  }

  /**
   * 检查是否运行在 Native 环境
   */
  get isNative(): boolean {
    return this.core.isNativeEnvironment();
  }

  /**
   * 添加事件监听器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  addEventListener<K extends SystemEventName>(
    eventName: K,
    handler: EventHandler<EventDataMap[K]>
  ): void {
    this.core.addEventListener(eventName, handler);
  }

  /**
   * 移除事件监听器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  removeEventListener<K extends SystemEventName>(
    eventName: K,
    handler: EventHandler<EventDataMap[K]>
  ): void {
    this.core.removeEventListener(eventName, handler);
  }

  /**
   * 清空所有待处理回调（用于页面 reload）
   */
  clearPendingCallbacks(): void {
    this.core.clearPendingCallbacks();
  }

  /**
   * 销毁 Bridge 实例
   */
  destroy(): void {
    this.core.destroy();
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return this.core.getDebugInfo();
  }

  /**
   * 手动标记 Bridge 就绪（由 Native 调用）
   */
  markReady(): void {
    this.core.markReady();
  }
}

// =============================================================================
// 导出
// =============================================================================

// 创建默认实例
const Bridge = new WebViewBridge();

// 导出默认实例
export { Bridge };

// 导出类以支持自定义配置
export { WebViewBridge };

// 导出核心类
export { BridgeCore } from './core';

// 导出所有类型
export * from './types';

// 导出所有模块及其类型
export * from './modules';

// 导出事件类型
export * from './events';

// 默认导出
export default Bridge;
