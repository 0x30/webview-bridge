/**
 * Clipboard 模块 - 剪贴板操作
 *
 * 提供剪贴板读写功能，支持文本、图片等多种格式
 */

import Foundation
import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

// MARK: - 剪贴板内容类型

/// 剪贴板内容类型
public enum ClipboardContentType: String {
    case text
    case html
    case url
    case image
}

// MARK: - Clipboard 模块

public class ClipboardModule: BridgeModule {
    
    public let moduleName = "Clipboard"
    public let methods = ["Read", "Write", "HasContent", "Clear", "GetAvailableTypes"]
    
    private weak var bridge: WebViewBridge?
    
    public init(bridge: WebViewBridge) {
        self.bridge = bridge
    }
    
    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "Read":
            read(params: params, callback: callback)
        case "Write":
            write(params: params, callback: callback)
        case "HasContent":
            hasContent(params: params, callback: callback)
        case "Clear":
            clear(callback: callback)
        case "GetAvailableTypes":
            getAvailableTypes(callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - Read
    
    private func read(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let typeString = params.getString("type") ?? "text"
        let type = ClipboardContentType(rawValue: typeString) ?? .text
        
        let pasteboard = UIPasteboard.general
        
        switch type {
        case .text:
            if let text = pasteboard.string {
                callback(.success([
                    "type": "text",
                    "content": text
                ]))
            } else {
                callback(.success([
                    "type": "text",
                    "content": NSNull()
                ]))
            }
            
        case .html:
            // 尝试读取 HTML 内容
            if #available(iOS 14.0, *) {
                if let data = pasteboard.data(forPasteboardType: UTType.html.identifier),
                   let html = String(data: data, encoding: .utf8) {
                    callback(.success([
                        "type": "html",
                        "content": html
                    ]))
                } else {
                    callback(.success([
                        "type": "html",
                        "content": NSNull()
                    ]))
                }
            } else {
                if let data = pasteboard.data(forPasteboardType: kUTTypeHTML as String),
                   let html = String(data: data, encoding: .utf8) {
                    callback(.success([
                        "type": "html",
                        "content": html
                    ]))
                } else {
                    callback(.success([
                        "type": "html",
                        "content": NSNull()
                    ]))
                }
            }
            
        case .url:
            if let url = pasteboard.url {
                callback(.success([
                    "type": "url",
                    "content": url.absoluteString
                ]))
            } else if let urlString = pasteboard.string,
                      URL(string: urlString) != nil {
                callback(.success([
                    "type": "url",
                    "content": urlString
                ]))
            } else {
                callback(.success([
                    "type": "url",
                    "content": NSNull()
                ]))
            }
            
        case .image:
            if let image = pasteboard.image,
               let base64 = image.pngData()?.base64EncodedString() {
                callback(.success([
                    "type": "image",
                    "content": "data:image/png;base64,\(base64)"
                ]))
            } else {
                callback(.success([
                    "type": "image",
                    "content": NSNull()
                ]))
            }
        }
    }
    
    // MARK: - Write
    
    private func write(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let typeString = params.getString("type") ?? "text"
        let type = ClipboardContentType(rawValue: typeString) ?? .text
        
        guard let content = params.getString("content") else {
            callback(.failure(BridgeError.invalidParams("content")))
            return
        }
        
        let pasteboard = UIPasteboard.general
        
        switch type {
        case .text:
            pasteboard.string = content
            callback(.success(nil))
            
        case .html:
            // 写入 HTML 内容
            if #available(iOS 14.0, *) {
                if let data = content.data(using: .utf8) {
                    pasteboard.setData(data, forPasteboardType: UTType.html.identifier)
                    // 同时写入纯文本版本
                    pasteboard.string = content.stripHTML()
                }
            } else {
                if let data = content.data(using: .utf8) {
                    pasteboard.setData(data, forPasteboardType: kUTTypeHTML as String)
                    pasteboard.string = content.stripHTML()
                }
            }
            callback(.success(nil))
            
        case .url:
            if let url = URL(string: content) {
                pasteboard.url = url
                callback(.success(nil))
            } else {
                callback(.failure(BridgeError.invalidParams("无效的 URL")))
            }
            
        case .image:
            // 支持 base64 或 URL
            if content.hasPrefix("data:image") {
                // Base64 图片
                if let base64Data = extractBase64Data(from: content),
                   let data = Data(base64Encoded: base64Data),
                   let image = UIImage(data: data) {
                    pasteboard.image = image
                    callback(.success(nil))
                } else {
                    callback(.failure(BridgeError.invalidParams("无效的 Base64 图片")))
                }
            } else {
                callback(.failure(BridgeError.invalidParams("图片格式不支持")))
            }
        }
    }
    
    // MARK: - HasContent
    
    private func hasContent(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let typeString = params.getString("type") ?? "text"
        let type = ClipboardContentType(rawValue: typeString) ?? .text
        
        let pasteboard = UIPasteboard.general
        var hasContent = false
        
        switch type {
        case .text:
            hasContent = pasteboard.hasStrings
        case .html:
            if #available(iOS 14.0, *) {
                hasContent = pasteboard.contains(pasteboardTypes: [UTType.html.identifier])
            } else {
                hasContent = pasteboard.contains(pasteboardTypes: [kUTTypeHTML as String])
            }
        case .url:
            hasContent = pasteboard.hasURLs
        case .image:
            hasContent = pasteboard.hasImages
        }
        
        callback(.success([
            "type": typeString,
            "hasContent": hasContent
        ]))
    }
    
    // MARK: - Clear
    
    private func clear(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        UIPasteboard.general.items = []
        callback(.success(nil))
    }
    
    // MARK: - GetAvailableTypes
    
    private func getAvailableTypes(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let pasteboard = UIPasteboard.general
        var types: [String] = []
        
        if pasteboard.hasStrings {
            types.append("text")
        }
        if pasteboard.hasURLs {
            types.append("url")
        }
        if pasteboard.hasImages {
            types.append("image")
        }
        
        if #available(iOS 14.0, *) {
            if pasteboard.contains(pasteboardTypes: [UTType.html.identifier]) {
                types.append("html")
            }
        } else {
            if pasteboard.contains(pasteboardTypes: [kUTTypeHTML as String]) {
                types.append("html")
            }
        }
        
        callback(.success([
            "types": types,
            "isEmpty": types.isEmpty
        ]))
    }
    
    // MARK: - 辅助方法
    
    private func extractBase64Data(from dataURL: String) -> String? {
        // 格式: data:image/png;base64,XXXX
        guard let commaIndex = dataURL.firstIndex(of: ",") else {
            return nil
        }
        return String(dataURL[dataURL.index(after: commaIndex)...])
    }
}

// MARK: - String 扩展

private extension String {
    /// 移除 HTML 标签
    func stripHTML() -> String {
        guard let data = self.data(using: .utf8) else { return self }
        
        let options: [NSAttributedString.DocumentReadingOptionKey: Any] = [
            .documentType: NSAttributedString.DocumentType.html,
            .characterEncoding: String.Encoding.utf8.rawValue
        ]
        
        if let attributedString = try? NSAttributedString(data: data, options: options, documentAttributes: nil) {
            return attributedString.string
        }
        
        return self
    }
}
