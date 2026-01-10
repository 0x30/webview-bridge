/**
 * 模块统一导出
 */

// App 模块
export { 
  AppModule,
  type LifecycleState,
  type LaunchSource,
  type LaunchParams,
  type AppInfo,
  type ExitResult,
} from './app';

// Device 模块
export {
  DeviceModule,
  type OSType,
  type SafeAreaInsets,
  type ScreenInfo,
  type BatteryInfo,
  type NetworkInfo,
  type StorageInfo as DeviceStorageInfo,
  type MemoryInfo,
  type DeviceCapabilities,
  type DeviceInfo,
} from './device';

// Permission 模块
export {
  PermissionModule,
  type PermissionType,
  type PermissionStatus,
  type PermissionResult,
  type MultiplePermissionResult,
  type PermissionRequestOptions,
  PermissionGroups,
} from './permission';

// Clipboard 模块
export {
  ClipboardModule,
  type ClipboardContentType,
  type ClipboardContent,
  type ClipboardSetParams,
  type ClipboardHasContentResult,
} from './clipboard';

// Haptics 模块
export {
  HapticsModule,
  type ImpactStyle,
  type NotificationFeedbackType,
  type SelectionFeedbackType,
  type VibrationPattern,
  type VibrateOptions,
  type HapticsCapabilities,
} from './haptics';

// StatusBar 模块
export {
  StatusBarModule,
  type StatusBarStyle,
  type StatusBarAnimation,
  type SetStatusBarStyleParams,
  type SetStatusBarVisibilityParams,
  type SetStatusBarBackgroundParams,
  type StatusBarInfo,
} from './statusbar';

// System 模块
export {
  SystemModule,
  type OpenURLResult,
  type OpenURLResponse,
  type CanOpenURLResult,
  type ShareContentType,
  type ShareContent,
  type ShareResult,
  type AppearanceMode,
  type SystemInfo,
  type OpenAppStoreParams,
} from './system';

// Storage 模块
export {
  StorageModule,
  type StorageSecurityLevel,
  type StorageSetParams,
  type StorageGetParams,
  type StorageRemoveParams,
  type StorageAccessControl,
  type StorageGetResult,
  type StorageMultiGetResult,
  type StorageKeysResult,
  type StorageInfo,
} from './storage';
