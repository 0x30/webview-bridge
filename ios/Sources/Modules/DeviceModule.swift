/**
 * Device 模块 - 设备与系统信息
 *
 * 获取设备硬件信息、系统信息、屏幕信息等
 */

import Foundation
import UIKit

// MARK: - Device 模块

public class DeviceModule: BridgeModule {
    
    public let moduleName = "Device"
    public let methods = [
        "GetInfo",
        "GetBatteryInfo",
        "GetNetworkInfo",
        "GetStorageInfo",
        "GetMemoryInfo",
        "GetCapabilities"
    ]
    
    private weak var bridge: WebViewBridge?
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        // 启用电池监控
        UIDevice.current.isBatteryMonitoringEnabled = true
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetInfo":
            getInfo(callback: callback)
        case "GetBatteryInfo":
            getBatteryInfo(callback: callback)
        case "GetNetworkInfo":
            getNetworkInfo(callback: callback)
        case "GetStorageInfo":
            getStorageInfo(callback: callback)
        case "GetMemoryInfo":
            getMemoryInfo(callback: callback)
        case "GetCapabilities":
            getCapabilities(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - GetInfo
    
    private func getInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async {
            let device = UIDevice.current
            let screen = UIScreen.main
            let bundle = Bundle.main
            
            // 获取安全区域
            var safeArea: [String: CGFloat] = ["top": 0, "bottom": 0, "left": 0, "right": 0]
            if let window = UIApplication.shared.windows.first {
                let insets = window.safeAreaInsets
                safeArea = [
                    "top": insets.top,
                    "bottom": insets.bottom,
                    "left": insets.left,
                    "right": insets.right
                ]
            }
            
            let info: [String: Any] = [
                "os": "ios",
                "osVersion": device.systemVersion,
                "osFullVersion": device.systemVersion,
                "appVersion": bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
                "buildNumber": bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "",
                "deviceModel": self.getDeviceModelIdentifier(),
                "deviceName": self.getDeviceMarketingName(),
                "manufacturer": "Apple",
                "brand": "Apple",
                "language": Locale.current.languageCode ?? "",
                "region": Locale.current.regionCode ?? "",
                "timezone": TimeZone.current.identifier,
                "timezoneOffset": TimeZone.current.secondsFromGMT() / 60,
                "screenInfo": [
                    "width": screen.bounds.width,
                    "height": screen.bounds.height,
                    "scale": screen.scale,
                    "safeArea": safeArea,
                    "physicalWidth": screen.bounds.width * screen.scale,
                    "physicalHeight": screen.bounds.height * screen.scale,
                    "brightness": screen.brightness
                ],
                "isEmulator": self.isSimulator(),
                "isJailbroken": self.isJailbroken(),
                "isTablet": device.userInterfaceIdiom == .pad
            ]
            
            callback(.success(info))
        }
    }
    
    // MARK: - GetBatteryInfo
    
    private func getBatteryInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let device = UIDevice.current
        
        let stateString: String
        switch device.batteryState {
        case .charging:
            stateString = "charging"
        case .full:
            stateString = "full"
        case .unplugged:
            stateString = "discharging"
        case .unknown:
            stateString = "unknown"
        @unknown default:
            stateString = "unknown"
        }
        
        let info: [String: Any] = [
            "level": Int(device.batteryLevel * 100),
            "isCharging": device.batteryState == .charging,
            "state": stateString,
            "isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled
        ]
        
