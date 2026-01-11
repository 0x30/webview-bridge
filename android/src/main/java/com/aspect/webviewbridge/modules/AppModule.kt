/**
 * App 模块 - 应用信息与生命周期
 *
 * 提供应用基础信息、启动参数、生命周期管理等功能
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.os.Build
import android.os.Process
import android.util.Base64
import com.aspect.webviewbridge.protocol.*
import java.io.ByteArrayOutputStream

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
        "Minimize",
        "GetInstalledApps",
        "GetAppDetails",
        "CanOpenURL"
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
            "GetInstalledApps" -> getInstalledApps(request, callback)
            "GetAppDetails" -> getAppDetails(request, callback)
            "CanOpenURL" -> canOpenURL(request, callback)
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
        callback(
            Result.success(
                mapOf(
                    "params" to (launchParams ?: emptyMap<String, Any?>())
                )
            )
        )
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
        callback(
            Result.success(
                mapOf(
                    "state" to lifecycleState
                )
            )
        )
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

            callback(
                Result.success(
                    mapOf(
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
                    )
                )
            )
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
    
    // MARK: - GetInstalledApps
    
    private fun getInstalledApps(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        try {
            val includeSystemApps = request.getBool("includeSystemApps") ?: false
            val includeIcons = request.getBool("includeIcons") ?: false
            val limit = request.getInt("limit") ?: 100
            
            val packageManager = context.packageManager
            val packages = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getInstalledPackages(PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                packageManager.getInstalledPackages(0)
            }
            
            val apps = packages
                .filter { pkg ->
                    if (includeSystemApps) {
                        true
                    } else {
                        (pkg.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
                    }
                }
                .take(limit)
                .map { pkg ->
                    val appInfo = mutableMapOf<String, Any?>(
                        "packageName" to pkg.packageName,
                        "name" to packageManager.getApplicationLabel(pkg.applicationInfo).toString(),
                        "version" to pkg.versionName,
                        "versionCode" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            pkg.longVersionCode
                        } else {
                            @Suppress("DEPRECATION")
                            pkg.versionCode.toLong()
                        },
                        "isSystemApp" to ((pkg.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
                    )
                    
                    // 可选包含图标
                    if (includeIcons) {
                        try {
                            val drawable = packageManager.getApplicationIcon(pkg.packageName)
                            val bitmap = if (drawable is BitmapDrawable) {
                                drawable.bitmap
                            } else {
                                val bmp = Bitmap.createBitmap(48, 48, Bitmap.Config.ARGB_8888)
                                val canvas = Canvas(bmp)
                                drawable.setBounds(0, 0, canvas.width, canvas.height)
                                drawable.draw(canvas)
                                bmp
                            }
                            
                            val stream = ByteArrayOutputStream()
                            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
                            appInfo["icon"] = "data:image/png;base64," + Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                        } catch (e: Exception) {
                            // 忽略图标获取失败
                        }
                    }
                    
                    appInfo
                }
            
            callback(Result.success(mapOf(
                "apps" to apps,
                "count" to apps.size
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - GetAppDetails
    
    private fun getAppDetails(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val packageName = request.getString("packageName")
        if (packageName == null) {
            callback(Result.failure(BridgeError.invalidParams("packageName")))
            return
        }
        
        try {
            val packageManager = context.packageManager
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, PackageManager.GET_PERMISSIONS)
            }
            
            val appInfo = packageInfo.applicationInfo
            val appName = packageManager.getApplicationLabel(appInfo).toString()
            
            callback(Result.success(mapOf(
                "packageName" to packageName,
                "name" to appName,
                "version" to packageInfo.versionName,
                "versionCode" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    packageInfo.versionCode.toLong()
                },
                "targetSdk" to appInfo.targetSdkVersion,
                "minSdk" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    appInfo.minSdkVersion
                } else {
                    null
                },
                "isSystemApp" to ((appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0),
                "isEnabled" to appInfo.enabled,
                "firstInstallTime" to packageInfo.firstInstallTime,
                "lastUpdateTime" to packageInfo.lastUpdateTime,
                "permissions" to (packageInfo.requestedPermissions?.toList() ?: emptyList<String>()),
                "sourceDir" to appInfo.sourceDir,
                "dataDir" to appInfo.dataDir
            )))
        } catch (e: PackageManager.NameNotFoundException) {
            callback(Result.failure(BridgeError.invalidParams("应用不存在: $packageName")))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - CanOpenURL
    
    private fun canOpenURL(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val url = request.getString("url")
        if (url == null) {
            callback(Result.failure(BridgeError.invalidParams("url")))
            return
        }
        
        try {
            val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
            val canOpen = intent.resolveActivity(context.packageManager) != null
            
            callback(Result.success(mapOf(
                "url" to url,
                "canOpen" to canOpen
            )))
        } catch (e: Exception) {
            callback(Result.success(mapOf(
                "url" to url,
                "canOpen" to false
            )))
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
