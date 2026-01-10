/**
 * App 模块 - 应用信息与生命周期
 *
 * 提供应用基础信息、启动参数、生命周期管理等功能
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import com.aspect.webviewbridge.protocol.*

/**
 * App 模块
 */
class AppModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule, BridgeModuleLifecycle {
    
    override val moduleName = "App"
    
    override val methods = listOf(
        "GetLaunchParams",
        "Exit",
        "GetLifecycleState",
        "GetAppInfo",
        "Minimize"
    )
    
    // 启动参数
    private var launchParams: Map<String, Any?>? = null
    
    // 生命周期状态
    private var lifecycleState = "active"
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "GetLaunchParams" -> getLaunchParams(callback)
            "Exit" -> exit(callback)
            "GetLifecycleState" -> getLifecycleState(callback)
            "GetAppInfo" -> getAppInfo(callback)
            "Minimize" -> minimize(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    /**
     * 设置启动参数（由宿主应用调用）
     */
    fun setLaunchParams(params: Map<String, Any?>) {
        this.launchParams = params
    }
    
    /**
     * 设置启动参数（从 Intent 解析）
     */
    fun setLaunchParamsFromIntent(intent: Intent?) {
        if (intent == null) return
        
        val params = mutableMapOf<String, Any?>()
        
        // 解析 URL 参数
        intent.data?.let { uri ->
            params["url"] = uri.toString()
            uri.queryParameterNames.forEach { key ->
                params[key] = uri.getQueryParameter(key)
            }
        }
        
        // 解析 extras
        intent.extras?.let { bundle ->
            bundle.keySet().forEach { key ->
                params[key] = bundle.get(key)
            }
        }
        
        this.launchParams = params
    }
    
    // MARK: - GetLaunchParams
    
    private fun getLaunchParams(callback: (Result<Any?>) -> Unit) {
        callback(Result.success(mapOf(
            "params" to (launchParams ?: emptyMap<String, Any?>())
        )))
    }
    
    // MARK: - Exit
    
    private fun exit(callback: (Result<Any?>) -> Unit) {
        callback(Result.success(null))
        
        // 延迟执行退出操作
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (context is Activity) {
                context.finishAffinity()
            } else {
                Process.killProcess(Process.myPid())
            }
        }, 100)
    }
    
    // MARK: - GetLifecycleState
    
    private fun getLifecycleState(callback: (Result<Any?>) -> Unit) {
        callback(Result.success(mapOf(
            "state" to lifecycleState
        )))
    }
    
    // MARK: - GetAppInfo
    
    private fun getAppInfo(callback: (Result<Any?>) -> Unit) {
        try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            
            val applicationInfo = context.applicationInfo
            val appName = context.packageManager.getApplicationLabel(applicationInfo).toString()
            
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
            
            callback(Result.success(mapOf(
                "name" to appName,
                "packageName" to context.packageName,
                "version" to packageInfo.versionName,
                "versionCode" to versionCode,
                "targetSdk" to applicationInfo.targetSdkVersion,
                "minSdk" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    applicationInfo.minSdkVersion
                } else {
                    null
                },
                "firstInstallTime" to packageInfo.firstInstallTime,
                "lastUpdateTime" to packageInfo.lastUpdateTime
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - Minimize
    
    private fun minimize(callback: (Result<Any?>) -> Unit) {
        if (context is Activity) {
            context.moveTaskToBack(true)
            callback(Result.success(null))
        } else {
            callback(Result.failure(BridgeError.notSupported("minimize")))
        }
    }
    
    // MARK: - 生命周期
    
    override fun onResume() {
        lifecycleState = "active"
    }
    
    override fun onPause() {
        lifecycleState = "inactive"
    }
}
