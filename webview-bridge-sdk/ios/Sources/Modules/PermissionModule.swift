/**
 * Permission 模块 - 系统权限统一管理
 *
 * 覆盖 iOS 权限的查询和请求
 */

import Foundation
import UIKit
import AVFoundation
import Photos
import Contacts
import EventKit
import UserNotifications
import CoreLocation
import LocalAuthentication

// MARK: - 权限类型

/// iOS 支持的权限类型
public enum IOSPermissionType: String {
    // 媒体
    case camera
    case microphone
    case photos
    case photosAddOnly
    case mediaLibrary
    
    // 位置
    case locationWhenInUse
    case locationAlways
    
    // 联系人与日历
    case contacts
    case calendar
    case reminders
    
    // 通知
    case notifications
    
    // 其他
    case speechRecognition
    case motion
    case health
    case homeKit
    case siri
    case bluetooth
    case appTracking
    case faceId
    case localNetwork
    case focusStatus
}

// MARK: - 权限状态

/// 权限状态
public enum IOSPermissionStatus: String {
    case granted
    case denied
    case restricted
    case notDetermined
    case limited
    case permanentlyDenied
    case provisional
}

// MARK: - Permission 模块

public class PermissionModule: BridgeModule {
    
    public let moduleName = "Permission"
    public let methods = ["GetStatus", "Request", "RequestMultiple", "GetMultipleStatus", "OpenSettings"]
    
