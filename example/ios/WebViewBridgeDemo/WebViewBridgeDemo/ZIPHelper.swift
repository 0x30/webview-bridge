/**
 * ZIPHelper - 纯 Swift ZIP 解压工具
 *
 * 使用 Compression 框架实现 ZIP 解压
 * 不需要任何第三方依赖
 */

import Foundation
import Compression

/// ZIP 解压工具
public class ZIPHelper {
    
    /// ZIP 文件格式错误
    public enum ZIPError: Error, LocalizedError {
        case invalidFile
        case corruptedData
        case unsupportedFormat
        case extractionFailed(String)
        case fileNotFound
        
        public var errorDescription: String? {
            switch self {
            case .invalidFile:
                return "无效的 ZIP 文件"
            case .corruptedData:
                return "ZIP 文件数据损坏"
            case .unsupportedFormat:
                return "不支持的压缩格式"
            case .extractionFailed(let message):
                return "解压失败: \(message)"
            case .fileNotFound:
                return "文件不存在"
            }
        }
    }
    
    /// 解压 ZIP 文件
    /// - Parameters:
    ///   - sourceURL: ZIP 文件路径
    ///   - destinationURL: 解压目标目录
    ///   - skipCRC: 是否跳过 CRC 校验（加快速度）
    /// - Throws: ZIPError
    public static func unzip(
        _ sourceURL: URL,
        to destinationURL: URL,
        skipCRC: Bool = true
    ) throws {
        guard FileManager.default.fileExists(atPath: sourceURL.path) else {
            throw ZIPError.fileNotFound
        }
        
        // 读取 ZIP 文件
        let zipData = try Data(contentsOf: sourceURL)
        
        // 创建目标目录
        try FileManager.default.createDirectory(
            at: destinationURL,
            withIntermediateDirectories: true
        )
        
        // 解析并解压 ZIP
        try extractZIPData(zipData, to: destinationURL)
    }
    
    /// 解析 ZIP 数据并解压
    private static func extractZIPData(_ data: Data, to destinationURL: URL) throws {
        // ZIP 文件结构解析
        // Local File Header: 4 bytes signature (0x04034b50)
        
        var offset = 0
        let fileManager = FileManager.default
        
        while offset < data.count - 4 {
            // 读取签名
            let signature = data.subdata(in: offset..<(offset + 4)).withUnsafeBytes {
                $0.load(as: UInt32.self)
            }
            
            // Local File Header signature
            if signature == 0x04034b50 {
                guard let (entry, nextOffset) = try parseLocalFileHeader(data: data, offset: offset) else {
                    break
                }
                
                // 创建文件路径
                let filePath = destinationURL.appendingPathComponent(entry.fileName)
                
                if entry.fileName.hasSuffix("/") {
                    // 目录
                    try fileManager.createDirectory(at: filePath, withIntermediateDirectories: true)
                } else {
                    // 文件
                    let parentDir = filePath.deletingLastPathComponent()
                    try fileManager.createDirectory(at: parentDir, withIntermediateDirectories: true)
                    
                    // 解压文件数据
                    let fileData: Data
                    if entry.compressionMethod == 0 {
                        // 无压缩（Stored）
                        fileData = entry.compressedData
                    } else if entry.compressionMethod == 8 {
                        // Deflate 压缩
                        fileData = try decompressDeflate(entry.compressedData)
                    } else {
                        throw ZIPError.unsupportedFormat
                    }
                    
                    try fileData.write(to: filePath)
                }
                
                offset = nextOffset
            } else if signature == 0x02014b50 {
                // Central Directory Header - 已完成
                break
            } else {
                offset += 1
            }
        }
    }
    
    /// ZIP 条目
    private struct ZIPEntry {
        let fileName: String
        let compressionMethod: UInt16
        let compressedData: Data
        let uncompressedSize: UInt32
    }
    
