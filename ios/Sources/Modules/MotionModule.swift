/**
 * Motion 模块 - 运动传感器
 *
 * 提供加速度计、陀螺仪等传感器数据访问
 */

import Foundation
import CoreMotion

// MARK: - Motion 模块

public class MotionModule: BridgeModule {
    
    public let moduleName = "Motion"
    public let methods = ["StartAccelerometer", "StopAccelerometer", "StartGyroscope", "StopGyroscope", "GetOrientation"]
    
    private weak var bridge: WebViewBridge?
    private let motionManager = CMMotionManager()
    private let operationQueue = OperationQueue()
    
    private var accelerometerInterval: TimeInterval = 0.1
    private var gyroscopeInterval: TimeInterval = 0.1
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        operationQueue.name = "com.aspect.webviewbridge.motion"
    }
    
    deinit {
        stopAll()
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "StartAccelerometer":
            startAccelerometer(params: params, callback: callback)
        case "StopAccelerometer":
            stopAccelerometer(callback: callback)
        case "StartGyroscope":
            startGyroscope(params: params, callback: callback)
        case "StopGyroscope":
            stopGyroscope(callback: callback)
        case "GetOrientation":
            getOrientation(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - 加速度计
    
    private func startAccelerometer(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard motionManager.isAccelerometerAvailable else {
            callback(.failure(BridgeError(code: .capabilityNotSupported, message: "加速度计不可用")))
            return
        }
        
        if let interval = params["interval"]?.value as? Double {
            accelerometerInterval = interval / 1000.0 // 转换为秒
        }
        
        motionManager.accelerometerUpdateInterval = accelerometerInterval
        motionManager.startAccelerometerUpdates(to: operationQueue) { [weak self] data, error in
            guard let self = self, let data = data else { return }
            
            self.bridge?.sendEvent("Motion.Accelerometer", data: [
                "x": data.acceleration.x,
                "y": data.acceleration.y,
                "z": data.acceleration.z,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ])
        }
        
        callback(.success(["started": true]))
    }
    
    private func stopAccelerometer(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        motionManager.stopAccelerometerUpdates()
        callback(.success(["stopped": true]))
    }
    
    // MARK: - 陀螺仪
    
    private func startGyroscope(params: [String: AnyCodable], callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard motionManager.isGyroAvailable else {
            callback(.failure(BridgeError(code: .capabilityNotSupported, message: "陀螺仪不可用")))
            return
        }
        
        if let interval = params["interval"]?.value as? Double {
            gyroscopeInterval = interval / 1000.0
        }
        
        motionManager.gyroUpdateInterval = gyroscopeInterval
        motionManager.startGyroUpdates(to: operationQueue) { [weak self] data, error in
            guard let self = self, let data = data else { return }
            
            self.bridge?.sendEvent("Motion.Gyroscope", data: [
                "x": data.rotationRate.x,
                "y": data.rotationRate.y,
                "z": data.rotationRate.z,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ])
        }
        
        callback(.success(["started": true]))
    }
    
    private func stopGyroscope(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        motionManager.stopGyroUpdates()
        callback(.success(["stopped": true]))
    }
    
    // MARK: - 设备方向
    
    private func getOrientation(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        guard motionManager.isDeviceMotionAvailable else {
            callback(.failure(BridgeError(code: .capabilityNotSupported, message: "设备运动传感器不可用")))
            return
        }
        
        motionManager.startDeviceMotionUpdates()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let self = self, let motion = self.motionManager.deviceMotion else {
                callback(.failure(BridgeError.unknown("无法获取设备方向数据")))
                return
            }
            
            let attitude = motion.attitude
            callback(.success([
                "alpha": attitude.yaw * 180 / .pi,      // 偏航角（z轴）
                "beta": attitude.pitch * 180 / .pi,    // 俯仰角（x轴）
                "gamma": attitude.roll * 180 / .pi     // 翻滚角（y轴）
            ]))
            
            self.motionManager.stopDeviceMotionUpdates()
        }
    }
    
    // MARK: - 清理
    
    private func stopAll() {
        motionManager.stopAccelerometerUpdates()
        motionManager.stopGyroUpdates()
        motionManager.stopDeviceMotionUpdates()
    }
}
