/**
 * Device 模块 - 设备信息
 *
 * 提供设备硬件信息、电池状态、网络状态等功能
 */

package com.aspect.webviewbridge.modules

import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.Settings
import android.telephony.TelephonyManager
import android.util.DisplayMetrics
import android.view.WindowManager
import com.aspect.webviewbridge.protocol.*
import java.io.File

/**
 * Device 模块
 */
class DeviceModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule, BridgeModuleLifecycle {
    
    override val moduleName = "Device"
    
    override val methods = listOf(
        "GetInfo",
        "GetBatteryInfo",
        "GetNetworkInfo",
        "GetStorageInfo",
        "GetMemoryInfo",
        "GetCapabilities"
    )
    
    // 电池状态监听
    private var batteryReceiver: BroadcastReceiver? = null
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "GetInfo" -> getInfo(callback)
            "GetBatteryInfo" -> getBatteryInfo(callback)
            "GetNetworkInfo" -> getNetworkInfo(callback)
            "GetStorageInfo" -> getStorageInfo(callback)
            "GetMemoryInfo" -> getMemoryInfo(callback)
            "GetCapabilities" -> getCapabilities(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - GetInfo
    
    private fun getInfo(callback: (Result<Any?>) -> Unit) {
        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val displayMetrics = DisplayMetrics()
        
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(displayMetrics)
        
        val info = mapOf(
            "platform" to "android",
            "osVersion" to Build.VERSION.RELEASE,
            "sdkVersion" to Build.VERSION.SDK_INT,
            "manufacturer" to Build.MANUFACTURER,
            "brand" to Build.BRAND,
            "model" to Build.MODEL,
            "device" to Build.DEVICE,
            "product" to Build.PRODUCT,
            "hardware" to Build.HARDWARE,
            "isEmulator" to isEmulator(),
            "isRooted" to isRooted(),
            "androidId" to getAndroidId(),
            "screen" to mapOf(
                "width" to displayMetrics.widthPixels,
                "height" to displayMetrics.heightPixels,
                "density" to displayMetrics.density,
                "densityDpi" to displayMetrics.densityDpi,
                "scaledDensity" to displayMetrics.scaledDensity
            )
        )
        
        callback(Result.success(info))
    }
    
    // MARK: - GetBatteryInfo
    
    private fun getBatteryInfo(callback: (Result<Any?>) -> Unit) {
        val batteryStatus = context.registerReceiver(
            null,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        )
        
        if (batteryStatus == null) {
            callback(Result.failure(BridgeError.internalError("无法获取电池信息")))
            return
        }
        
        val level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        val status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        val plugged = batteryStatus.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1)
        val health = batteryStatus.getIntExtra(BatteryManager.EXTRA_HEALTH, -1)
        val temperature = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1)
        val voltage = batteryStatus.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1)
        
        val batteryLevel = if (level >= 0 && scale > 0) {
            level.toFloat() / scale.toFloat()
        } else {
            -1f
        }
        
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL
        
        val chargingType = when (plugged) {
            BatteryManager.BATTERY_PLUGGED_AC -> "ac"
            BatteryManager.BATTERY_PLUGGED_USB -> "usb"
            BatteryManager.BATTERY_PLUGGED_WIRELESS -> "wireless"
            else -> "none"
        }
        
        val healthStatus = when (health) {
            BatteryManager.BATTERY_HEALTH_GOOD -> "good"
            BatteryManager.BATTERY_HEALTH_OVERHEAT -> "overheat"
            BatteryManager.BATTERY_HEALTH_DEAD -> "dead"
            BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "overVoltage"
            BatteryManager.BATTERY_HEALTH_COLD -> "cold"
            else -> "unknown"
        }
        
        callback(Result.success(mapOf(
            "level" to batteryLevel,
            "isCharging" to isCharging,
            "chargingType" to chargingType,
            "health" to healthStatus,
            "temperature" to (temperature / 10f), // 温度单位转换
            "voltage" to (voltage / 1000f) // 电压单位转换
        )))
    }
    
    // MARK: - GetNetworkInfo
    
    private fun getNetworkInfo(callback: (Result<Any?>) -> Unit) {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        var isConnected = false
        var type = "none"
        var isWifi = false
        var isCellular = false
        var isMetered = false
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            
            if (capabilities != null) {
                isConnected = true
                isMetered = !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
                
                when {
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                        type = "wifi"
                        isWifi = true
                    }
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                        type = "cellular"
                        isCellular = true
                    }
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> {
                        type = "ethernet"
                    }
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> {
                        type = "vpn"
                    }
                }
            }
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            
            if (networkInfo != null && networkInfo.isConnected) {
                isConnected = true
                @Suppress("DEPRECATION")
                when (networkInfo.type) {
                    ConnectivityManager.TYPE_WIFI -> {
                        type = "wifi"
                        isWifi = true
                    }
                    ConnectivityManager.TYPE_MOBILE -> {
                        type = "cellular"
                        isCellular = true
                    }
                    ConnectivityManager.TYPE_ETHERNET -> {
                        type = "ethernet"
                    }
                }
            }
        }
        
        // 获取运营商信息
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val carrier = telephonyManager?.networkOperatorName ?: ""
        
        callback(Result.success(mapOf(
            "isConnected" to isConnected,
            "type" to type,
            "isWifi" to isWifi,
            "isCellular" to isCellular,
            "isMetered" to isMetered,
            "carrier" to carrier
        )))
    }
    
    // MARK: - GetStorageInfo
    
    private fun getStorageInfo(callback: (Result<Any?>) -> Unit) {
        val internalPath = Environment.getDataDirectory()
        val internalStat = StatFs(internalPath.path)
        
        val internalTotal = internalStat.blockCountLong * internalStat.blockSizeLong
        val internalFree = internalStat.availableBlocksLong * internalStat.blockSizeLong
        val internalUsed = internalTotal - internalFree
        
        val result = mutableMapOf<String, Any>(
            "internal" to mapOf(
                "total" to internalTotal,
                "free" to internalFree,
                "used" to internalUsed
            )
        )
        
        // 检查外部存储
        if (Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED) {
            val externalPath = Environment.getExternalStorageDirectory()
            val externalStat = StatFs(externalPath.path)
            
            val externalTotal = externalStat.blockCountLong * externalStat.blockSizeLong
            val externalFree = externalStat.availableBlocksLong * externalStat.blockSizeLong
            val externalUsed = externalTotal - externalFree
            
            result["external"] = mapOf(
                "total" to externalTotal,
                "free" to externalFree,
                "used" to externalUsed
            )
        }
        
        callback(Result.success(result))
    }
    
    // MARK: - GetMemoryInfo
    
    private fun getMemoryInfo(callback: (Result<Any?>) -> Unit) {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        
        val runtime = Runtime.getRuntime()
        
        callback(Result.success(mapOf(
            "total" to memoryInfo.totalMem,
            "available" to memoryInfo.availMem,
            "used" to (memoryInfo.totalMem - memoryInfo.availMem),
            "lowMemory" to memoryInfo.lowMemory,
            "threshold" to memoryInfo.threshold,
            "jvm" to mapOf(
                "max" to runtime.maxMemory(),
                "total" to runtime.totalMemory(),
                "free" to runtime.freeMemory()
            )
        )))
    }
    
    // MARK: - GetCapabilities
    
    private fun getCapabilities(callback: (Result<Any?>) -> Unit) {
        val packageManager = context.packageManager
        
        callback(Result.success(mapOf(
            "hasCamera" to packageManager.hasSystemFeature("android.hardware.camera.any"),
            "hasFrontCamera" to packageManager.hasSystemFeature("android.hardware.camera.front"),
            "hasFlash" to packageManager.hasSystemFeature("android.hardware.camera.flash"),
            "hasMicrophone" to packageManager.hasSystemFeature("android.hardware.microphone"),
            "hasBluetooth" to packageManager.hasSystemFeature("android.hardware.bluetooth"),
            "hasBluetoothLE" to packageManager.hasSystemFeature("android.hardware.bluetooth_le"),
            "hasNfc" to packageManager.hasSystemFeature("android.hardware.nfc"),
            "hasGps" to packageManager.hasSystemFeature("android.hardware.location.gps"),
            "hasTelephony" to packageManager.hasSystemFeature("android.hardware.telephony"),
            "hasWifi" to packageManager.hasSystemFeature("android.hardware.wifi"),
            "hasFingerprint" to packageManager.hasSystemFeature("android.hardware.fingerprint"),
            "hasFaceUnlock" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                    packageManager.hasSystemFeature("android.hardware.biometrics.face")),
            "hasAccelerometer" to packageManager.hasSystemFeature("android.hardware.sensor.accelerometer"),
            "hasGyroscope" to packageManager.hasSystemFeature("android.hardware.sensor.gyroscope"),
            "hasCompass" to packageManager.hasSystemFeature("android.hardware.sensor.compass"),
            "hasBarometer" to packageManager.hasSystemFeature("android.hardware.sensor.barometer"),
            "hasTouchScreen" to packageManager.hasSystemFeature("android.hardware.touchscreen"),
            "supportsMultiTouch" to packageManager.hasSystemFeature("android.hardware.touchscreen.multitouch")
        )))
    }
    
    // MARK: - 辅助方法
    
    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || "google_sdk" == Build.PRODUCT)
    }
    
    private fun isRooted(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su"
        )
        return paths.any { File(it).exists() }
    }
    
    private fun getAndroidId(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: ""
    }
    
    // MARK: - 生命周期
    
    override fun onDestroy() {
        batteryReceiver?.let {
            try {
                context.unregisterReceiver(it)
            } catch (e: Exception) {
                // 忽略
            }
        }
    }
}
