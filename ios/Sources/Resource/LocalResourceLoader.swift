/**
 * WebView Bridge SDK - 资源加载层
 *
 * 使用自定义 URL Scheme Handler 加载本地 Web 资源
 * 不参与任何 JS ↔ Native 通信逻辑
 */

import Foundation
import WebKit

// MARK: - 资源加载配置

/// 资源加载配置
public struct ResourceLoaderConfiguration {
    /// 自定义 URL Scheme（如 app://）
    public let scheme: String
    
    /// 自定义 Host（如 localhost）
    public let host: String
    
    /// 本地资源根目录
    public let rootDirectory: URL
    
    /// 默认首页文件名
    public let indexFileName: String
    
    /// 允许的文件扩展名（空表示允许所有）
    public let allowedExtensions: Set<String>
    
    public init(
        scheme: String = "app",
        host: String = "localhost",
        rootDirectory: URL,
        indexFileName: String = "index.html",
        allowedExtensions: Set<String> = []
    ) {
        self.scheme = scheme
        self.host = host
        self.rootDirectory = rootDirectory
        self.indexFileName = indexFileName
        self.allowedExtensions = allowedExtensions
    }
    
    /// 构建基础 URL
    public var baseURL: URL {
        return URL(string: "\(scheme)://\(host)/")!
    }
}

// MARK: - 资源加载器

/// 本地资源加载器
/// 处理自定义 URL Scheme，将请求映射到本地文件
@available(iOS 11.0, *)
public class LocalResourceLoader: NSObject, WKURLSchemeHandler {
    
    /// 配置（可修改，支持动态更新路径）
    public private(set) var configuration: ResourceLoaderConfiguration
    
    /// 更新资源根目录
    /// - Parameter newRootDirectory: 新的根目录
    public func updateRootDirectory(_ newRootDirectory: URL) {
        configuration = ResourceLoaderConfiguration(
            scheme: configuration.scheme,
            host: configuration.host,
            rootDirectory: newRootDirectory,
            indexFileName: configuration.indexFileName,
            allowedExtensions: configuration.allowedExtensions
        )
        print("[LocalResourceLoader] 更新根目录: \(newRootDirectory.path)")
    }
    
    /// MIME 类型映射
    private let mimeTypes: [String: String] = [
        "html": "text/html",
        "htm": "text/html",
        "css": "text/css",
        "js": "application/javascript",
        "mjs": "application/javascript",
        "json": "application/json",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "webp": "image/webp",
        "ico": "image/x-icon",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "ttf": "font/ttf",
        "otf": "font/otf",
        "eot": "application/vnd.ms-fontobject",
        "mp4": "video/mp4",
        "webm": "video/webm",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "pdf": "application/pdf",
        "xml": "application/xml",
        "txt": "text/plain",
        "map": "application/json"
    ]
    
    /// 使用详细配置初始化
    /// - Parameter configuration: 资源加载配置
    public init(configuration: ResourceLoaderConfiguration) {
        self.configuration = configuration
        super.init()
    }
    
    /// 使用简化的 URLSchemeConfiguration 初始化
    /// - Parameter configuration: URL Scheme 配置
    public init(configuration: URLSchemeConfiguration) {
        // 从 Bundle 获取资源目录
        let rootDir = Bundle.main.bundleURL.appendingPathComponent(configuration.resourcePath)
        
        self.configuration = ResourceLoaderConfiguration(
            scheme: configuration.scheme,
            host: configuration.host,
            rootDirectory: rootDir,
            indexFileName: "index.html",
            allowedExtensions: []
        )
        super.init()
    }
    
    // MARK: - WKURLSchemeHandler
    
