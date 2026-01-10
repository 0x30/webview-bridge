/**
 * WebView Bridge SDK - 示例扩展模块 (Android)
 *
 * 此文件演示如何在 Android 端扩展自定义模块
 * 第三方开发者可参考此示例创建自己的模块
 */

package com.aspect.webviewbridge.modules

import android.content.Context
import com.aspect.webviewbridge.protocol.*
import kotlinx.coroutines.*
import java.util.UUID

// =============================================================================
// 数据类定义
// =============================================================================

/**
 * 用户信息
 */
data class UserInfo(
    val userId: String,
    val username: String,
    val avatar: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val extra: Map<String, Any>? = null
)

/**
 * 登录类型
 */
enum class LoginType {
    password, sms, oauth
}

/**
 * OAuth 提供商
 */
enum class OAuthProvider {
    wechat, apple, google
}

/**
 * 登录结果
 */
data class LoginResult(
    val success: Boolean,
    val user: UserInfo? = null,
    val token: String? = null,
    val error: String? = null
)

/**
 * 分析事件
 */
data class AnalyticsEvent(
    val event: String,
    val properties: Map<String, Any>? = null,
    val timestamp: Long = System.currentTimeMillis()
)

// =============================================================================
// 用户模块示例
// =============================================================================

/**
 * 用户模块 - 示例扩展
 *
 * 演示如何创建一个自定义模块来处理用户相关功能
 * 第三方只需实现 BridgeModule 接口即可
 */
class UserExampleModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "User"
    override val methods = listOf("GetCurrentUser", "Login", "Logout", "UpdateProfile")
    
    // 模拟的当前用户
    private var currentUser: UserInfo? = null
    
    // 协程作用域
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "GetCurrentUser" -> handleGetCurrentUser(callback)
            "Login" -> handleLogin(request, callback)
            "Logout" -> handleLogout(callback)
            "UpdateProfile" -> handleUpdateProfile(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - 方法实现
    
    private fun handleGetCurrentUser(callback: (Result<Any?>) -> Unit) {
        callback(Result.success(currentUser?.toMap()))
    }
    
    private fun handleLogin(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val params = request.params
        val typeString = params["type"] as? String
        
        if (typeString == null) {
            callback(Result.failure(BridgeError.invalidParams("缺少 type 参数")))
            return
        }
        
        // 模拟异步登录
        scope.launch {
            delay(500) // 模拟网络请求
            
            val user = UserInfo(
                userId = "user_${(1000..9999).random()}",
                username = params["account"] as? String ?: "TestUser"
            )
            
            currentUser = user
            
            val result = LoginResult(
                success = true,
                user = user,
                token = "mock_token_${UUID.randomUUID()}"
            )
            
            callback(Result.success(result.toMap()))
        }
    }
    
    private fun handleLogout(callback: (Result<Any?>) -> Unit) {
        currentUser = null
        callback(Result.success(null))
    }
    
    private fun handleUpdateProfile(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val user = currentUser
        if (user == null) {
            callback(Result.failure(BridgeError.internalError("用户未登录")))
            return
        }
        
        val params = request.params
        
        // 更新用户信息
        val updatedUser = user.copy(
            username = params["username"] as? String ?: user.username,
            avatar = params["avatar"] as? String ?: user.avatar,
            email = params["email"] as? String ?: user.email,
            phone = params["phone"] as? String ?: user.phone
        )
        
        currentUser = updatedUser
        callback(Result.success(updatedUser.toMap()))
    }
    
    // 清理资源
    fun onDestroy() {
        scope.cancel()
    }
}

// =============================================================================
// 分析模块示例
// =============================================================================

/**
 * 分析模块 - 示例扩展
 *
 * 演示如何创建一个埋点/分析模块
 */
class AnalyticsExampleModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "Analytics"
    override val methods = listOf("Track", "SetUserId", "SetUserProperties", "Flush")
    
    // 事件缓存
    private val eventBuffer = mutableListOf<AnalyticsEvent>()
    private var userId: String? = null
    private val userProperties = mutableMapOf<String, Any>()
    
    // 协程作用域
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "Track" -> handleTrack(request, callback)
            "SetUserId" -> handleSetUserId(request, callback)
            "SetUserProperties" -> handleSetUserProperties(request, callback)
            "Flush" -> handleFlush(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - 方法实现
    
    private fun handleTrack(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val params = request.params
        val eventName = params["event"] as? String
        
        if (eventName == null) {
            callback(Result.failure(BridgeError.invalidParams("缺少 event 参数")))
            return
        }
        
        @Suppress("UNCHECKED_CAST")
        val event = AnalyticsEvent(
            event = eventName,
            properties = params["properties"] as? Map<String, Any>,
            timestamp = (params["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()
        )
        
        eventBuffer.add(event)
        android.util.Log.d("Analytics", "记录事件: $eventName")
        
        callback(Result.success(null))
    }
    
    private fun handleSetUserId(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val userId = request.params["userId"] as? String
        
        if (userId == null) {
            callback(Result.failure(BridgeError.invalidParams("缺少 userId 参数")))
            return
        }
        
        this.userId = userId
        android.util.Log.d("Analytics", "设置用户 ID: $userId")
        
        callback(Result.success(null))
    }
    
    private fun handleSetUserProperties(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        @Suppress("UNCHECKED_CAST")
        val properties = request.params["properties"] as? Map<String, Any>
        
        if (properties != null) {
            userProperties.putAll(properties)
            android.util.Log.d("Analytics", "设置用户属性: ${properties.keys.joinToString()}")
        }
        
        callback(Result.success(null))
    }
    
    private fun handleFlush(callback: (Result<Any?>) -> Unit) {
        android.util.Log.d("Analytics", "发送 ${eventBuffer.size} 个事件")
        
        // 模拟网络请求
        scope.launch {
            delay(300)
            eventBuffer.clear()
            callback(Result.success(null))
        }
    }
    
    // 清理资源
    fun onDestroy() {
        scope.cancel()
    }
}

// =============================================================================
// 辅助扩展
// =============================================================================

private fun UserInfo.toMap(): Map<String, Any?> = mapOf(
    "userId" to userId,
    "username" to username,
    "avatar" to avatar,
    "email" to email,
    "phone" to phone,
    "extra" to extra
)

private fun LoginResult.toMap(): Map<String, Any?> = mapOf(
    "success" to success,
    "user" to user?.toMap(),
    "token" to token,
    "error" to error
)
