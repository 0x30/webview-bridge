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

// Contacts 模块
export {
  ContactsModule,
  type Contact,
  type PhoneNumber,
  type EmailAddress,
  type PostalAddress,
  type GetContactsParams,
  type GetContactsResult,
  type PickContactResult,
  type CreateContactParams,
  type ContactsPermissionResult,
} from './contacts';

// Media 模块
export {
  MediaModule,
  type CameraDevice,
  type MediaType,
  type MediaResult,
  type TakePhotoParams,
  type RecordVideoParams,
  type PickMediaParams,
  type PickMediaResult,
  type Album,
  type PhotoInfo,
  type GetPhotosParams,
  type GetPhotosResult,
  type SaveToAlbumParams,
  type MediaPermissionType,
  type MediaPermissionResult,
} from './media';

// Location 模块
export {
  LocationModule,
  type Coordinates,
  type Position,
  type LocationResult,
  type GetPositionParams,
  type WatchPositionParams,
  type RequestPermissionParams as LocationRequestPermissionParams,
  type PermissionResult as LocationPermissionResult,
  type PermissionStatusResult as LocationPermissionStatusResult,
  type WatchResult,
  type GeocodeParams,
  type ReverseGeocodeParams,
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
