/**
 * StatusBar 模块 - 状态栏控制
 *
 * 提供状态栏样式、可见性等控制功能
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.aspect.webviewbridge.protocol.*

/**
 * 状态栏样式
 */
enum class StatusBarStyleType {
    DEFAULT,
    LIGHT,
    DARK
}

/**
 * 状态栏动画类型
 */
enum class StatusBarAnimation {
    NONE,
    FADE,
    SLIDE
}

/**
 * StatusBar 模块
 */
class StatusBarModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "StatusBar"
    
    override val methods = listOf(
        "SetStyle",
        "SetVisible",
        "GetInfo",
        "SetBackgroundColor",
        "SetOverlaysWebView"
    )
    
    // 状态栏配置
    private var currentStyle = StatusBarStyleType.DEFAULT
    private var isVisible = true
    private var backgroundColor: Int = Color.TRANSPARENT
    private var overlaysWebView = true
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "SetStyle" -> setStyle(request, callback)
            "SetVisible" -> setVisible(request, callback)
            "GetInfo" -> getInfo(callback)
            "SetBackgroundColor" -> setBackgroundColor(request, callback)
            "SetOverlaysWebView" -> setOverlaysWebView(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - SetStyle
    
    private fun setStyle(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val styleString = request.getString("style")
        if (styleString == null) {
            callback(Result.failure(BridgeError.invalidParams("style")))
            return
        }
        
        val style = try {
            StatusBarStyleType.valueOf(styleString.uppercase())
        } catch (e: Exception) {
            StatusBarStyleType.DEFAULT
        }
        
        val activity = context as? Activity
        if (activity == null) {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文")))
            return
        }
        
        try {
            currentStyle = style
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val insetsController = activity.window.insetsController
                when (style) {
                    StatusBarStyleType.LIGHT -> {
                        // 浅色状态栏 = 深色图标
                        insetsController?.setSystemBarsAppearance(
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        )
                    }
                    StatusBarStyleType.DARK -> {
                        // 深色状态栏 = 浅色图标
                        insetsController?.setSystemBarsAppearance(
                            0,
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        )
                    }
                    StatusBarStyleType.DEFAULT -> {
                        // 默认
                        insetsController?.setSystemBarsAppearance(
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        )
                    }
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val decorView = activity.window.decorView
                @Suppress("DEPRECATION")
                var flags = decorView.systemUiVisibility
                
                flags = when (style) {
                    StatusBarStyleType.LIGHT -> {
                        flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    }
                    StatusBarStyleType.DARK -> {
                        flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
                    }
                    StatusBarStyleType.DEFAULT -> {
                        flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    }
                }
                
                @Suppress("DEPRECATION")
                decorView.systemUiVisibility = flags
            }
            
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - SetVisible
    
    private fun setVisible(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val visible = request.getBool("visible")
        if (visible == null) {
            callback(Result.failure(BridgeError.invalidParams("visible")))
            return
        }
        
        val activity = context as? Activity
        if (activity == null) {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文")))
            return
        }
        
        try {
            isVisible = visible
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val insetsController = activity.window.insetsController
                if (visible) {
                    insetsController?.show(android.view.WindowInsets.Type.statusBars())
                } else {
                    insetsController?.hide(android.view.WindowInsets.Type.statusBars())
                }
            } else {
                @Suppress("DEPRECATION")
                if (visible) {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                } else {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                }
            }
            
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - GetInfo
    
    private fun getInfo(callback: (Result<Any?>) -> Unit) {
        val activity = context as? Activity
        
        var height = 0
        if (activity != null) {
            val resourceId = context.resources.getIdentifier(
                "status_bar_height",
                "dimen",
                "android"
            )
            if (resourceId > 0) {
                height = context.resources.getDimensionPixelSize(resourceId)
            }
        }
        
        val styleString = when (currentStyle) {
            StatusBarStyleType.LIGHT -> "light"
            StatusBarStyleType.DARK -> "dark"
            StatusBarStyleType.DEFAULT -> "default"
        }
        
        callback(Result.success(mapOf(
            "style" to styleString,
            "visible" to isVisible,
            "height" to height,
            "overlaysWebView" to overlaysWebView,
            "backgroundColor" to colorToHex(backgroundColor)
        )))
    }
    
    // MARK: - SetBackgroundColor
    
    private fun setBackgroundColor(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val colorString = request.getString("color")
        if (colorString == null) {
            callback(Result.failure(BridgeError.invalidParams("color")))
            return
        }
        
        val activity = context as? Activity
        if (activity == null) {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文")))
            return
        }
        
        try {
            val color = parseColor(colorString)
            if (color == null) {
                callback(Result.failure(BridgeError.invalidParams("无效的颜色值")))
                return
            }
            
            backgroundColor = color
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activity.window.statusBarColor = color
            }
            
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - SetOverlaysWebView
    
    private fun setOverlaysWebView(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val overlay = request.getBool("overlay")
        if (overlay == null) {
            callback(Result.failure(BridgeError.invalidParams("overlay")))
            return
        }
        
        val activity = context as? Activity
        if (activity == null) {
            callback(Result.failure(BridgeError.notSupported("需要 Activity 上下文")))
            return
        }
        
        try {
            overlaysWebView = overlay
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                if (overlay) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
                    WindowCompat.setDecorFitsSystemWindows(activity.window, false)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
                    WindowCompat.setDecorFitsSystemWindows(activity.window, true)
                }
            }
            
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - 辅助方法
    
    private fun parseColor(colorString: String): Int? {
        return try {
            Color.parseColor(colorString)
        } catch (e: Exception) {
            null
        }
    }
    
    private fun colorToHex(color: Int): String {
        val alpha = Color.alpha(color)
        val red = Color.red(color)
        val green = Color.green(color)
        val blue = Color.blue(color)
        
        return if (alpha == 255) {
            String.format("#%02X%02X%02X", red, green, blue)
        } else {
            String.format("#%02X%02X%02X%02X", alpha, red, green, blue)
        }
    }
}
