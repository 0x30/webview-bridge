/**
 * WebView Bridge SDK - 模块协议
 *
 * 定义 Bridge 模块的基础接口
 */

package com.aspect.webviewbridge.protocol

/**
 * Bridge 模块接口
 *
 * 所有能力模块必须实现此接口
 */
interface BridgeModule {
    /**
     * 模块名称
     */
    val moduleName: String
    
    /**
     * 支持的方法列表
     */
    val methods: List<String>
    
    /**
     * 处理请求
     *
     * @param method 方法名
     * @param request 请求对象
     * @param callback 回调函数
     */
    fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    )
}

/**
 * 模块生命周期接口
 *
 * 需要感知应用生命周期的模块可实现此接口
 */
interface BridgeModuleLifecycle {
    /**
     * 模块启用时调用
     */
    fun onEnable() {}
    
    /**
     * 模块禁用时调用
     */
    fun onDisable() {}
    
    /**
     * 应用进入前台
     */
    fun onResume() {}
    
    /**
     * 应用进入后台
     */
    fun onPause() {}
    
    /**
     * 销毁时调用
     */
    fun onDestroy() {}
}

/**
 * 模块上下文接口
 *
 * 提供模块所需的上下文信息
 */
interface BridgeModuleContext {
    /**
     * 发送事件到 Web 端
     */
    fun sendEvent(eventName: String, data: Any?)
    
    /**
     * 获取其他模块
     */
    fun <T : BridgeModule> getModule(moduleClass: Class<T>): T?
    
    /**
     * 获取 Activity （用于权限请求等操作）
     */
    fun getActivity(): android.app.Activity?
}

/**
 * Result 扩展
 */
inline fun <T> Result<T>.fold(
    onSuccess: (T) -> Unit,
    onFailure: (Throwable) -> Unit
) {
    when {
        isSuccess -> onSuccess(getOrThrow())
        isFailure -> onFailure(exceptionOrNull()!!)
    }
}
