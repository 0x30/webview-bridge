# iOS 模块实现

本文档详细介绍如何使用 Swift 实现 iOS 端的 Bridge 模块。

## 模块协议

所有 iOS 模块都需要实现 `BridgeModuleProtocol`：

```swift
protocol BridgeModuleProtocol {
    /// 模块名称，用于路由请求
    var moduleName: String { get }
    
    /// 处理来自 Web 的请求
    /// - Parameters:
    ///   - method: 方法名
    ///   - params: 请求参数
    ///   - completion: 完成回调
    func handle(method: String, 
                params: [String: Any], 
                completion: @escaping (Result<Any, Error>) -> Void)
}
```

## 基本结构

```swift
import Foundation

class MyModule: BridgeModuleProtocol {
    
    let moduleName = "MyModule"
    
    func handle(method: String, 
                params: [String: Any], 
                completion: @escaping (Result<Any, Error>) -> Void) {
        switch method {
        case "MethodA":
            handleMethodA(params: params, completion: completion)
        case "MethodB":
            handleMethodB(params: params, completion: completion)
        default:
            completion(.failure(BridgeError.methodNotFound(method)))
        }
    }
    
    // MARK: - Private Methods
    
    private func handleMethodA(params: [String: Any], 
                               completion: @escaping (Result<Any, Error>) -> Void) {
        // 实现逻辑
        completion(.success(["result": "success"]))
    }
    
    private func handleMethodB(params: [String: Any], 
                               completion: @escaping (Result<Any, Error>) -> Void) {
        // 实现逻辑
        completion(.success(["value": 123]))
    }
}
```

## 参数解析

### 基本类型

```swift
private func handleExample(params: [String: Any], 
                           completion: @escaping (Result<Any, Error>) -> Void) {
    // String
    let name = params["name"] as? String ?? ""
    
    // Int
    let count = params["count"] as? Int ?? 0
    
    // Double
    let value = params["value"] as? Double ?? 0.0
    
    // Bool
    let enabled = params["enabled"] as? Bool ?? false
    
    // Optional - 检查是否存在
    if let optional = params["optional"] as? String {
        // 参数存在
    }
    
    completion(.success(["ok": true]))
}
```

### 数组和字典

```swift
// 数组
let items = params["items"] as? [String] ?? []
let numbers = params["numbers"] as? [Int] ?? []

// 字典
let options = params["options"] as? [String: Any] ?? [:]
let nested = options["nested"] as? [String: Any] ?? [:]
```

### 必需参数验证

```swift
private func handleWithRequired(params: [String: Any], 
                                completion: @escaping (Result<Any, Error>) -> Void) {
    guard let id = params["id"] as? String else {
        completion(.failure(BridgeError.invalidParams("缺少必需参数 'id'")))
        return
    }
    
    guard let count = params["count"] as? Int, count > 0 else {
        completion(.failure(BridgeError.invalidParams("'count' 必须是正整数")))
        return
    }
    
    // 继续处理...
}
```

## 返回值

### 返回字典

```swift
completion(.success([
    "id": "123",
    "name": "John",
    "age": 25,
    "active": true
]))
```

### 返回数组

```swift
let items: [[String: Any]] = [
    ["id": "1", "name": "Item 1"],
    ["id": "2", "name": "Item 2"]
]
completion(.success(["items": items]))
```

### 返回简单值

```swift
// 封装在字典中
completion(.success(["value": 42]))
completion(.success(["text": "hello"]))
completion(.success(["flag": true]))
```

## 错误处理

### 使用 BridgeError

```swift
enum BridgeError: Error {
    case methodNotFound(String)
    case invalidParams(String)
    case permissionDenied(String)
    case notSupported(String)
    case internalError(String)
    
    var code: Int {
        switch self {
        case .methodNotFound: return -3
        case .invalidParams: return -4
        case .permissionDenied: return -6
        case .notSupported: return -3
        case .internalError: return -8
        }
    }
    
    var message: String {
        switch self {
        case .methodNotFound(let method): return "方法不存在: \(method)"
        case .invalidParams(let msg): return "参数无效: \(msg)"
        case .permissionDenied(let msg): return "权限被拒绝: \(msg)"
        case .notSupported(let msg): return "不支持: \(msg)"
        case .internalError(let msg): return "内部错误: \(msg)"
        }
    }
}
```

### 捕获异常

```swift
private func handleRisky(params: [String: Any], 
                         completion: @escaping (Result<Any, Error>) -> Void) {
    do {
        let result = try riskyOperation()
        completion(.success(["result": result]))
    } catch {
        completion(.failure(error))
    }
}
```