    private weak var bridge: WebViewBridge?
    private lazy var locationManager = CLLocationManager()
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetStatus":
            getStatus(params: params, callback: callback)
        case "Request":
            request(params: params, callback: callback)
        case "RequestMultiple":
            requestMultiple(params: params, callback: callback)
        case "GetMultipleStatus":
            getMultipleStatus(params: params, callback: callback)
        case "OpenSettings":
            openSettings(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - GetStatus
    
    private func getStatus(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let permissionString = params.getString("permission"),
              let permission = IOSPermissionType(rawValue: permissionString) else {
            callback(.failure(BridgeError.invalidParams("permission")))
            return
        }
        
        checkPermissionStatus(permission) { status in
            callback(.success([
                "permission": permissionString,
                "status": status.rawValue,
                "canRequestAgain": status == .notDetermined
            ]))
        }
    }
    
    // MARK: - Request
    
    private func request(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let permissionString = params.getString("permission"),
              let permission = IOSPermissionType(rawValue: permissionString) else {
            callback(.failure(BridgeError.invalidParams("permission")))
            return
        }
        
        requestPermission(permission) { status in
            callback(.success([
                "permission": permissionString,
                "status": status.rawValue,
                "canRequestAgain": false
            ]))
        }
    }
    
    // MARK: - RequestMultiple
    
    private func requestMultiple(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let permissionsArray = params["permissions"]?.arrayValue as? [String] else {
            callback(.failure(BridgeError.invalidParams("permissions")))
            return
        }
        
        let permissions = permissionsArray.compactMap { IOSPermissionType(rawValue: $0) }
        var results: [[String: Any]] = []
        var granted: [String] = []
        var denied: [String] = []
        
        let group = DispatchGroup()
        
        for permission in permissions {
            group.enter()
            requestPermission(permission) { status in
                let result: [String: Any] = [
                    "permission": permission.rawValue,
                    "status": status.rawValue,
                    "canRequestAgain": false
                ]
                results.append(result)
                
                if status == .granted || status == .limited {
                    granted.append(permission.rawValue)
                } else {
                    denied.append(permission.rawValue)
                }
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            callback(.success([
                "results": results,
                "allGranted": denied.isEmpty,
                "granted": granted,
                "denied": denied
            ]))
        }
    }
    
    // MARK: - GetMultipleStatus
    
    private func getMultipleStatus(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let permissionsArray = params["permissions"]?.arrayValue as? [String] else {
            callback(.failure(BridgeError.invalidParams("permissions")))
            return
        }
        
        let permissions = permissionsArray.compactMap { IOSPermissionType(rawValue: $0) }
        var results: [[String: Any]] = []
        
        let group = DispatchGroup()
        
        for permission in permissions {
            group.enter()
            checkPermissionStatus(permission) { status in
                results.append([
                    "permission": permission.rawValue,
                    "status": status.rawValue,
                    "canRequestAgain": status == .notDetermined
                ])
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            callback(.success(results))
        }
    }
    
    // MARK: - OpenSettings
    
    private func openSettings(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                callback(.failure(BridgeError(code: .internalError, message: "无法打开设置")))
                return
            }
            UIApplication.shared.open(url) { success in
                if success {
                    callback(.success(nil))
                } else {
                    callback(.failure(BridgeError(code: .internalError, message: "打开设置失败")))
                }
            }
        }
    }
    
    // MARK: - 权限检查实现
    
    private func checkPermissionStatus(
        _ permission: IOSPermissionType,
        completion: @escaping (IOSPermissionStatus) -> Void
    ) {
        switch permission {
        case .camera:
            checkCameraStatus(completion: completion)
        case .microphone:
            checkMicrophoneStatus(completion: completion)
        case .photos:
            checkPhotosStatus(addOnly: false, completion: completion)
        case .photosAddOnly:
            checkPhotosStatus(addOnly: true, completion: completion)
        case .contacts:
            checkContactsStatus(completion: completion)
        case .calendar:
            checkCalendarStatus(type: .event, completion: completion)
        case .reminders:
            checkCalendarStatus(type: .reminder, completion: completion)
        case .notifications:
            checkNotificationsStatus(completion: completion)
        case .locationWhenInUse, .locationAlways:
            checkLocationStatus(always: permission == .locationAlways, completion: completion)
        case .faceId:
            checkBiometricsStatus(completion: completion)
        default:
            // 其他权限暂不支持
            completion(.notDetermined)
        }
    }
    
    private func requestPermission(
        _ permission: IOSPermissionType,
        completion: @escaping (IOSPermissionStatus) -> Void
    ) {
        switch permission {
        case .camera:
            requestCamera(completion: completion)
        case .microphone:
            requestMicrophone(completion: completion)
        case .photos:
            requestPhotos(addOnly: false, completion: completion)
        case .photosAddOnly:
            requestPhotos(addOnly: true, completion: completion)
        case .contacts:
            requestContacts(completion: completion)
        case .calendar:
            requestCalendar(type: .event, completion: completion)
        case .reminders:
            requestCalendar(type: .reminder, completion: completion)
        case .notifications:
            requestNotifications(completion: completion)
        case .locationWhenInUse:
            requestLocation(always: false, completion: completion)
        case .locationAlways:
            requestLocation(always: true, completion: completion)
        case .faceId:
            requestBiometrics(completion: completion)
        default:
            completion(.notDetermined)
        }
    }
    
    // MARK: - 相机
    
    private func checkCameraStatus(completion: @escaping (IOSPermissionStatus) -> Void) {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        completion(convertAVAuthStatus(status))
    }
    
    private func requestCamera(completion: @escaping (IOSPermissionStatus) -> Void) {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                completion(granted ? .granted : .denied)
            }
        }
    }
    
    // MARK: - 麦克风
    
    private func checkMicrophoneStatus(completion: @escaping (IOSPermissionStatus) -> Void) {
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        completion(convertAVAuthStatus(status))
    }
    
    private func requestMicrophone(completion: @escaping (IOSPermissionStatus) -> Void) {
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            DispatchQueue.main.async {
                completion(granted ? .granted : .denied)
            }
        }
    }
    
    // MARK: - 相册
    
    private func checkPhotosStatus(addOnly: Bool, completion: @escaping (IOSPermissionStatus) -> Void) {
        if #available(iOS 14, *) {
            let status = PHPhotoLibrary.authorizationStatus(for: addOnly ? .addOnly : .readWrite)
            completion(convertPHAuthStatus(status))
        } else {
            let status = PHPhotoLibrary.authorizationStatus()
            completion(convertPHAuthStatus(status))
        }
    }
    
    private func requestPhotos(addOnly: Bool, completion: @escaping (IOSPermissionStatus) -> Void) {
        if #available(iOS 14, *) {
            PHPhotoLibrary.requestAuthorization(for: addOnly ? .addOnly : .readWrite) { status in
                DispatchQueue.main.async {
                    completion(self.convertPHAuthStatus(status))
                }
            }
        } else {
            PHPhotoLibrary.requestAuthorization { status in
                DispatchQueue.main.async {
                    completion(self.convertPHAuthStatus(status))
                }
            }
        }
    }
    
    // MARK: - 通讯录
    
    private func checkContactsStatus(completion: @escaping (IOSPermissionStatus) -> Void) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        completion(convertCNAuthStatus(status))
    }
    
    private func requestContacts(completion: @escaping (IOSPermissionStatus) -> Void) {
        CNContactStore().requestAccess(for: .contacts) { granted, _ in
            DispatchQueue.main.async {
                completion(granted ? .granted : .denied)
            }
        }
    }
    
    // MARK: - 日历/提醒
    
    private func checkCalendarStatus(type: EKEntityType, completion: @escaping (IOSPermissionStatus) -> Void) {
        let status = EKEventStore.authorizationStatus(for: type)
        completion(convertEKAuthStatus(status))
    }
    
    private func requestCalendar(type: EKEntityType, completion: @escaping (IOSPermissionStatus) -> Void) {
        EKEventStore().requestAccess(to: type) { granted, _ in
            DispatchQueue.main.async {
                completion(granted ? .granted : .denied)
            }
        }
    }
    
    // MARK: - 通知
    
    private func checkNotificationsStatus(completion: @escaping (IOSPermissionStatus) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized:
                    completion(.granted)
                case .denied:
                    completion(.denied)
                case .notDetermined:
                    completion(.notDetermined)
                case .provisional:
                    completion(.provisional)
                case .ephemeral:
                    completion(.limited)
                @unknown default:
                    completion(.notDetermined)
                }
            }
        }
    }
    
    private func requestNotifications(completion: @escaping (IOSPermissionStatus) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                completion(granted ? .granted : .denied)
            }
        }
    }
    
    // MARK: - 位置
    
    private func checkLocationStatus(always: Bool, completion: @escaping (IOSPermissionStatus) -> Void) {
        let status: CLAuthorizationStatus
        if #available(iOS 14.0, *) {
            status = locationManager.authorizationStatus
        } else {
            status = CLLocationManager.authorizationStatus()
        }
        
        switch status {
        case .notDetermined:
            completion(.notDetermined)
        case .restricted:
            completion(.restricted)
        case .denied:
            completion(.denied)
        case .authorizedAlways:
            completion(.granted)
        case .authorizedWhenInUse:
            completion(always ? .denied : .granted)
        @unknown default:
            completion(.notDetermined)
        }
    }
    
    private func requestLocation(always: Bool, completion: @escaping (IOSPermissionStatus) -> Void) {
        // 需要代理处理，这里简化实现
        if always {
            locationManager.requestAlwaysAuthorization()
        } else {
            locationManager.requestWhenInUseAuthorization()
        }
        // 延迟检查状态
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.checkLocationStatus(always: always, completion: completion)
        }
    }
    
    // MARK: - 生物识别
    
    private func checkBiometricsStatus(completion: @escaping (IOSPermissionStatus) -> Void) {
        let context = LAContext()
        var error: NSError?
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            completion(.granted)
        } else if let error = error {
            if error.code == LAError.biometryNotAvailable.rawValue {
                completion(.restricted)
            } else {
                completion(.denied)
            }
        } else {
            completion(.notDetermined)
        }
    }
    
    private func requestBiometrics(completion: @escaping (IOSPermissionStatus) -> Void) {
        let context = LAContext()
        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: "验证身份"
        ) { success, error in
            DispatchQueue.main.async {
                completion(success ? .granted : .denied)
            }
        }
    }
    
    // MARK: - 状态转换
    
    private func convertAVAuthStatus(_ status: AVAuthorizationStatus) -> IOSPermissionStatus {
        switch status {
        case .authorized: return .granted
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notDetermined
        @unknown default: return .notDetermined
        }
    }
    
    private func convertPHAuthStatus(_ status: PHAuthorizationStatus) -> IOSPermissionStatus {
        switch status {
        case .authorized: return .granted
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notDetermined
        case .limited: return .limited
        @unknown default: return .notDetermined
        }
    }
    
    private func convertCNAuthStatus(_ status: CNAuthorizationStatus) -> IOSPermissionStatus {
        switch status {
        case .authorized: return .granted
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notDetermined
        @unknown default: return .notDetermined
        }
    }
    
    private func convertEKAuthStatus(_ status: EKAuthorizationStatus) -> IOSPermissionStatus {
        switch status {
        case .authorized: return .granted
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notDetermined
        @unknown default: return .notDetermined
        }
    }
}
