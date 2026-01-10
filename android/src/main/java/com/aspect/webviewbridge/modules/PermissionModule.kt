/**
 * Permission 模块 - 系统权限统一管理
 *
 * 覆盖 Android 权限的查询和请求
 */

package com.aspect.webviewbridge.modules

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.aspect.webviewbridge.protocol.*

/**
 * Android 权限类型枚举
 */
enum class AndroidPermissionType(val permission: String, val minSdk: Int = 1) {
    // 相机和媒体
    CAMERA(Manifest.permission.CAMERA),
    RECORD_AUDIO(Manifest.permission.RECORD_AUDIO),
    READ_EXTERNAL_STORAGE(Manifest.permission.READ_EXTERNAL_STORAGE),
    WRITE_EXTERNAL_STORAGE(Manifest.permission.WRITE_EXTERNAL_STORAGE),
    READ_MEDIA_IMAGES("android.permission.READ_MEDIA_IMAGES", 33),
    READ_MEDIA_VIDEO("android.permission.READ_MEDIA_VIDEO", 33),
    READ_MEDIA_AUDIO("android.permission.READ_MEDIA_AUDIO", 33),
    
    // 位置
    ACCESS_FINE_LOCATION(Manifest.permission.ACCESS_FINE_LOCATION),
    ACCESS_COARSE_LOCATION(Manifest.permission.ACCESS_COARSE_LOCATION),
    ACCESS_BACKGROUND_LOCATION("android.permission.ACCESS_BACKGROUND_LOCATION", 29),
    
    // 联系人
    READ_CONTACTS(Manifest.permission.READ_CONTACTS),
    WRITE_CONTACTS(Manifest.permission.WRITE_CONTACTS),
    GET_ACCOUNTS(Manifest.permission.GET_ACCOUNTS),
    
    // 日历
    READ_CALENDAR(Manifest.permission.READ_CALENDAR),
    WRITE_CALENDAR(Manifest.permission.WRITE_CALENDAR),
    
    // 电话
    READ_PHONE_STATE(Manifest.permission.READ_PHONE_STATE),
    CALL_PHONE(Manifest.permission.CALL_PHONE),
    READ_CALL_LOG(Manifest.permission.READ_CALL_LOG),
    WRITE_CALL_LOG(Manifest.permission.WRITE_CALL_LOG),
    ADD_VOICEMAIL(Manifest.permission.ADD_VOICEMAIL),
    USE_SIP(Manifest.permission.USE_SIP),
    ANSWER_PHONE_CALLS("android.permission.ANSWER_PHONE_CALLS", 26),
    READ_PHONE_NUMBERS("android.permission.READ_PHONE_NUMBERS", 26),
    
    // 短信
    SEND_SMS(Manifest.permission.SEND_SMS),
    RECEIVE_SMS(Manifest.permission.RECEIVE_SMS),
    READ_SMS(Manifest.permission.READ_SMS),
    RECEIVE_MMS(Manifest.permission.RECEIVE_MMS),
    RECEIVE_WAP_PUSH(Manifest.permission.RECEIVE_WAP_PUSH),
    
    // 传感器
    BODY_SENSORS(Manifest.permission.BODY_SENSORS),
    ACTIVITY_RECOGNITION("android.permission.ACTIVITY_RECOGNITION", 29),
    
    // 蓝牙
    BLUETOOTH("android.permission.BLUETOOTH"),
    BLUETOOTH_ADMIN("android.permission.BLUETOOTH_ADMIN"),
    BLUETOOTH_CONNECT("android.permission.BLUETOOTH_CONNECT", 31),
    BLUETOOTH_SCAN("android.permission.BLUETOOTH_SCAN", 31),
    BLUETOOTH_ADVERTISE("android.permission.BLUETOOTH_ADVERTISE", 31),
    
    // 通知
    POST_NOTIFICATIONS("android.permission.POST_NOTIFICATIONS", 33),
    
    // 其他
    SYSTEM_ALERT_WINDOW(Manifest.permission.SYSTEM_ALERT_WINDOW),
    SCHEDULE_EXACT_ALARM("android.permission.SCHEDULE_EXACT_ALARM", 31),
    USE_EXACT_ALARM("android.permission.USE_EXACT_ALARM", 33);
    
    companion object {
        fun fromString(value: String): AndroidPermissionType? {
            return values().find { 
                it.name.equals(value, ignoreCase = true) || 
                it.permission.equals(value, ignoreCase = true)
            }
        }
    }
}

/**
 * 权限状态枚举
 */
enum class PermissionStatus {
    GRANTED,
    DENIED,
    NOT_DETERMINED,
    PERMANENTLY_DENIED,
    RESTRICTED
}

/**
 * Permission 模块
 */
class PermissionModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "Permission"
    
    override val methods = listOf(
        "GetStatus",
        "Request",
        "RequestMultiple",
        "GetMultipleStatus",
        "OpenSettings"
    )
    
    // 权限请求回调
    private var permissionCallback: ((Result<Any?>) -> Unit)? = null
    private var pendingPermissions: List<String> = emptyList()
    
    companion object {
        const val PERMISSION_REQUEST_CODE = 10001
    }
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "GetStatus" -> getStatus(request, callback)
            "Request" -> requestPermission(request, callback)
            "RequestMultiple" -> requestMultiple(request, callback)
            "GetMultipleStatus" -> getMultipleStatus(request, callback)
            "OpenSettings" -> openSettings(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - GetStatus
    
    private fun getStatus(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val permissionName = request.getString("permission")
        if (permissionName == null) {
            callback(Result.failure(BridgeError.invalidParams("permission")))
            return
        }
        
        val permissionType = AndroidPermissionType.fromString(permissionName)
        if (permissionType == null) {
            callback(Result.failure(BridgeError.invalidParams("不支持的权限类型: $permissionName")))
            return
        }
        
        val status = checkPermissionStatus(permissionType)
        
        callback(Result.success(mapOf(
            "permission" to permissionName,
            "status" to status.name.lowercase(),
            "canRequestAgain" to (status == PermissionStatus.NOT_DETERMINED || status == PermissionStatus.DENIED)
        )))
    }
    
    // MARK: - Request
    
    private fun requestPermission(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val permissionName = request.getString("permission")
        if (permissionName == null) {
            callback(Result.failure(BridgeError.invalidParams("permission")))
            return
        }
        
        val permissionType = AndroidPermissionType.fromString(permissionName)
        if (permissionType == null) {
            callback(Result.failure(BridgeError.invalidParams("不支持的权限类型: $permissionName")))
            return
        }
        
        // 检查 SDK 版本
        if (Build.VERSION.SDK_INT < permissionType.minSdk) {
            callback(Result.success(mapOf(
                "permission" to permissionName,
                "status" to "granted",
                "canRequestAgain" to false
            )))
            return
        }
        
        // 特殊权限处理
        if (permissionType == AndroidPermissionType.SYSTEM_ALERT_WINDOW) {
            handleSystemAlertWindow(permissionName, callback)
            return
        }
        
        // 检查是否已授权
        val currentStatus = checkPermissionStatus(permissionType)
        if (currentStatus == PermissionStatus.GRANTED) {
            callback(Result.success(mapOf(
                "permission" to permissionName,
                "status" to "granted",
                "canRequestAgain" to false
            )))
            return
        }
        
        // 需要请求权限
        if (context is Activity) {
            permissionCallback = callback
            pendingPermissions = listOf(permissionType.permission)
            
            ActivityCompat.requestPermissions(
                context,
                arrayOf(permissionType.permission),
                PERMISSION_REQUEST_CODE
            )
        } else {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文来请求权限")))
        }
    }
    
    // MARK: - RequestMultiple
    
    private fun requestMultiple(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val permissionNames = request.getStringArray("permissions")
        if (permissionNames.isNullOrEmpty()) {
            callback(Result.failure(BridgeError.invalidParams("permissions")))
            return
        }
        
        val permissionsToRequest = mutableListOf<String>()
        val results = mutableListOf<Map<String, Any>>()
        val granted = mutableListOf<String>()
        val denied = mutableListOf<String>()
        
        for (name in permissionNames) {
            val permissionType = AndroidPermissionType.fromString(name)
            if (permissionType == null) {
                results.add(mapOf(
                    "permission" to name,
                    "status" to "denied",
                    "canRequestAgain" to false
                ))
                denied.add(name)
                continue
            }
            
            // SDK 版本检查
            if (Build.VERSION.SDK_INT < permissionType.minSdk) {
                results.add(mapOf(
                    "permission" to name,
                    "status" to "granted",
                    "canRequestAgain" to false
                ))
                granted.add(name)
                continue
            }
            
            val status = checkPermissionStatus(permissionType)
            if (status == PermissionStatus.GRANTED) {
                results.add(mapOf(
                    "permission" to name,
                    "status" to "granted",
                    "canRequestAgain" to false
                ))
                granted.add(name)
            } else {
                permissionsToRequest.add(permissionType.permission)
            }
        }
        
        if (permissionsToRequest.isEmpty()) {
            callback(Result.success(mapOf(
                "results" to results,
                "allGranted" to denied.isEmpty(),
                "granted" to granted,
                "denied" to denied
            )))
            return
        }
        
        // 需要请求权限
        if (context is Activity) {
            permissionCallback = { result ->
                result.fold(
                    onSuccess = { data ->
                        @Suppress("UNCHECKED_CAST")
                        val requestResults = data as? List<Map<String, Any>> ?: emptyList()
                        
                        for (r in requestResults) {
                            val perm = r["permission"] as? String ?: continue
                            results.add(r)
                            if (r["status"] == "granted") {
                                granted.add(perm)
                            } else {
                                denied.add(perm)
                            }
                        }
                        
                        callback(Result.success(mapOf(
                            "results" to results,
                            "allGranted" to denied.isEmpty(),
                            "granted" to granted,
                            "denied" to denied
                        )))
                    },
                    onFailure = { error ->
                        callback(Result.failure(error))
                    }
                )
            }
            pendingPermissions = permissionsToRequest
            
            ActivityCompat.requestPermissions(
                context,
                permissionsToRequest.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        } else {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文来请求权限")))
        }
    }
    
    // MARK: - GetMultipleStatus
    
    private fun getMultipleStatus(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val permissionNames = request.getStringArray("permissions")
        if (permissionNames.isNullOrEmpty()) {
            callback(Result.failure(BridgeError.invalidParams("permissions")))
            return
        }
        
        val results = permissionNames.map { name ->
            val permissionType = AndroidPermissionType.fromString(name)
            if (permissionType == null) {
                mapOf(
                    "permission" to name,
                    "status" to "denied",
                    "canRequestAgain" to false
                )
            } else {
                val status = checkPermissionStatus(permissionType)
                mapOf(
                    "permission" to name,
                    "status" to status.name.lowercase(),
                    "canRequestAgain" to (status == PermissionStatus.NOT_DETERMINED || status == PermissionStatus.DENIED)
                )
            }
        }
        
        callback(Result.success(results))
    }
    
    // MARK: - OpenSettings
    
    private fun openSettings(callback: (Result<Any?>) -> Unit) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - 权限请求结果处理
    
    /**
     * 处理权限请求结果（由 Activity 调用）
     */
    fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        if (requestCode != PERMISSION_REQUEST_CODE) return
        
        val callback = permissionCallback ?: return
        permissionCallback = null
        
        if (pendingPermissions.size == 1) {
            // 单个权限请求
            val permission = pendingPermissions.firstOrNull() ?: return
            val granted = grantResults.isNotEmpty() && 
                    grantResults[0] == PackageManager.PERMISSION_GRANTED
            
            val permissionType = AndroidPermissionType.values().find { it.permission == permission }
            val name = permissionType?.name?.lowercase() ?: permission
            
            callback(Result.success(mapOf(
                "permission" to name,
                "status" to if (granted) "granted" else "denied",
                "canRequestAgain" to !granted
            )))
        } else {
            // 多个权限请求
            val results = permissions.mapIndexed { index, permission ->
                val granted = grantResults.getOrNull(index) == PackageManager.PERMISSION_GRANTED
                val permissionType = AndroidPermissionType.values().find { it.permission == permission }
                val name = permissionType?.name?.lowercase() ?: permission
                
                mapOf(
                    "permission" to name,
                    "status" to if (granted) "granted" else "denied",
                    "canRequestAgain" to !granted
                )
            }
            
            callback(Result.success(results))
        }
        
        pendingPermissions = emptyList()
    }
    
    // MARK: - 辅助方法
    
    private fun checkPermissionStatus(permissionType: AndroidPermissionType): PermissionStatus {
        // SDK 版本检查
        if (Build.VERSION.SDK_INT < permissionType.minSdk) {
            return PermissionStatus.GRANTED
        }
        
        // 特殊权限检查
        if (permissionType == AndroidPermissionType.SYSTEM_ALERT_WINDOW) {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(context)) {
                    PermissionStatus.GRANTED
                } else {
                    PermissionStatus.DENIED
                }
            } else {
                PermissionStatus.GRANTED
            }
        }
        
        val result = ContextCompat.checkSelfPermission(context, permissionType.permission)
        
        return when {
            result == PackageManager.PERMISSION_GRANTED -> PermissionStatus.GRANTED
            context is Activity && 
                    ActivityCompat.shouldShowRequestPermissionRationale(context, permissionType.permission) -> {
                PermissionStatus.DENIED
            }
            else -> PermissionStatus.NOT_DETERMINED
        }
    }
    
    private fun handleSystemAlertWindow(
        permissionName: String,
        callback: (Result<Any?>) -> Unit
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Settings.canDrawOverlays(context)) {
                callback(Result.success(mapOf(
                    "permission" to permissionName,
                    "status" to "granted",
                    "canRequestAgain" to false
                )))
            } else {
                // 打开设置页面
                try {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${context.packageName}")
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    callback(Result.success(mapOf(
                        "permission" to permissionName,
                        "status" to "notDetermined",
                        "canRequestAgain" to true
                    )))
                } catch (e: Exception) {
                    callback(Result.failure(BridgeError.internalError(e.message)))
                }
            }
        } else {
            callback(Result.success(mapOf(
                "permission" to permissionName,
                "status" to "granted",
                "canRequestAgain" to false
            )))
        }
    }
}