    /// 解析 Local File Header
    private static func parseLocalFileHeader(data: Data, offset: Int) throws -> (ZIPEntry, Int)? {
        guard offset + 30 <= data.count else { return nil }
        
        // 读取头部字段
        let header = data.subdata(in: offset..<(offset + 30))
        
        let compressionMethod: UInt16 = header.subdata(in: 8..<10).withUnsafeBytes { $0.load(as: UInt16.self) }
        let compressedSize: UInt32 = header.subdata(in: 18..<22).withUnsafeBytes { $0.load(as: UInt32.self) }
        let uncompressedSize: UInt32 = header.subdata(in: 22..<26).withUnsafeBytes { $0.load(as: UInt32.self) }
        let fileNameLength: UInt16 = header.subdata(in: 26..<28).withUnsafeBytes { $0.load(as: UInt16.self) }
        let extraFieldLength: UInt16 = header.subdata(in: 28..<30).withUnsafeBytes { $0.load(as: UInt16.self) }
        
        // 读取文件名
        let fileNameStart = offset + 30
        let fileNameEnd = fileNameStart + Int(fileNameLength)
        guard fileNameEnd <= data.count else { return nil }
        
        let fileNameData = data.subdata(in: fileNameStart..<fileNameEnd)
        guard let fileName = String(data: fileNameData, encoding: .utf8) else {
            throw ZIPError.corruptedData
        }
        
        // 跳过 extra field
        let dataStart = fileNameEnd + Int(extraFieldLength)
        let dataEnd = dataStart + Int(compressedSize)
        guard dataEnd <= data.count else { return nil }
        
        let compressedData = data.subdata(in: dataStart..<dataEnd)
        
        let entry = ZIPEntry(
            fileName: fileName,
            compressionMethod: compressionMethod,
            compressedData: compressedData,
            uncompressedSize: uncompressedSize
        )
        
        return (entry, dataEnd)
    }
    
    /// 使用 Compression 框架解压 Deflate 数据
    private static func decompressDeflate(_ data: Data) throws -> Data {
        // 使用 zlib 解压 (raw deflate)
        let destinationBufferSize = data.count * 10 // 预估解压后大小
        var destinationBuffer = [UInt8](repeating: 0, count: destinationBufferSize)
        
        let decodedSize = data.withUnsafeBytes { sourceBuffer -> Int in
            guard let sourcePointer = sourceBuffer.baseAddress else { return 0 }
            
            return compression_decode_buffer(
                &destinationBuffer,
                destinationBufferSize,
                sourcePointer.assumingMemoryBound(to: UInt8.self),
                data.count,
                nil,
                COMPRESSION_ZLIB
            )
        }
        
        if decodedSize == 0 {
            throw ZIPError.extractionFailed("Deflate 解压失败")
        }
        
        return Data(destinationBuffer.prefix(decodedSize))
    }
    
    /// 使用更简单的方式：调用系统 unzip 命令（仅限 macOS/模拟器）
    public static func unzipUsingSystemCommand(
        _ sourceURL: URL,
        to destinationURL: URL
    ) throws {
        #if targetEnvironment(simulator)
        // 在模拟器上可以使用系统命令
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
        process.arguments = ["-o", sourceURL.path, "-d", destinationURL.path]
        
        try process.run()
        process.waitUntilExit()
        
        if process.terminationStatus != 0 {
            throw ZIPError.extractionFailed("unzip 命令执行失败")
        }
        #else
        // 在真机上使用纯 Swift 实现
        try unzip(sourceURL, to: destinationURL)
        #endif
    }
}

// MARK: - Data Extension for Decompression

extension Data {
    /// 使用 zlib 解压数据
    func decompressed() throws -> Data {
        guard !isEmpty else { return Data() }
        
        let bufferSize = count * 10
        var destinationBuffer = [UInt8](repeating: 0, count: bufferSize)
        
        let decodedSize = withUnsafeBytes { sourceBytes -> Int in
            guard let sourcePointer = sourceBytes.baseAddress else { return 0 }
            
            return compression_decode_buffer(
                &destinationBuffer,
                bufferSize,
                sourcePointer.assumingMemoryBound(to: UInt8.self),
                count,
                nil,
                COMPRESSION_ZLIB
            )
        }
        
        guard decodedSize > 0 else {
            throw ZIPHelper.ZIPError.extractionFailed("解压失败")
        }
        
        return Data(destinationBuffer.prefix(decodedSize))
    }
}
