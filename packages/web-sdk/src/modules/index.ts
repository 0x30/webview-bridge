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
  type InstalledApp,
  type GetInstalledAppsOptions,
  type InstalledAppsResult,
  type AppDetails,
  type CanOpenURLResult,
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
  type ClipboardReadResult,
  type ClipboardWriteParams,
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
  type CanOpenURLResult as SystemCanOpenURLResult,
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

// Contacts 模块
// Contacts 模块
export {
  ContactsModule,
  type Contact,
  type PhoneNumber,
  type EmailAddress,
  type GetContactsParams,
  type GetContactsResult,
  type CreateContactParams,
  type PermissionResult as ContactsPermissionResult,
} from './contacts';

// Media 模块
export {
  MediaModule,
  type CameraDevice,
  type MediaType,
  type MediaResult,
  type MediaCancelledResult,
  type MultiMediaResult,
  type TakePhotoParams,
  type RecordVideoParams,
  type PickMediaParams,
  type Album,
  type PhotoInfo,
  type GetPhotosParams,
  type GetPhotosResult,
  type MediaPermissionType,
  type MediaPermissionResult,
} from './media';

// Location 模块
export {
  LocationModule,
  type LocationResult,
  type GetPositionParams,
  type WatchPositionParams,
  type RequestPermissionParams as LocationRequestPermissionParams,
  type PermissionResult as LocationPermissionResult,
  type PermissionStatusResult as LocationPermissionStatusResult,
  type WatchResult,
  type Address,
  type GeocodeResult,
  type PositionChangedEvent,
  type PermissionChangedEvent as LocationPermissionChangedEvent,
} from './location';

// Biometrics 模块
export {
  BiometricsModule,
  type BiometryType,
  type BiometricsAvailability,
  type BiometryTypeInfo,
  type AuthenticateParams,
  type AuthenticateResult,
  type EnrollmentResult,
} from './biometrics';

// NFC 模块
export {
  NFCModule,
  type TNFType,
  type NFCAvailability,
  type NFCEnabled,
  type NDEFRecord,
  type ScanParams as NFCScanParams,
  type ScanResult as NFCScanResult,
  type WriteRecordParams,
  type WriteParams as NFCWriteParams,
  type WriteResult as NFCWriteResult,
  type TagDetectedEvent,
  type WriteSuccessEvent,
  type WriteErrorEvent,
  type NFCErrorEvent,
} from './nfc';

// Network 模块
export {
  NetworkModule,
  type ConnectionType,
  type CellularType,
  type NetworkStatus,
  type MonitoringResult,
} from './network';

// Custom 模块（自定义模块示例）
export {
  CustomModule,
  type AlertOptions,
  type AlertResult,
  type ConfirmOptions,
  type ConfirmResult,
  type PromptOptions,
  type PromptResult,
  type ToastOptions,
  type LoadingOptions,
  type ActionSheetOptions,
  type ActionSheetResult,
} from './custom';

// Keyboard 模块
export {
  KeyboardModule,
  type KeyboardInfo,
  type KeyboardEventData,
  type KeyboardStyle,
  type KeyboardResizeMode,
} from './keyboard';

// ScreenOrientation 模块
export {
  ScreenOrientationModule,
  type OrientationType,
  type OrientationInfo,
} from './screenOrientation';

// Motion 模块
export {
  MotionModule,
  type AccelerometerData,
  type GyroscopeData,
  type OrientationData,
  type MotionOptions,
  type MotionStartResult,
  type MotionStopResult,
} from './motion';

// Browser 模块
export {
  BrowserModule,
  type PresentationStyle,
  type BrowserOpenOptions,
  type BrowserPrefetchOptions,
  type BrowserOpenResult,
  type BrowserCloseResult,
  type BrowserPrefetchResult,
  type BrowserEventData,
} from './browser';
