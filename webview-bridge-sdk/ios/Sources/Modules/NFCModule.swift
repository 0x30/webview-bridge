/**
 * NFC 模块 - 近场通信功能
 *
 * 提供 NFC 读写功能（CoreNFC）
 */

import Foundation
import CoreNFC

// MARK: - NFC 模块

@available(iOS 13.0, *)
public class NFCModule: NSObject, BridgeModule {
    
    public let moduleName = "NFC"
    public let methods = [
        "IsAvailable",
        "IsEnabled",
        "StartScan",
        "StopScan",
        "WriteTag"
    ]
    
    private weak var bridge: WebViewBridge?
    private var ndefSession: NFCNDEFReaderSession?
    private var tagSession: NFCTagReaderSession?
    private var pendingCallback: ((Result<Any?, BridgeError>) -> Void)?
    private var writeMessage: NFCNDEFMessage?
    private var isWriteMode = false
    
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
        case "IsAvailable":
            isAvailable(callback: callback)
        case "IsEnabled":
            isEnabled(callback: callback)
        case "StartScan":
            startScan(params: params, callback: callback)
        case "StopScan":
            stopScan(callback: callback)
        case "WriteTag":
            writeTag(params: params, callback: callback)
        default:
            callback(.failure(BridgeError.methodNotFound("\(moduleName).\(method)")))
        }
    }
    
    // MARK: - IsAvailable
    
    /// 检查 NFC 是否可用
    private func isAvailable(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        let available = NFCNDEFReaderSession.readingAvailable
        
        callback(.success([
            "isAvailable": available,
            "ndefSupported": available,
            "tagSupported": NFCTagReaderSession.readingAvailable
        ]))
    }
    
    // MARK: - IsEnabled
    
    /// 检查 NFC 是否开启（iOS 上等同于 isAvailable）
    private func isEnabled(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        callback(.success([
            "isEnabled": NFCNDEFReaderSession.readingAvailable
        ]))
    }
    
    // MARK: - StartScan
    
    /// 开始扫描 NFC 标签
    private func startScan(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard NFCNDEFReaderSession.readingAvailable else {
            callback(.failure(BridgeError(code: .featureDisabled, message: "NFC 不可用")))
            return
        }
        
        // 停止现有会话
        ndefSession?.invalidate()
        
        let alertMessage = params["alertMessage"]?.stringValue ?? "将设备靠近 NFC 标签"
        let keepSessionAlive = params["keepSessionAlive"]?.boolValue ?? false
        
        isWriteMode = false
        pendingCallback = callback
        
        ndefSession = NFCNDEFReaderSession(
            delegate: self,
            queue: nil,
            invalidateAfterFirstRead: !keepSessionAlive
        )
        ndefSession?.alertMessage = alertMessage
        ndefSession?.begin()
    }
    
    // MARK: - StopScan
    
    /// 停止扫描
    private func stopScan(callback: @escaping (Result<Any?, BridgeError>) -> Void) {
        ndefSession?.invalidate()
        ndefSession = nil
        tagSession?.invalidate()
        tagSession = nil
        
        callback(.success(["stopped": true]))
    }
    
    // MARK: - WriteTag
    
    /// 写入 NFC 标签
    private func writeTag(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard NFCNDEFReaderSession.readingAvailable else {
            callback(.failure(BridgeError(code: .featureDisabled, message: "NFC 不可用")))
            return
        }
        
        // 构建 NDEF 消息
        var records: [NFCNDEFPayload] = []
        
        // 支持写入文本
        if let text = params["text"]?.stringValue {
            if let payload = NFCNDEFPayload.wellKnownTypeTextPayload(
                string: text,
                locale: Locale.current
            ) {
                records.append(payload)
            }
        }
        
        // 支持写入 URI
        if let uri = params["uri"]?.stringValue,
           let url = URL(string: uri) {
            if let payload = NFCNDEFPayload.wellKnownTypeURIPayload(url: url) {
                records.append(payload)
            }
        }
        
        // 支持写入自定义记录
        if let recordsData = params["records"]?.arrayValue {
            for recordInfo in recordsData {
                if let record = recordInfo as? [String: Any] {
                    if let payload = createNDEFPayload(from: record) {
                        records.append(payload)
                    }
                }
            }
        }
        
        guard !records.isEmpty else {
            callback(.failure(BridgeError.invalidParams("text/uri/records")))
            return
        }
        
        writeMessage = NFCNDEFMessage(records: records)
        isWriteMode = true
        pendingCallback = callback
        
        let alertMessage = params["alertMessage"]?.stringValue ?? "将设备靠近要写入的 NFC 标签"
        
        ndefSession?.invalidate()
        ndefSession = NFCNDEFReaderSession(
            delegate: self,
            queue: nil,
            invalidateAfterFirstRead: false
        )
        ndefSession?.alertMessage = alertMessage
        ndefSession?.begin()
    }
    
    // MARK: - 辅助方法
    
    private func createNDEFPayload(from record: [String: Any]) -> NFCNDEFPayload? {
        guard let typeString = record["type"] as? String,
              let payloadString = record["payload"] as? String,
              let payloadData = payloadString.data(using: .utf8) else {
            return nil
        }
        
        let tnf: NFCTypeNameFormat
        switch record["tnf"] as? String {
        case "empty":
            tnf = .empty
        case "wellKnown":
            tnf = .nfcWellKnown
        case "media":
            tnf = .media
        case "absoluteUri":
            tnf = .absoluteURI
        case "external":
            tnf = .nfcExternal
        default:
            tnf = .unknown
        }
        
        let typeData = typeString.data(using: .utf8) ?? Data()
        let identifier = (record["id"] as? String)?.data(using: .utf8) ?? Data()
        
        return NFCNDEFPayload(
            format: tnf,
            type: typeData,
            identifier: identifier,
            payload: payloadData
        )
    }
    
    private func parseNDEFMessage(_ message: NFCNDEFMessage) -> [[String: Any]] {
        return message.records.map { record in
            var info: [String: Any] = [
                "tnf": tnfString(record.typeNameFormat),
                "type": String(data: record.type, encoding: .utf8) ?? "",
                "identifier": String(data: record.identifier, encoding: .utf8) ?? ""
            ]
            
            // 解析 payload
            if let text = record.wellKnownTypeTextPayload().0 {
                info["text"] = text
                info["locale"] = record.wellKnownTypeTextPayload().1?.identifier ?? ""
            }
            
            if let url = record.wellKnownTypeURIPayload() {
                info["uri"] = url.absoluteString
            }
            
            // 原始 payload
            info["payload"] = record.payload.base64EncodedString()
            info["payloadText"] = String(data: record.payload, encoding: .utf8)
            
            return info
        }
    }
    
    private func tnfString(_ tnf: NFCTypeNameFormat) -> String {
        switch tnf {
        case .empty:
            return "empty"
        case .nfcWellKnown:
            return "wellKnown"
        case .media:
            return "media"
        case .absoluteURI:
            return "absoluteUri"
        case .nfcExternal:
            return "external"
        case .unknown:
            return "unknown"
        case .unchanged:
            return "unchanged"
        @unknown default:
            return "unknown"
        }
    }
}