## 异步操作

### 使用 GCD

```swift
private func handleAsync(params: [String: Any], 
                         completion: @escaping (Result<Any, Error>) -> Void) {
    DispatchQueue.global(qos: .userInitiated).async {
        // 耗时操作
        let result = self.heavyComputation()
        
        DispatchQueue.main.async {
            completion(.success(["result": result]))
        }
    }
}
```

### 使用 async/await (iOS 15+)

```swift
private func handleAsyncAwait(params: [String: Any], 
                              completion: @escaping (Result<Any, Error>) -> Void) {
    Task {
        do {
            let result = try await asyncOperation()
            await MainActor.run {
                completion(.success(["result": result]))
            }
        } catch {
            await MainActor.run {
                completion(.failure(error))
            }
        }
    }
}
```

## 权限处理

```swift
import Photos

private func handlePhotosAccess(params: [String: Any], 
                                completion: @escaping (Result<Any, Error>) -> Void) {
    let status = PHPhotoLibrary.authorizationStatus()
    
    switch status {
    case .authorized, .limited:
        // 已授权
        performPhotosOperation(completion: completion)
        
    case .notDetermined:
        // 请求权限
        PHPhotoLibrary.requestAuthorization { newStatus in
            DispatchQueue.main.async {
                if newStatus == .authorized || newStatus == .limited {
                    self.performPhotosOperation(completion: completion)
                } else {
                    completion(.failure(BridgeError.permissionDenied("相册")))
                }
            }
        }
        
    case .denied, .restricted:
        completion(.failure(BridgeError.permissionDenied("相册权限被拒绝")))
        
    @unknown default:
        completion(.failure(BridgeError.internalError("未知权限状态")))
    }
}
```

## 发送事件

```swift
class MyModule: BridgeModuleProtocol {
    
    weak var bridge: WebViewBridge?
    
    // 发送事件到 Web
    private func sendEvent(_ eventName: String, data: [String: Any]) {
        bridge?.dispatchEvent("MyModule.\(eventName)", data: data)
    }
    
    // 示例：监听状态变化并发送事件
    @objc private func statusChanged(_ notification: Notification) {
        sendEvent("StatusChanged", data: [
            "newStatus": "active"
        ])
    }
}
```

## 模块注册

```swift
class ViewController: UIViewController {
    
    private var bridge: WebViewBridge!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 创建 WebView
        let webView = WKWebView(frame: view.bounds)
        view.addSubview(webView)
        
        // 创建 Bridge
        bridge = WebViewBridge(webView: webView)
        
        // 注册模块
        let myModule = MyModule()
        myModule.bridge = bridge  // 如果需要发送事件
        bridge.registerModule(myModule)
        
        // 加载页面
        webView.load(URLRequest(url: URL(string: "https://example.com")!))
    }
}
```

## 完整示例

```swift
import Foundation
import AVFoundation

class CameraModule: BridgeModuleProtocol {
    
    let moduleName = "Camera"
    weak var bridge: WebViewBridge?
    
    func handle(method: String, 
                params: [String: Any], 
                completion: @escaping (Result<Any, Error>) -> Void) {
        switch method {
        case "IsAvailable":
            handleIsAvailable(completion: completion)
        case "HasPermission":
            handleHasPermission(completion: completion)
        case "RequestPermission":
            handleRequestPermission(completion: completion)
        default:
            completion(.failure(BridgeError.methodNotFound(method)))
        }
    }
    
    private func handleIsAvailable(completion: @escaping (Result<Any, Error>) -> Void) {
        let hasFront = UIImagePickerController.isCameraDeviceAvailable(.front)
        let hasRear = UIImagePickerController.isCameraDeviceAvailable(.rear)
        
        completion(.success([
            "isAvailable": hasFront || hasRear,
            "hasFrontCamera": hasFront,
            "hasRearCamera": hasRear
        ]))
    }
    
    private func handleHasPermission(completion: @escaping (Result<Any, Error>) -> Void) {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        
        completion(.success([
            "granted": status == .authorized,
            "status": statusToString(status)
        ]))
    }
    
    private func handleRequestPermission(completion: @escaping (Result<Any, Error>) -> Void) {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                let status = AVCaptureDevice.authorizationStatus(for: .video)
                completion(.success([
                    "granted": granted,
                    "status": self.statusToString(status)
                ]))
            }
        }
    }
    
    private func statusToString(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "unknown"
        }
    }
}
```
