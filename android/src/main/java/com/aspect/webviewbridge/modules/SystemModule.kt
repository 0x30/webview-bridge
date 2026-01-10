/**
 * System 模块 - 系统级功能
 *
 * 提供打开 URL、分享、系统信息等功能
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Base64
import android.view.WindowManager
import androidx.core.content.FileProvider
import com.aspect.webviewbridge.protocol.*
import java.io.File
import java.io.FileOutputStream
import java.util.*

/**
 * System 模块
 */
class SystemModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "System"
    
    override val methods = listOf(
        "OpenURL",
        "Share",
        "GetInfo",
        "GetLanguage",
        "GetTimezone",
        "GetSafeArea",
        "CanOpenURL",
        "RateApp",
        "OpenAppStore",
        "GetColorScheme",
        "SetBrightness",
        "GetBrightness",
        "KeepScreenOn"
    )
    
    private var isScreenKeepOn = false
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "OpenURL" -> openURL(request, callback)
            "Share" -> share(request, callback)
            "GetInfo" -> getInfo(callback)
            "GetLanguage" -> getLanguage(callback)
            "GetTimezone" -> getTimezone(callback)
            "GetSafeArea" -> getSafeArea(callback)
            "CanOpenURL" -> canOpenURL(request, callback)
            "RateApp" -> rateApp(callback)
            "OpenAppStore" -> openAppStore(request, callback)
            "GetColorScheme" -> getColorScheme(callback)
            "SetBrightness" -> setBrightness(request, callback)
            "GetBrightness" -> getBrightness(callback)
            "KeepScreenOn" -> keepScreenOn(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - OpenURL
    
    private fun openURL(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val urlString = request.getString("url")
        if (urlString == null) {
            callback(Result.failure(BridgeError.invalidParams("url")))
            return
        }
        
        try {
            val uri = Uri.parse(urlString)
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            
            callback(Result.success(mapOf(
                "url" to urlString,
                "opened" to true
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError("无法打开 URL: ${e.message}")))
        }
    }
    
    // MARK: - Share
    
    private fun share(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val text = request.getString("text")
        val url = request.getString("url")
        val title = request.getString("title") ?: "分享"
        val imageBase64 = request.getString("image")
        
        if (text == null && url == null && imageBase64 == null) {
            callback(Result.failure(BridgeError.invalidParams("至少需要一个分享内容")))
            return
        }
        
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            // 处理文本
            val shareText = buildString {
                text?.let { append(it) }
                url?.let {
                    if (isNotEmpty()) append("\n")
                    append(it)
                }
            }
            
            if (shareText.isNotEmpty()) {
                intent.type = "text/plain"
                intent.putExtra(Intent.EXTRA_TEXT, shareText)
            }
            
            // 处理图片
            if (imageBase64 != null) {
                val imageUri = saveBase64Image(imageBase64)
                if (imageUri != null) {
                    intent.type = "image/*"
                    intent.putExtra(Intent.EXTRA_STREAM, imageUri)
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }
            
            val chooser = Intent.createChooser(intent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
            
            callback(Result.success(mapOf(
                "shared" to true,
                "activityType" to null
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - GetInfo
    
    private fun getInfo(callback: (Result<Any?>) -> Unit) {
        val locale = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.resources.configuration.locales[0]
        } else {
            @Suppress("DEPRECATION")
            context.resources.configuration.locale
        }
        
        callback(Result.success(mapOf(
            "platform" to "android",
            "osVersion" to Build.VERSION.RELEASE,
            "osName" to "Android",
            "sdkVersion" to Build.VERSION.SDK_INT,
            "language" to locale.toLanguageTag(),
            "region" to locale.country,
            "timezone" to TimeZone.getDefault().id,
            "timezoneOffset" to (TimeZone.getDefault().rawOffset / 60000),
            "is24HourFormat" to android.text.format.DateFormat.is24HourFormat(context),
            "isRTL" to (context.resources.configuration.layoutDirection == Configuration.SCREENLAYOUT_LAYOUTDIR_RTL)
        )))
    }
    
    // MARK: - GetLanguage
    
    private fun getLanguage(callback: (Result<Any?>) -> Unit) {
        val locale = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.resources.configuration.locales[0]
        } else {
            @Suppress("DEPRECATION")
            context.resources.configuration.locale
        }
        
        callback(Result.success(mapOf(
            "language" to locale.toLanguageTag(),
            "languageCode" to locale.language,
            "regionCode" to locale.country,
            "scriptCode" to locale.script.ifEmpty { null },
            "preferredLanguages" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val locales = context.resources.configuration.locales
                (0 until locales.size()).map { locales[it].toLanguageTag() }
            } else {
                listOf(locale.toLanguageTag())
            }
        )))
    }
    
    // MARK: - GetTimezone
    
    private fun getTimezone(callback: (Result<Any?>) -> Unit) {
        val timezone = TimeZone.getDefault()
        
        callback(Result.success(mapOf(
            "identifier" to timezone.id,
            "abbreviation" to timezone.getDisplayName(false, TimeZone.SHORT),
            "offsetSeconds" to (timezone.rawOffset / 1000),
            "offsetMinutes" to (timezone.rawOffset / 60000),
            "isDaylightSaving" to timezone.useDaylightTime()
        )))
    }
    
    // MARK: - GetSafeArea
    
    private fun getSafeArea(callback: (Result<Any?>) -> Unit) {
        val activity = context as? Activity
        
        var top = 0
        var bottom = 0
        var left = 0
        var right = 0
        
        if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val cutout = activity.window.decorView.rootWindowInsets?.displayCutout
            cutout?.let {
                top = it.safeInsetTop
                bottom = it.safeInsetBottom
                left = it.safeInsetLeft
                right = it.safeInsetRight
            }
        }
        
        // 状态栏高度
        if (top == 0) {
            val resourceId = context.resources.getIdentifier(
                "status_bar_height",
                "dimen",
                "android"
            )
            if (resourceId > 0) {
                top = context.resources.getDimensionPixelSize(resourceId)
            }
        }
        
        // 导航栏高度
        if (bottom == 0) {
            val resourceId = context.resources.getIdentifier(
                "navigation_bar_height",
                "dimen",
                "android"
            )
            if (resourceId > 0) {
                bottom = context.resources.getDimensionPixelSize(resourceId)
            }
        }
        
        callback(Result.success(mapOf(
            "top" to top,
            "bottom" to bottom,
            "left" to left,
            "right" to right
        )))
    }
    
    // MARK: - CanOpenURL
    
    private fun canOpenURL(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val urlString = request.getString("url")
        if (urlString == null) {
            callback(Result.failure(BridgeError.invalidParams("url")))
            return
        }
        
        try {
            val uri = Uri.parse(urlString)
            val intent = Intent(Intent.ACTION_VIEW, uri)
            val canOpen = intent.resolveActivity(context.packageManager) != null
            
            callback(Result.success(mapOf(
                "url" to urlString,
                "canOpen" to canOpen
            )))
        } catch (e: Exception) {
            callback(Result.success(mapOf(
                "url" to urlString,
                "canOpen" to false
            )))
        }
    }
    
    // MARK: - RateApp
    
    private fun rateApp(callback: (Result<Any?>) -> Unit) {
        try {
            // 尝试打开 Google Play 应用
            val intent = Intent(
                Intent.ACTION_VIEW,
                Uri.parse("market://details?id=${context.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            callback(Result.success(null))
        } catch (e: Exception) {
            // 回退到浏览器
            try {
                val intent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                callback(Result.success(null))
            } catch (e2: Exception) {
                callback(Result.failure(BridgeError.internalError("无法打开应用商店")))
            }
        }
    }
    
    // MARK: - OpenAppStore
    
    private fun openAppStore(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val appId = request.getString("appId") ?: context.packageName
        
        try {
            val intent = Intent(
                Intent.ACTION_VIEW,
                Uri.parse("market://details?id=$appId")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            callback(Result.success(null))
        } catch (e: Exception) {
            try {
                val intent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=$appId")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                callback(Result.success(null))
            } catch (e2: Exception) {
                callback(Result.failure(BridgeError.internalError("无法打开应用商店")))
            }
        }
    }
    
    // MARK: - GetColorScheme
    
    private fun getColorScheme(callback: (Result<Any?>) -> Unit) {
        val nightMode = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        val colorScheme = when (nightMode) {
            Configuration.UI_MODE_NIGHT_YES -> "dark"
            Configuration.UI_MODE_NIGHT_NO -> "light"
            else -> "light"
        }
        
        callback(Result.success(mapOf(
            "colorScheme" to colorScheme,
            "prefersColorScheme" to colorScheme
        )))
    }
    
    // MARK: - SetBrightness
    
    private fun setBrightness(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val brightness = request.getDouble("brightness")
        if (brightness == null) {
            callback(Result.failure(BridgeError.invalidParams("brightness")))
            return
        }
        
        val activity = context as? Activity
        if (activity == null) {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文")))
            return
        }
        
        try {
            val clampedBrightness = brightness.coerceIn(0.0, 1.0).toFloat()
            
            val layoutParams = activity.window.attributes
            layoutParams.screenBrightness = clampedBrightness
            activity.window.attributes = layoutParams
            
            callback(Result.success(mapOf(
                "brightness" to clampedBrightness
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - GetBrightness
    
    private fun getBrightness(callback: (Result<Any?>) -> Unit) {
        try {
            val brightness = Settings.System.getInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS
            ) / 255f
            
            callback(Result.success(mapOf(
                "brightness" to brightness
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - KeepScreenOn
    
    private fun keepScreenOn(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val keepOn = request.getBool("keepOn")
        if (keepOn == null) {
            callback(Result.failure(BridgeError.invalidParams("keepOn")))
            return
        }
        
        val activity = context as? Activity
        if (activity == null) {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文")))
            return
        }
        
        try {
            if (keepOn) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            
            isScreenKeepOn = keepOn
            
            callback(Result.success(mapOf(
                "keepOn" to keepOn
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - 辅助方法
    
    private fun saveBase64Image(base64String: String): Uri? {
        return try {
            val base64Data = if (base64String.contains(",")) {
                base64String.substringAfter(",")
            } else {
                base64String
            }
            
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            
            val cacheDir = File(context.cacheDir, "share_images")
            cacheDir.mkdirs()
            
            val file = File(cacheDir, "share_${System.currentTimeMillis()}.png")
            FileOutputStream(file).use { out ->
                bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out)
            }
            
            FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )
        } catch (e: Exception) {
            null
        }
    }
}