// MARK: - NFCNDEFReaderSessionDelegate

@available(iOS 13.0, *)
extension NFCModule: NFCNDEFReaderSessionDelegate {
    
    public func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        // 读取模式
        guard !isWriteMode else { return }
        
        var allRecords: [[String: Any]] = []
        for message in messages {
            allRecords.append(contentsOf: parseNDEFMessage(message))
        }
        
        DispatchQueue.main.async {
            // 发送事件
            self.bridge?.sendEvent(BridgeEvent(event: "NFC.TagDetected", data: [
                "records": allRecords
            ]))
            
            // 如果有回调，也调用
            self.pendingCallback?(.success([
                "records": allRecords
            ]))
            self.pendingCallback = nil
        }
    }
    
    public func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [NFCNDEFTag]) {
        guard let tag = tags.first else { return }
        
        session.connect(to: tag) { error in
            if let error = error {
                session.invalidate(errorMessage: "连接失败: \(error.localizedDescription)")
                return
            }
            
            if self.isWriteMode {
                // 写入模式
                self.writeToTag(tag: tag, session: session)
            } else {
                // 读取模式
                self.readFromTag(tag: tag, session: session)
            }
        }
    }
    
    private func readFromTag(tag: NFCNDEFTag, session: NFCNDEFReaderSession) {
        tag.queryNDEFStatus { status, capacity, error in
            if let error = error {
                session.invalidate(errorMessage: "读取状态失败: \(error.localizedDescription)")
                return
            }
            
            tag.readNDEF { message, error in
                DispatchQueue.main.async {
                    if let error = error {
                        self.pendingCallback?(.failure(BridgeError(
                            code: .internalError,
                            message: "读取失败: \(error.localizedDescription)"
                        )))
                        session.invalidate(errorMessage: "读取失败")
                    } else if let message = message {
                        let records = self.parseNDEFMessage(message)
                        
                        self.bridge?.sendEvent(BridgeEvent(event: "NFC.TagDetected", data: [
                            "records": records,
                            "capacity": capacity
                        ]))
                        
                        self.pendingCallback?(.success([
                            "records": records,
                            "capacity": capacity
                        ]))
                        
                        session.alertMessage = "读取成功"
                        session.invalidate()
                    }
                    
                    self.pendingCallback = nil
                }
            }
        }
    }
    
    private func writeToTag(tag: NFCNDEFTag, session: NFCNDEFReaderSession) {
        guard let message = writeMessage else {
            session.invalidate(errorMessage: "没有要写入的数据")
            return
        }
        
        tag.queryNDEFStatus { status, capacity, error in
            if let error = error {
                session.invalidate(errorMessage: "查询状态失败: \(error.localizedDescription)")
                return
            }
            
            switch status {
            case .notSupported:
                session.invalidate(errorMessage: "标签不支持 NDEF")
                
            case .readOnly:
                session.invalidate(errorMessage: "标签是只读的")
                
            case .readWrite:
                tag.writeNDEF(message) { error in
                    DispatchQueue.main.async {
                        if let error = error {
                            self.pendingCallback?(.failure(BridgeError(
                                code: .internalError,
                                message: "写入失败: \(error.localizedDescription)"
                            )))
                            session.invalidate(errorMessage: "写入失败")
                        } else {
                            self.pendingCallback?(.success([
                                "success": true,
                                "capacity": capacity
                            ]))
                            session.alertMessage = "写入成功"
                            session.invalidate()
                        }
                        
                        self.pendingCallback = nil
                        self.writeMessage = nil
                        self.isWriteMode = false
                    }
                }
                
            @unknown default:
                session.invalidate(errorMessage: "未知状态")
            }
        }
    }
    
    public func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        DispatchQueue.main.async {
            let nsError = error as NSError
            
            // 用户取消不算错误
            if nsError.code == NFCReaderError.readerSessionInvalidationErrorUserCanceled.rawValue {
                self.pendingCallback?(.success([
                    "cancelled": true
                ]))
            } else if nsError.code != NFCReaderError.readerSessionInvalidationErrorFirstNDEFTagRead.rawValue {
                self.pendingCallback?(.failure(BridgeError(
                    code: .internalError,
                    message: error.localizedDescription
                )))
            }
            
            self.pendingCallback = nil
            self.ndefSession = nil
        }
    }
    
    public func readerSessionDidBecomeActive(_ session: NFCNDEFReaderSession) {
        // 会话激活
        bridge?.sendEvent(BridgeEvent(event: "NFC.SessionActive", data: [:]))
    }
}
