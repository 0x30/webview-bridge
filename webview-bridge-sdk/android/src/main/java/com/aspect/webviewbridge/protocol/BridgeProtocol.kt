/**
 * WebView Bridge SDK - 协议层
 *
 * 定义 Bridge 通信协议的基础数据结构
 */

package com.aspect.webviewbridge.protocol

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName

/**
 * Bridge 请求
 */
data class BridgeRequest(
    @SerializedName("version")
    val version: String,
    
    @SerializedName("type")
    val type: String,
    
    @SerializedName("params")
    val params: JsonObject?,
    
    @SerializedName("callbackId")
    val callbackId: String?
) {
    /**
     * 获取模块名称
     */
    val moduleName: String
        get() = type.substringBefore(".")
    
    /**
     * 获取方法名称
     */
    val methodName: String
        get() = type.substringAfter(".")
    
    /**
     * 获取字符串参数
     */
    fun getString(key: String): String? {
        return params?.get(key)?.takeIf { !it.isJsonNull }?.asString
    }
    
    /**
     * 获取整数参数
     */
    fun getInt(key: String): Int? {
        return params?.get(key)?.takeIf { !it.isJsonNull }?.asInt
    }
    
    /**
     * 获取布尔参数
     */
    fun getBool(key: String): Boolean? {
        return params?.get(key)?.takeIf { !it.isJsonNull }?.asBoolean
    }
    
    /**
     * 获取浮点数参数
     */
    fun getDouble(key: String): Double? {
        return params?.get(key)?.takeIf { !it.isJsonNull }?.asDouble
    }
    
    /**
     * 获取数组参数
     */
    fun getArray(key: String): List<JsonElement>? {
        return params?.get(key)?.takeIf { it.isJsonArray }?.asJsonArray?.toList()
    }
    
    /**
     * 获取字符串数组参数
     */
    fun getStringArray(key: String): List<String>? {
        return getArray(key)?.mapNotNull { 
            if (!it.isJsonNull) it.asString else null 
        }
    }
    
    /**
     * 获取对象参数
     */
    fun getObject(key: String): JsonObject? {
        return params?.get(key)?.takeIf { it.isJsonObject }?.asJsonObject
    }
}

/**
 * Bridge 响应
 */
data class BridgeResponse(
    @SerializedName("callbackId")
    val callbackId: String?,
    
    @SerializedName("code")
    val code: Int,
    
    @SerializedName("msg")
    val msg: String,
    
    @SerializedName("data")
    val data: Any?
) {
    companion object {
        private val gson = Gson()
        
        /**
         * 创建成功响应
         */
        fun success(callbackId: String?, data: Any? = null): BridgeResponse {
            return BridgeResponse(
                callbackId = callbackId,
                code = BridgeErrorCode.SUCCESS.code,
                msg = "success",
                data = data
            )
        }
        
        /**
         * 创建错误响应
         */
        fun error(callbackId: String?, error: BridgeError): BridgeResponse {
            return BridgeResponse(
                callbackId = callbackId,
                code = error.code,
                msg = error.message,
                data = null
            )
        }
    }
    
    /**
     * 转换为 JSON 字符串
     */
    fun toJson(): String {
        return gson.toJson(this)
    }
}

/**
 * Bridge 事件
 */
data class BridgeEvent(
    @SerializedName("eventName")
    val eventName: String,
    
    @SerializedName("data")
    val data: Any?
) {
    companion object {
        private val gson = Gson()
    }
    
    /**
     * 转换为 JSON 字符串
     */
    fun toJson(): String {
        return gson.toJson(this)
    }
}

/**
 * 错误码枚举
 */
enum class BridgeErrorCode(val code: Int, val message: String) {
    // 成功
    SUCCESS(0, "success"),
    
    // 协议错误 (1xxx)
    PARSE_ERROR(1001, "请求解析失败"),
    INVALID_VERSION(1002, "协议版本不支持"),
    INVALID_TYPE(1003, "无效的请求类型"),
    INVALID_PARAMS(1004, "参数错误"),
    TIMEOUT(1005, "请求超时"),
    
    // 能力错误 (2xxx)
    MODULE_NOT_FOUND(2001, "模块不存在"),
    METHOD_NOT_FOUND(2002, "方法不存在"),
    CAPABILITY_NOT_SUPPORTED(2003, "设备不支持此能力"),
    
    // 权限错误 (3xxx)
    PERMISSION_DENIED(3001, "权限被拒绝"),
    PERMISSION_NOT_GRANTED(3002, "未授予权限"),
    PERMISSION_PERMANENTLY_DENIED(3003, "权限被永久拒绝"),
    
    // 设备限制 (4xxx)
    DEVICE_NOT_SUPPORTED(4001, "设备不支持"),
    RESOURCE_UNAVAILABLE(4002, "资源不可用"),
    
    // 内部错误 (5xxx)
    INTERNAL_ERROR(5001, "内部错误"),
    UNKNOWN_ERROR(5999, "未知错误");
}

/**
 * Bridge 错误
 */
data class BridgeError(
    val code: Int,
    override val message: String
) : Exception(message) {
    
    constructor(errorCode: BridgeErrorCode) : this(errorCode.code, errorCode.message)
    
    constructor(errorCode: BridgeErrorCode, customMessage: String) : this(errorCode.code, customMessage)
    
    companion object {
        fun parseError(detail: String? = null): BridgeError {
            return BridgeError(
                BridgeErrorCode.PARSE_ERROR.code,
                detail ?: BridgeErrorCode.PARSE_ERROR.message
            )
        }
        
        fun invalidParams(param: String): BridgeError {
            return BridgeError(
                BridgeErrorCode.INVALID_PARAMS.code,
                "参数错误: $param"
            )
        }
        
        fun moduleNotFound(moduleName: String): BridgeError {
            return BridgeError(
                BridgeErrorCode.MODULE_NOT_FOUND.code,
                "模块不存在: $moduleName"
            )
        }
        
        fun methodNotFound(method: String): BridgeError {
            return BridgeError(
                BridgeErrorCode.METHOD_NOT_FOUND.code,
                "方法不存在: $method"
            )
        }
        
        fun permissionDenied(permission: String): BridgeError {
            return BridgeError(
                BridgeErrorCode.PERMISSION_DENIED.code,
                "权限被拒绝: $permission"
            )
        }
        
        fun internalError(detail: String? = null): BridgeError {
            return BridgeError(
                BridgeErrorCode.INTERNAL_ERROR.code,
                detail ?: BridgeErrorCode.INTERNAL_ERROR.message
            )
        }
        
        fun notSupported(feature: String): BridgeError {
            return BridgeError(
                BridgeErrorCode.CAPABILITY_NOT_SUPPORTED.code,
                "不支持: $feature"
            )
        }
    }
}