    public func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            failWithError(urlSchemeTask, message: "无效的 URL")
            return
        }
        
        // 验证 host
        guard url.host == configuration.host else {
            failWithError(urlSchemeTask, message: "无效的 Host: \(url.host ?? "")")
            return
        }
        
        // 获取相对路径
        var relativePath = url.path
        if relativePath.isEmpty || relativePath == "/" {
            relativePath = "/" + configuration.indexFileName
        }
        
        // 移除开头的斜杠
        if relativePath.hasPrefix("/") {
            relativePath = String(relativePath.dropFirst())
        }
        
        // 构建本地文件路径
        let fileURL = configuration.rootDirectory.appendingPathComponent(relativePath)
        
        // 安全检查：确保文件在根目录内
        guard fileURL.path.hasPrefix(configuration.rootDirectory.path) else {
            failWithError(urlSchemeTask, message: "路径越界访问")
            return
        }
        
        // 检查文件扩展名
        let fileExtension = fileURL.pathExtension.lowercased()
        if !configuration.allowedExtensions.isEmpty &&
            !configuration.allowedExtensions.contains(fileExtension) {
            failWithError(urlSchemeTask, message: "不允许的文件类型: \(fileExtension)")
            return
        }
        
        // 读取文件
        guard FileManager.default.fileExists(atPath: fileURL.path),
              let data = try? Data(contentsOf: fileURL) else {
            failWithNotFound(urlSchemeTask, path: relativePath)
            return
        }
        
        // 确定 MIME 类型
        let mimeType = mimeTypes[fileExtension] ?? "application/octet-stream"
        
        // 创建响应
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mimeType,
                "Content-Length": "\(data.count)",
                "Cache-Control": "no-cache"
            ]
        )!
        
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }
    
    public func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // 任务被取消，无需特殊处理
    }
    
    // MARK: - 错误处理
    
    private func failWithError(_ task: WKURLSchemeTask, message: String) {
        let error = NSError(
            domain: "LocalResourceLoader",
            code: 400,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
        task.didFailWithError(error)
    }
    
    private func failWithNotFound(_ task: WKURLSchemeTask, path: String) {
        let error = NSError(
            domain: "LocalResourceLoader",
            code: 404,
            userInfo: [NSLocalizedDescriptionKey: "文件不存在: \(path)"]
        )
        task.didFailWithError(error)
    }
}

// MARK: - WebView 配置扩展

@available(iOS 11.0, *)
public extension WKWebViewConfiguration {
    /// 配置本地资源加载
    /// - Parameter loader: 资源加载器
    func setLocalResourceLoader(_ loader: LocalResourceLoader) {
        setURLSchemeHandler(loader, forURLScheme: loader.configuration.scheme)
    }
}

// MARK: - 便捷创建

@available(iOS 11.0, *)
public extension LocalResourceLoader {
    /// 从 Bundle 创建资源加载器
    /// - Parameters:
    ///   - bundle: Bundle（默认为 main）
    ///   - resourcePath: 资源路径（相对于 Bundle）
    ///   - scheme: URL Scheme
    ///   - host: Host
    /// - Returns: 资源加载器，如果路径无效则返回 nil
    static func fromBundle(
        _ bundle: Bundle = .main,
        resourcePath: String,
        scheme: String = "app",
        host: String = "localhost"
    ) -> LocalResourceLoader? {
        guard let resourceURL = bundle.url(forResource: resourcePath, withExtension: nil) else {
            return nil
        }
        
        let config = ResourceLoaderConfiguration(
            scheme: scheme,
            host: host,
            rootDirectory: resourceURL
        )
        
        return LocalResourceLoader(configuration: config)
    }
    
    /// 从文档目录创建资源加载器
    /// - Parameters:
    ///   - subpath: 子路径
    ///   - scheme: URL Scheme
    ///   - host: Host
    /// - Returns: 资源加载器
    static func fromDocuments(
        subpath: String = "",
        scheme: String = "app",
        host: String = "localhost"
    ) -> LocalResourceLoader {
        let documentsURL = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]
        
        let resourceURL = subpath.isEmpty
            ? documentsURL
            : documentsURL.appendingPathComponent(subpath)
        
        let config = ResourceLoaderConfiguration(
            scheme: scheme,
            host: host,
            rootDirectory: resourceURL
        )
        
        return LocalResourceLoader(configuration: config)
    }
}
