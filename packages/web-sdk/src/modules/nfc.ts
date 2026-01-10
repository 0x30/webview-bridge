/**
 * NFC 模块 - 近场通信功能
 *
 * 提供 NFC 读写功能
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// MARK: - 类型定义

export type TNFType = 'empty' | 'wellKnown' | 'media' | 'absoluteUri' | 'external' | 'unknown' | 'unchanged'

export interface NFCAvailability {
  isAvailable: boolean
  ndefSupported: boolean
  tagSupported: boolean
}

export interface NFCEnabled {
  isEnabled: boolean
}

export interface NDEFRecord {
  tnf: TNFType
  type: string
  id?: string
  payload: string
  text?: string
  locale?: string
  uri?: string
  payloadText?: string
}

export interface ScanParams {
  alertMessage?: string
  keepSessionAlive?: boolean
}

export interface ScanResult {
  scanning?: boolean
  message?: string
  records?: NDEFRecord[]
  capacity?: number
  isWritable?: boolean
  cancelled?: boolean
}

export interface WriteRecordParams {
  tnf?: TNFType
  type: string
  id?: string
  payload: string
}

export interface WriteParams {
  text?: string
  uri?: string
  records?: WriteRecordParams[]
  alertMessage?: string
}

export interface WriteResult {
  ready?: boolean
  success?: boolean
  capacity?: number
  formatted?: boolean
  message?: string
}

export interface TagDetectedEvent {
  records: NDEFRecord[]
  capacity?: number
  isWritable?: boolean
}

export interface WriteSuccessEvent {
  success: boolean
  capacity?: number
  formatted?: boolean
}

export interface WriteErrorEvent {
  success: false
  error: string
}

export interface NFCErrorEvent {
  error: string
}

// MARK: - NFC 模块类

export class NFCModule implements BridgeModule {
  readonly moduleName = 'NFC'
  readonly methods = [
    'IsAvailable',
    'IsEnabled',
    'StartScan',
    'StopScan',
    'WriteTag',
    'OpenSettings',
  ] as const

  constructor(private bridge: BridgeCore) {}

  async isAvailable(): Promise<NFCAvailability> {
    return this.bridge.send<NFCAvailability>('NFC.IsAvailable')
  }

  async isEnabled(): Promise<NFCEnabled> {
    return this.bridge.send<NFCEnabled>('NFC.IsEnabled')
  }

  async startScan(params?: ScanParams): Promise<ScanResult> {
    return this.bridge.send<ScanResult>('NFC.StartScan', params as Record<string, unknown>)
  }

  async stopScan(): Promise<{ stopped: boolean }> {
    return this.bridge.send<{ stopped: boolean }>('NFC.StopScan')
  }

  async writeTag(params: WriteParams): Promise<WriteResult> {
    return this.bridge.send<WriteResult>('NFC.WriteTag', params as Record<string, unknown>)
  }

  async openSettings(): Promise<{ opened: boolean }> {
    return this.bridge.send<{ opened: boolean }>('NFC.OpenSettings')
  }

  async writeText(text: string, alertMessage?: string): Promise<WriteResult> {
    return this.writeTag({ text, alertMessage })
  }

  async writeUri(uri: string, alertMessage?: string): Promise<WriteResult> {
    return this.writeTag({ uri, alertMessage })
  }

  onTagDetected(callback: (data: TagDetectedEvent) => void): () => void {
    this.bridge.addEventListener('NFC.TagDetected' as any, callback)
    return () => {
      this.bridge.removeEventListener('NFC.TagDetected' as any, callback)
    }
  }

  onWriteSuccess(callback: (data: WriteSuccessEvent) => void): () => void {
    this.bridge.addEventListener('NFC.WriteSuccess' as any, callback)
    return () => {
      this.bridge.removeEventListener('NFC.WriteSuccess' as any, callback)
    }
  }

  onWriteError(callback: (data: WriteErrorEvent) => void): () => void {
    this.bridge.addEventListener('NFC.WriteError' as any, callback)
    return () => {
      this.bridge.removeEventListener('NFC.WriteError' as any, callback)
    }
  }

  onError(callback: (data: NFCErrorEvent) => void): () => void {
    this.bridge.addEventListener('NFC.Error' as any, callback)
    return () => {
      this.bridge.removeEventListener('NFC.Error' as any, callback)
    }
  }

  onSessionActive(callback: () => void): () => void {
    this.bridge.addEventListener('NFC.SessionActive' as any, callback)
    return () => {
      this.bridge.removeEventListener('NFC.SessionActive' as any, callback)
    }
  }
}

export default NFCModule
