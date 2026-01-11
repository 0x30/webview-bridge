/**
 * ZIPHelper - ZIP 解压工具
 *
 * 使用 ZIPFoundation 框架实现可靠的 ZIP 解压
 */

import Foundation
import ZIPFoundation

/// ZIP 文件解压工具（使用 ZIPFoundation）
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
        print("[ZIPHelper] 开始解压: \(sourceURL.path)")
        
        guard FileManager.default.fileExists(atPath: sourceURL.path) else {
            print("[ZIPHelper] ❌ 文件不存在")
            throw ZIPError.fileNotFound
        }
        
        let fileManager = FileManager.default
        
        // 创建目标目录
        try fileManager.createDirectory(
            at: destinationURL,
            withIntermediateDirectories: true
        )
        print("[ZIPHelper] 目标目录: \(destinationURL.path)")
        
        // 使用 ZIPFoundation 解压
        do {
            try fileManager.unzipItem(at: sourceURL, to: destinationURL, skipCRC32: skipCRC)
            print("[ZIPHelper] ✅ 解压完成")
        } catch {
            print("[ZIPHelper] ❌ 解压失败: \(error)")
            throw ZIPError.extractionFailed(error.localizedDescription)
        }
    }
}
