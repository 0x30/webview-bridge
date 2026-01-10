/**
 * Media 模块 - 相机相册功能
 *
 * 提供拍照、录像、选择相册图片/视频等功能
 */

import Foundation
import UIKit
import AVFoundation
import Photos
import PhotosUI

// MARK: - Media 模块

public class MediaModule: NSObject, BridgeModule {
    
    public let moduleName = "Media"
    public let methods = [
        "TakePhoto",
        "RecordVideo",
        "PickImage",
        "PickVideo",
        "PickMedia",
        "GetAlbums",
        "GetPhotos",
        "SaveToAlbum",
        "HasPermission",
        "RequestPermission"
    ]
    
    private weak var bridge: WebViewBridge?
    private var mediaCallback: ((Result<Any?, BridgeError>) -> Void)?
    private var currentParams: [String: AnyCodable]?
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        super.init()
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "TakePhoto":
            takePhoto(params: params, callback: callback)
        case "RecordVideo":
            recordVideo(params: params, callback: callback)
        case "PickImage":
            pickImage(params: params, callback: callback)
        case "PickVideo":
            pickVideo(params: params, callback: callback)
        case "PickMedia":
            pickMedia(params: params, callback: callback)
        case "GetAlbums":
            getAlbums(callback: callback)
        case "GetPhotos":
            getPhotos(params: params, callback: callback)
        case "SaveToAlbum":
            saveToAlbum(params: params, callback: callback)
        case "HasPermission":
            hasPermission(params: params, callback: callback)
        case "RequestPermission":
            requestPermission(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - HasPermission
    
    private func hasPermission(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let type = params["type"]?.stringValue ?? "photos"
        
        var status: String = "unknown"
        var granted = false
        
        switch type {
        case "camera":
            let cameraStatus = AVCaptureDevice.authorizationStatus(for: .video)
            granted = cameraStatus == .authorized
            status = authStatusString(cameraStatus)
        case "photos":
            let photosStatus = PHPhotoLibrary.authorizationStatus(for: .readWrite)
            granted = photosStatus == .authorized || photosStatus == .limited
            status = photoStatusString(photosStatus)
        case "microphone":
            let micStatus = AVCaptureDevice.authorizationStatus(for: .audio)
            granted = micStatus == .authorized
            status = authStatusString(micStatus)
        default:
            break
        }
        
        callback(.success([
            "type": type,
            "granted": granted,
            "status": status
        ]))
    }
    
    // MARK: - RequestPermission
    
    private func requestPermission(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let type = params["type"]?.stringValue ?? "photos"
        
        switch type {
        case "camera":
            AVCaptureDevice.requestAccess(for: .video) { granted in
                let status = AVCaptureDevice.authorizationStatus(for: .video)
                callback(.success([
                    "type": type,
                    "granted": granted,
                    "status": self.authStatusString(status)
                ]))
            }
        case "photos":
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
                let granted = status == .authorized || status == .limited
                callback(.success([
                    "type": type,
                    "granted": granted,
                    "status": self.photoStatusString(status)
                ]))
            }
        case "microphone":
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                let status = AVCaptureDevice.authorizationStatus(for: .audio)
                callback(.success([
                    "type": type,
                    "granted": granted,
                    "status": self.authStatusString(status)
                ]))
            }
        default:
            callback(.failure(BridgeError.invalidParams("type")))
        }
    }
    
    // MARK: - TakePhoto
    
    private func takePhoto(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            callback(.failure(BridgeError(code: .deviceNotSupported, message: "设备不支持相机")))
            return
        }
        
        DispatchQueue.main.async {
            guard let topVC = UIApplication.shared.topViewController else {
                callback(.failure(BridgeError(code: .internalError, message: "无法获取当前视图控制器")))
                return
            }
            
            self.mediaCallback = callback
            self.currentParams = params
            
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.mediaTypes = ["public.image"]
            picker.delegate = self
            
            // 相机设置
            if let cameraDevice = params["cameraDevice"]?.stringValue {
                picker.cameraDevice = cameraDevice == "front" ? .front : .rear
            }
            
            if params["allowsEditing"]?.boolValue == true {
                picker.allowsEditing = true
            }
            
            topVC.present(picker, animated: true)
        }
    }
    
    // MARK: - RecordVideo
    
    private func recordVideo(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            callback(.failure(BridgeError(code: .deviceNotSupported, message: "设备不支持相机")))
            return
        }
        
        DispatchQueue.main.async {
            guard let topVC = UIApplication.shared.topViewController else {
                callback(.failure(BridgeError(code: .internalError, message: "无法获取当前视图控制器")))
                return
            }
            
            self.mediaCallback = callback
            self.currentParams = params
            
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.mediaTypes = ["public.movie"]
            picker.delegate = self
            
            // 视频设置
            if let cameraDevice = params["cameraDevice"]?.stringValue {
                picker.cameraDevice = cameraDevice == "front" ? .front : .rear
            }
            
            if let quality = params["quality"]?.stringValue {
                switch quality {
                case "low":
                    picker.videoQuality = .typeLow
                case "medium":
                    picker.videoQuality = .typeMedium
                case "high":
                    picker.videoQuality = .typeHigh
                default:
                    picker.videoQuality = .typeMedium
                }
            }
            
            if let maxDuration = params["maxDuration"]?.doubleValue {
                picker.videoMaximumDuration = maxDuration
            }
            
            topVC.present(picker, animated: true)
        }
    }
    
    // MARK: - PickImage
    
    private func pickImage(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        pickMedia(params: params.merging(["mediaType": AnyCodable("image")]) { _, new in new }, callback: callback)
    }
    
    // MARK: - PickVideo
    
    private func pickVideo(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        pickMedia(params: params.merging(["mediaType": AnyCodable("video")]) { _, new in new }, callback: callback)
    }
    
    // MARK: - PickMedia
    
    private func pickMedia(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.main.async {
            guard let topVC = UIApplication.shared.topViewController else {
                callback(.failure(BridgeError(code: .internalError, message: "无法获取当前视图控制器")))
                return
            }
            
            self.mediaCallback = callback
            self.currentParams = params
            
            if #available(iOS 14.0, *) {
                var config = PHPickerConfiguration()
                config.selectionLimit = params["maxCount"]?.intValue ?? 1
                
                let mediaType = params["mediaType"]?.stringValue ?? "any"
                switch mediaType {
                case "image":
                    config.filter = .images
                case "video":
                    config.filter = .videos
                default:
                    config.filter = .any(of: [.images, .videos])
                }
                
                let picker = PHPickerViewController(configuration: config)
                picker.delegate = self
                topVC.present(picker, animated: true)
            } else {
                let picker = UIImagePickerController()
                picker.sourceType = .photoLibrary
                picker.delegate = self
                
                let mediaType = params["mediaType"]?.stringValue ?? "any"
                switch mediaType {
                case "image":
                    picker.mediaTypes = ["public.image"]
                case "video":
                    picker.mediaTypes = ["public.movie"]
                default:
                    picker.mediaTypes = ["public.image", "public.movie"]
                }
                
                topVC.present(picker, animated: true)
            }
        }
    }
    
    // MARK: - GetAlbums
    
    private func getAlbums(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            var albums: [[String: Any]] = []
            
            // 智能相册
            let smartAlbums = PHAssetCollection.fetchAssetCollections(with: .smartAlbum, subtype: .any, options: nil)
            smartAlbums.enumerateObjects { collection, _, _ in
                let count = PHAsset.fetchAssets(in: collection, options: nil).count
                if count > 0 {
                    albums.append([
                        "identifier": collection.localIdentifier,
                        "title": collection.localizedTitle ?? "",
                        "count": count,
                        "type": "smart"
                    ])
                }
            }
            
            // 用户相册
            let userAlbums = PHAssetCollection.fetchAssetCollections(with: .album, subtype: .any, options: nil)
            userAlbums.enumerateObjects { collection, _, _ in
                let count = PHAsset.fetchAssets(in: collection, options: nil).count
                albums.append([
                    "identifier": collection.localIdentifier,
                    "title": collection.localizedTitle ?? "",
                    "count": count,
                    "type": "user"
                ])
            }
            
            callback(.success(["albums": albums]))
        }
    }
    
    // MARK: - GetPhotos
    
    private func getPhotos(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.global(qos: .userInitiated).async {
            let fetchOptions = PHFetchOptions()
            fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
            
            let offset = params["offset"]?.intValue ?? 0
            let limit = params["limit"]?.intValue ?? 50
            
            let mediaType = params["mediaType"]?.stringValue ?? "image"
            switch mediaType {
            case "image":
                fetchOptions.predicate = NSPredicate(format: "mediaType = %d", PHAssetMediaType.image.rawValue)
            case "video":
                fetchOptions.predicate = NSPredicate(format: "mediaType = %d", PHAssetMediaType.video.rawValue)
            default:
                break
            }
            
            var assets: PHFetchResult<PHAsset>
            if let albumId = params["albumId"]?.stringValue,
               let collection = PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [albumId], options: nil).firstObject {
                assets = PHAsset.fetchAssets(in: collection, options: fetchOptions)
            } else {
                assets = PHAsset.fetchAssets(with: fetchOptions)
            }
            
            var photos: [[String: Any]] = []
            let endIndex = min(offset + limit, assets.count)
            
            for i in offset..<endIndex {
                let asset = assets.object(at: i)
                photos.append([
                    "identifier": asset.localIdentifier,
                    "width": asset.pixelWidth,
                    "height": asset.pixelHeight,
                    "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0,
                    "mediaType": asset.mediaType == .video ? "video" : "image",
                    "duration": asset.duration
                ])
            }
            
            callback(.success([
                "photos": photos,
                "total": assets.count,
                "offset": offset,
                "limit": limit
            ]))
        }
    }
    
    // MARK: - SaveToAlbum
    
    private func saveToAlbum(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let base64String = params["data"]?.stringValue,
              let imageData = Data(base64Encoded: base64String),
              let image = UIImage(data: imageData) else {
            callback(.failure(BridgeError.invalidParams("data")))
            return
        }
        
        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.creationRequestForAsset(from: image)
        }) { success, error in
            if success {
                callback(.success(["success": true]))
            } else {
                callback(.failure(BridgeError(code: .internalError, message: error?.localizedDescription ?? "保存失败")))
            }
        }
    }
    
    // MARK: - 辅助方法
    
    private func authStatusString(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorized: return "authorized"
        @unknown default: return "unknown"
        }
    }
    
    private func photoStatusString(_ status: PHAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorized: return "authorized"
        case .limited: return "limited"
        @unknown default: return "unknown"
        }
    }
    
    private func processImage(_ image: UIImage, params: [String: AnyCodable]?) -> [String: Any] {
        let quality = params?["quality"]?.doubleValue ?? 0.8
        let maxWidth = params?["maxWidth"]?.intValue
        let maxHeight = params?["maxHeight"]?.intValue
        
        var processedImage = image
        
        // 缩放图片
        if let maxW = maxWidth, let maxH = maxHeight {
            processedImage = resizeImage(image, maxWidth: CGFloat(maxW), maxHeight: CGFloat(maxH))
        }
        
        let imageData = processedImage.jpegData(compressionQuality: CGFloat(quality))
        let base64 = imageData?.base64EncodedString() ?? ""
        
        return [
            "base64": base64,
            "width": Int(processedImage.size.width),
            "height": Int(processedImage.size.height),
            "mimeType": "image/jpeg"
        ]
    }
    
    private func resizeImage(_ image: UIImage, maxWidth: CGFloat, maxHeight: CGFloat) -> UIImage {
        let size = image.size
        let widthRatio = maxWidth / size.width
        let heightRatio = maxHeight / size.height
        let ratio = min(widthRatio, heightRatio)
        
        if ratio >= 1 { return image }
        
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return newImage ?? image
    }
}