        callback(.success(info))
    }
    
    // MARK: - GetNetworkInfo
    
    private func getNetworkInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        // 简化实现，完整实现需要使用 NWPathMonitor
        let info: [String: Any] = [
            "type": "unknown",
            "isConnected": true
        ]
        callback(.success(info))
    }
    
    // MARK: - GetStorageInfo
    
    private func getStorageInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        do {
            let fileURL = URL(fileURLWithPath: NSHomeDirectory())
            let values = try fileURL.resourceValues(forKeys: [
                .volumeTotalCapacityKey,
                .volumeAvailableCapacityForImportantUsageKey
            ])
            
            let total = values.volumeTotalCapacity ?? 0
            let free = values.volumeAvailableCapacityForImportantUsage ?? 0
            
            let info: [String: Any] = [
                "totalSpace": total,
                "freeSpace": free,
                "usedSpace": total - Int(free)
            ]
            
            callback(.success(info))
        } catch {
            callback(.failure(BridgeError(code: .internalError, message: "获取存储信息失败: \(error)")))
        }
    }
    
    // MARK: - GetMemoryInfo
    
    private func getMemoryInfo(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let totalMemory = ProcessInfo.processInfo.physicalMemory
        
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        
        let usedMemory = result == KERN_SUCCESS ? UInt64(info.resident_size) : 0
        
        let memInfo: [String: Any] = [
            "totalMemory": totalMemory,
            "availableMemory": totalMemory - usedMemory,
            "usedMemory": usedMemory
        ]
        
        callback(.success(memInfo))
    }
    
    // MARK: - GetCapabilities
    
    private func getCapabilities(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let device = UIDevice.current
        
        let capabilities: [String: Any] = [
            "hasFrontCamera": UIImagePickerController.isCameraDeviceAvailable(.front),
            "hasRearCamera": UIImagePickerController.isCameraDeviceAvailable(.rear),
            "hasTouchId": hasBiometrics(type: .touchID),
            "hasFaceId": hasBiometrics(type: .faceID),
            "hasBiometrics": hasBiometrics(type: nil),
            "hasNfc": hasNFC(),
            "hasBluetooth": true, // 需要 CoreBluetooth 检查
            "hasGyroscope": true, // 需要 CoreMotion 检查
            "hasAccelerometer": true,
            "hasMagnetometer": true,
            "hasBarometer": hasBarometer(),
            "hasGps": true,
            "hasVibrator": true,
            "hasHaptics": hasHaptics(),
            "hasAr": hasARKit()
        ]
        
        callback(.success(capabilities))
    }
    
    // MARK: - 辅助方法
    
    /// 获取设备型号标识符
    private func getDeviceModelIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        let identifier = machineMirror.children.reduce("") { identifier, element in
            guard let value = element.value as? Int8, value != 0 else { return identifier }
            return identifier + String(UnicodeScalar(UInt8(value)))
        }
        return identifier
    }
    
    /// 获取设备市场名称
    private func getDeviceMarketingName() -> String {
        // 简化实现，返回设备名称
        return UIDevice.current.name
    }
    
    /// 检查是否为模拟器
    private func isSimulator() -> Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }
    
    /// 检查是否越狱
    private func isJailbroken() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        let paths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/"
        ]
        
        for path in paths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }
        }
        
        if let url = URL(string: "cydia://package/com.example.package"),
           UIApplication.shared.canOpenURL(url) {
            return true
        }
        
        return false
        #endif
    }
    
    /// 生物识别类型
    private enum BiometricType {
        case touchID
        case faceID
    }
    
    /// 检查生物识别
    private func hasBiometrics(type: BiometricType?) -> Bool {
        // 需要 LocalAuthentication 框架
        // 简化实现
        return true
    }
    
    /// 检查 NFC
    private func hasNFC() -> Bool {
        if #available(iOS 13.0, *) {
            // 需要 CoreNFC
            return true
        }
        return false
    }
    
    /// 检查气压计
    private func hasBarometer() -> Bool {
        // 需要 CoreMotion
        return true
    }
    
    /// 检查触觉反馈
    private func hasHaptics() -> Bool {
        if #available(iOS 10.0, *) {
            return UIDevice.current.userInterfaceIdiom == .phone
        }
        return false
    }
    
    /// 检查 ARKit
    private func hasARKit() -> Bool {
        if #available(iOS 11.0, *) {
            // 需要 ARKit
            return true
        }
        return false
    }
}
