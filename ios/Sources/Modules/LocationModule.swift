/**
 * Location 模块 - 地理位置功能
 *
 * 提供获取位置、位置监听、地理编码等功能
 */

import Foundation
import CoreLocation

// MARK: - Location 模块

public class LocationModule: NSObject, BridgeModule {
    
    public let moduleName = "Location"
    public let methods = [
        "GetCurrentPosition",
        "WatchPosition",
        "ClearWatch",
        "HasPermission",
        "RequestPermission",
        "GetPermissionStatus",
        "OpenSettings",
        "Geocode",
        "ReverseGeocode"
    ]
    
    private weak var bridge: WebViewBridge?
    private var locationManager: CLLocationManager?
    private var pendingCallback: ((Result<Any?, BridgeError>) -> Void)?
    private var watchCallbacks: [String: ((Result<Any?, BridgeError>) -> Void)] = [:]
    private var watchId = 0
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        super.init()
        setupLocationManager()
    }
    
    private func setupLocationManager() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyBest
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetCurrentPosition":
            getCurrentPosition(params: params, callback: callback)
        case "WatchPosition":
            watchPosition(params: params, callback: callback)
        case "ClearWatch":
            clearWatch(params: params, callback: callback)
        case "HasPermission":
            hasPermission(callback: callback)
        case "RequestPermission":
            requestPermission(params: params, callback: callback)
        case "GetPermissionStatus":
            getPermissionStatus(callback: callback)
        case "OpenSettings":
            openSettings(callback: callback)
        case "Geocode":
            geocode(params: params, callback: callback)
        case "ReverseGeocode":
            reverseGeocode(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - HasPermission
    
    private func hasPermission(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let status = CLLocationManager.authorizationStatus()
        let granted = status == .authorizedAlways || status == .authorizedWhenInUse
        
        callback(.success([
            "granted": granted,
            "status": statusString(status)
        ]))
    }
    
    // MARK: - RequestPermission
    
    private func requestPermission(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let type = params["type"]?.stringValue ?? "whenInUse"
        
        pendingCallback = callback
        
        if type == "always" {
            locationManager?.requestAlwaysAuthorization()
        } else {
            locationManager?.requestWhenInUseAuthorization()
        }
    }
    
    // MARK: - GetPermissionStatus
    
    private func getPermissionStatus(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let status = CLLocationManager.authorizationStatus()
        
        callback(.success([
            "status": statusString(status),
            "isLocationServicesEnabled": CLLocationManager.locationServicesEnabled()
        ]))
    }
    
    // MARK: - OpenSettings
    
    private func openSettings(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url) { success in
                    callback(.success(["opened": success]))
                }
            } else {
                callback(.failure(BridgeError(code: .internalError, message: "无法打开设置")))
            }
        }
    }
    
    // MARK: - GetCurrentPosition
    
    private func getCurrentPosition(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard CLLocationManager.locationServicesEnabled() else {
            callback(.failure(BridgeError(code: .featureDisabled, message: "位置服务未开启")))
            return
        }
        
        let status = CLLocationManager.authorizationStatus()
        guard status == .authorizedAlways || status == .authorizedWhenInUse else {
            callback(.failure(BridgeError(code: .permissionDenied, message: "未获得位置权限")))
            return
        }
        
        // 设置精度
        if let accuracy = params["accuracy"]?.stringValue {
            switch accuracy {
            case "high":
                locationManager?.desiredAccuracy = kCLLocationAccuracyBest
            case "medium":
                locationManager?.desiredAccuracy = kCLLocationAccuracyHundredMeters
            case "low":
                locationManager?.desiredAccuracy = kCLLocationAccuracyKilometer
            default:
                break
            }
        }
        
        pendingCallback = callback
        locationManager?.requestLocation()
    }
    
    // MARK: - WatchPosition
    
    private func watchPosition(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard CLLocationManager.locationServicesEnabled() else {
            callback(.failure(BridgeError(code: .featureDisabled, message: "位置服务未开启")))
            return
        }
        
        watchId += 1
        let id = "watch_\(watchId)"
        
        // 设置精度
        if let accuracy = params["accuracy"]?.stringValue {
            switch accuracy {
            case "high":
                locationManager?.desiredAccuracy = kCLLocationAccuracyBest
            case "medium":
                locationManager?.desiredAccuracy = kCLLocationAccuracyHundredMeters
            case "low":
                locationManager?.desiredAccuracy = kCLLocationAccuracyKilometer
            default:
                break
            }
        }
        
        // 设置距离过滤器
        if let distanceFilter = params["distanceFilter"]?.doubleValue {
            locationManager?.distanceFilter = distanceFilter
        }
        
        watchCallbacks[id] = callback
        locationManager?.startUpdatingLocation()
        
        // 返回 watchId
        callback(.success(["watchId": id]))
    }
    
    // MARK: - ClearWatch
    
    private func clearWatch(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        if let watchId = params["watchId"]?.stringValue {
            watchCallbacks.removeValue(forKey: watchId)
        }
        
        if watchCallbacks.isEmpty {
            locationManager?.stopUpdatingLocation()
        }
        
        callback(.success(["cleared": true]))
    }
    
    // MARK: - Geocode
    
    private func geocode(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let address = params["address"]?.stringValue else {
            callback(.failure(BridgeError.invalidParams("address")))
            return
        }
        
        let geocoder = CLGeocoder()
        geocoder.geocodeAddressString(address) { placemarks, error in
            if let error = error {
                callback(.failure(BridgeError(code: .internalError, message: error.localizedDescription)))
                return
            }
            
            guard let placemark = placemarks?.first,
                  let location = placemark.location else {
                callback(.failure(BridgeError(code: .internalError, message: "未找到位置")))
                return
            }
            
            callback(.success([
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "address": self.placemarkToAddress(placemark)
            ]))
        }
    }
    
    // MARK: - ReverseGeocode
    
    private func reverseGeocode(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let latitude = params["latitude"]?.doubleValue,
              let longitude = params["longitude"]?.doubleValue else {
            callback(.failure(BridgeError.invalidParams("latitude/longitude")))
            return
        }
        
        let location = CLLocation(latitude: latitude, longitude: longitude)
        let geocoder = CLGeocoder()
        
        geocoder.reverseGeocodeLocation(location) { placemarks, error in
            if let error = error {
                callback(.failure(BridgeError(code: .internalError, message: error.localizedDescription)))
                return
            }
            
            guard let placemark = placemarks?.first else {
                callback(.failure(BridgeError(code: .internalError, message: "未找到地址")))
                return
            }
            
            callback(.success(self.placemarkToAddress(placemark)))
        }
    }
    
    // MARK: - 辅助方法
    
    private func statusString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorizedAlways: return "authorizedAlways"
        case .authorizedWhenInUse: return "authorizedWhenInUse"
        @unknown default: return "unknown"
        }
    }
    
    private func locationToDict(_ location: CLLocation) -> [String: Any] {
        return [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "altitude": location.altitude,
            "accuracy": location.horizontalAccuracy,
            "altitudeAccuracy": location.verticalAccuracy,
            "heading": location.course,
            "speed": location.speed,
            "timestamp": location.timestamp.timeIntervalSince1970 * 1000
        ]
    }
    
    private func placemarkToAddress(_ placemark: CLPlacemark) -> [String: Any?] {
        return [
            "name": placemark.name,
            "thoroughfare": placemark.thoroughfare,
            "subThoroughfare": placemark.subThoroughfare,
            "locality": placemark.locality,
            "subLocality": placemark.subLocality,
            "administrativeArea": placemark.administrativeArea,
            "subAdministrativeArea": placemark.subAdministrativeArea,
            "postalCode": placemark.postalCode,
            "country": placemark.country,
            "countryCode": placemark.isoCountryCode,
            "formattedAddress": [
                placemark.country,
                placemark.administrativeArea,
                placemark.locality,
                placemark.subLocality,
                placemark.thoroughfare,
                placemark.subThoroughfare
            ].compactMap { $0 }.joined(separator: "")
        ]
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationModule: CLLocationManagerDelegate {
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        let result = locationToDict(location)
        
        // 处理单次定位回调
        if let callback = pendingCallback {
            callback(.success(result))
            pendingCallback = nil
        }
        
        // 处理持续监听回调（通过事件发送）
        if !watchCallbacks.isEmpty {
            bridge?.sendEvent(BridgeEvent(event: "Location.PositionChanged", data: result))
        }
    }
    
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let bridgeError = BridgeError(code: .internalError, message: error.localizedDescription)
        
        pendingCallback?(.failure(bridgeError))
        pendingCallback = nil
    }
    
    public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        let granted = status == .authorizedAlways || status == .authorizedWhenInUse
        
        pendingCallback?(.success([
            "granted": granted,
            "status": statusString(status)
        ]))
        pendingCallback = nil
        
        // 发送权限变更事件
        bridge?.sendEvent(BridgeEvent(event: "Location.PermissionChanged", data: [
            "granted": granted,
            "status": statusString(status)
        ]))
    }
}
