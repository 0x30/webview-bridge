/**
 * WebView Bridge SDK - 核心类型定义
 * 协议版本: 1.0
 * 
 * 本文件仅包含 Bridge 通信协议层的核心类型
 * 各模块的业务类型定义在各自的模块文件中
 */

// =============================================================================
// 协议类型
// =============================================================================

/** 协议版本常量 */
export const PROTOCOL_VERSION = '1.0';

/** Bridge 请求结构 */
export interface BridgeRequest {
  /** 协议版本 */
  version: string;
  /** 能力标识: Module.Method */
  type: string;
  /** 请求参数 */
  params: Record<string, unknown>;
  /** 唯一回调 ID */
  callbackId: string;
}

/** Bridge 响应结构 */
export interface BridgeResponse<T = unknown> {
  /** 对应请求的回调 ID */
  callbackId: string;
  /** 错误码（0 表示成功） */
  code: number;
  /** 人类可读的错误信息 */
  msg: string;
  /** 响应数据 */
  data: T;
}

/** Native 事件结构 */
export interface BridgeEvent<T = unknown> {
  /** 事件名称: Module.EventName */
  event: string;
  /** 事件数据 */
  data: T;
}

// =============================================================================
// 错误码规范
// =============================================================================

/**
 * 错误码定义
 * 
 * 错误码分段规则：
 * - 0: 成功
 * - 1xxx: 协议错误（JSON 非法、字段缺失等）
 * - 2xxx: 能力错误（模块/方法不存在等）
 * - 3xxx: 权限错误
 * - 4xxx: 设备/系统限制
 * - 5xxx: 内部异常
 */
export const ErrorCodes = {
  // 成功
  SUCCESS: 0,

  // 1xxx: 协议错误
  INVALID_JSON: 1001,           // JSON 解析失败
  MISSING_REQUIRED_FIELD: 1002, // 缺少必填字段
  INVALID_VERSION: 1003,        // 协议版本不支持
  INVALID_TYPE_FORMAT: 1004,    // type 格式错误
  INVALID_PARAMS: 1005,         // 参数格式错误

  // 2xxx: 能力错误
  MODULE_NOT_FOUND: 2001,       // 模块不存在
  METHOD_NOT_FOUND: 2002,       // 方法不存在
  CAPABILITY_NOT_SUPPORTED: 2003, // 能力不支持

  // 3xxx: 权限错误
  PERMISSION_DENIED: 3001,      // 权限被拒绝
  PERMISSION_NOT_DETERMINED: 3002, // 权限未决定
  PERMISSION_RESTRICTED: 3003,  // 权限受限
  PERMISSION_REQUIRED: 3004,    // 需要权限

  // 4xxx: 设备/系统限制
  DEVICE_NOT_SUPPORTED: 4001,   // 设备不支持
  OS_VERSION_TOO_LOW: 4002,     // 系统版本过低
  SYSTEM_RESTRICTION: 4003,     // 系统限制
  FEATURE_DISABLED: 4004,       // 功能被禁用

  // 5xxx: 内部异常
  INTERNAL_ERROR: 5001,         // 内部错误
  TIMEOUT: 5002,                // 请求超时
  BRIDGE_NOT_READY: 5003,       // Bridge 未就绪
  WEBVIEW_DESTROYED: 5004,      // WebView 已销毁
  CANCELLED: 5005,              // 操作被取消
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// Bridge 配置
// =============================================================================

/** Bridge 配置选项 */
export interface BridgeConfig {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 自定义日志器 */
  logger?: BridgeLogger;
}

/** 日志器接口 */
export interface BridgeLogger {
  log: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// =============================================================================
// 模块接口
// =============================================================================

/** 模块基础接口 */
export interface BridgeModule {
  /** 模块名称 */
  readonly moduleName: string;
  /** 支持的方法列表 */
  readonly methods: readonly string[];
}

// =============================================================================
// 回调与事件
// =============================================================================

/** 事件处理函数 */
export type EventHandler<T = unknown> = (data: T) => void;

/** 待处理回调 */
export interface PendingCallback<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason: BridgeError) => void;
  timeout: ReturnType<typeof setTimeout>;
  timestamp: number;
}

// =============================================================================
// 错误类
// =============================================================================

/** Bridge 错误 */
export class BridgeError extends Error {
  /** 错误码 */
  public readonly code: number;
  /** 错误信息 */
  public readonly bridgeMessage: string;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.bridgeMessage = message;
    Object.setPrototypeOf(this, BridgeError.prototype);
  }

  /** 从响应创建错误 */
  static fromResponse(response: BridgeResponse): BridgeError {
    return new BridgeError(response.code, response.msg);
  }

  /** 创建超时错误 */
  static timeout(): BridgeError {
    return new BridgeError(ErrorCodes.TIMEOUT, '请求超时');
  }

  /** 创建未就绪错误 */
  static notReady(): BridgeError {
    return new BridgeError(ErrorCodes.BRIDGE_NOT_READY, 'Bridge 尚未就绪');
  }

  /** 创建不支持错误 */
  static notSupported(capability: string): BridgeError {
    return new BridgeError(
      ErrorCodes.CAPABILITY_NOT_SUPPORTED,
      `不支持的能力: ${capability}`
    );
  }

  /** 创建模块未找到错误 */
  static moduleNotFound(moduleName: string): BridgeError {
    return new BridgeError(
      ErrorCodes.MODULE_NOT_FOUND,
      `模块不存在: ${moduleName}`
    );
  }

  /** 创建方法未找到错误 */
  static methodNotFound(type: string): BridgeError {
    return new BridgeError(
      ErrorCodes.METHOD_NOT_FOUND,
      `方法不存在: ${type}`
    );
  }
}
