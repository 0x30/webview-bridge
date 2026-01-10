// Example Android Modules (client-side)
// Place this in your app module, not inside the SDK.

package com.example.app.modules

import android.content.Context
import com.aspect.webviewbridge.protocol.*
import kotlinx.coroutines.*
import java.util.UUID

data class UserInfo(
    val userId: String,
    val username: String,
    val avatar: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val extra: Map<String, Any>? = null
)

data class LoginResult(
    val success: Boolean,
    val user: UserInfo? = null,
    val token: String? = null,
    val error: String? = null
)

data class AnalyticsEvent(
    val event: String,
    val properties: Map<String, Any>? = null,
    val timestamp: Long = System.currentTimeMillis()
)

class UserExampleModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    override val moduleName = "User"
    override val methods = listOf("GetCurrentUser", "Login", "Logout", "UpdateProfile")
    private var currentUser: UserInfo? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun handleRequest(method: String, request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        when (method) {
            "GetCurrentUser" -> callback(Result.success(currentUser?.toMap()))
            "Login" -> {
                scope.launch {
                    delay(500)
                    val user = UserInfo(
                        userId = "user_${(1000..9999).random()}",
                        username = request.params["account"] as? String ?: "TestUser"
                    )
                    currentUser = user
                    val result = LoginResult(true, user, token = "mock_${UUID.randomUUID()}")
                    callback(Result.success(result.toMap()))
                }
            }
            "Logout" -> { currentUser = null; callback(Result.success(null)) }
            "UpdateProfile" -> {
                val user = currentUser ?: return callback(Result.failure(BridgeError.internalError("用户未登录")))
                val updated = user.copy(
                    username = request.params["username"] as? String ?: user.username,
                    avatar = request.params["avatar"] as? String ?: user.avatar,
                    email = request.params["email"] as? String ?: user.email,
                    phone = request.params["phone"] as? String ?: user.phone
                )
                currentUser = updated
                callback(Result.success(updated.toMap()))
            }
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    fun onDestroy() { scope.cancel() }
}

class AnalyticsExampleModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    override val moduleName = "Analytics"
    override val methods = listOf("Track", "SetUserId", "SetUserProperties", "Flush")
    private val eventBuffer = mutableListOf<AnalyticsEvent>()
    private var userId: String? = null
    private val userProperties = mutableMapOf<String, Any>()
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun handleRequest(method: String, request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        when (method) {
            "Track" -> {
                val name = request.params["event"] as? String ?: return callback(Result.failure(BridgeError.invalidParams("缺少 event 参数")))
                @Suppress("UNCHECKED_CAST")
                val props = request.params["properties"] as? Map<String, Any>
                val ts = (request.params["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()
                eventBuffer.add(AnalyticsEvent(name, props, ts))
                callback(Result.success(null))
            }
            "SetUserId" -> {
                val id = request.params["userId"] as? String ?: return callback(Result.failure(BridgeError.invalidParams("缺少 userId 参数")))
                userId = id
                callback(Result.success(null))
            }
            "SetUserProperties" -> {
                @Suppress("UNCHECKED_CAST")
                val props = request.params["properties"] as? Map<String, Any>
                if (props != null) userProperties.putAll(props)
                callback(Result.success(null))
            }
            "Flush" -> {
                scope.launch { delay(300); eventBuffer.clear(); callback(Result.success(null)) }
            }
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    fun onDestroy() { scope.cancel() }
}

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