// MARK: - UIImagePickerControllerDelegate

extension MediaModule: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    public func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
    ) {
        picker.dismiss(animated: true)
        
        if let image = info[.editedImage] as? UIImage ?? info[.originalImage] as? UIImage {
            let result = processImage(image, params: currentParams)
            mediaCallback?(.success(result))
        } else if let videoURL = info[.mediaURL] as? URL {
            do {
                let videoData = try Data(contentsOf: videoURL)
                let base64 = videoData.base64EncodedString()
                mediaCallback?(.success([
                    "base64": base64,
                    "url": videoURL.absoluteString,
                    "mimeType": "video/mp4"
                ]))
            } catch {
                mediaCallback?(.failure(BridgeError(code: .internalError, message: "读取视频失败")))
            }
        } else {
            mediaCallback?(.failure(BridgeError(code: .internalError, message: "未知媒体类型")))
        }
        
        mediaCallback = nil
        currentParams = nil
    }
    
    public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        mediaCallback?(.success(["cancelled": true]))
        mediaCallback = nil
        currentParams = nil
    }
}

// MARK: - PHPickerViewControllerDelegate

@available(iOS 14.0, *)
extension MediaModule: PHPickerViewControllerDelegate {
    public func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)
        
        if results.isEmpty {
            mediaCallback?(.success(["cancelled": true]))
            mediaCallback = nil
            currentParams = nil
            return
        }
        
        var mediaItems: [[String: Any]] = []
        let group = DispatchGroup()
        
        for result in results {
            group.enter()
            
            if result.itemProvider.canLoadObject(ofClass: UIImage.self) {
                result.itemProvider.loadObject(ofClass: UIImage.self) { [weak self] object, error in
                    if let image = object as? UIImage {
                        let processed = self?.processImage(image, params: self?.currentParams) ?? [:]
                        mediaItems.append(processed)
                    }
                    group.leave()
                }
            } else if result.itemProvider.hasItemConformingToTypeIdentifier("public.movie") {
                result.itemProvider.loadFileRepresentation(forTypeIdentifier: "public.movie") { url, error in
                    if let url = url, let data = try? Data(contentsOf: url) {
                        mediaItems.append([
                            "base64": data.base64EncodedString(),
                            "mimeType": "video/mp4"
                        ])
                    }
                    group.leave()
                }
            } else {
                group.leave()
            }
        }
        
        group.notify(queue: .main) { [weak self] in
            if mediaItems.count == 1 {
                self?.mediaCallback?(.success(mediaItems[0]))
            } else {
                self?.mediaCallback?(.success(["items": mediaItems]))
            }
            self?.mediaCallback = nil
            self?.currentParams = nil
        }
    }
}
