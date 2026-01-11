/**
 * Keyboard 模块 - 键盘控制
 *
 * 提供键盘显示/隐藏控制和状态监听
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowInsets
import android.view.inputmethod.InputMethodManager
import com.aspect.webviewbridge.protocol.*

/**
 * 键盘模块
 */
class KeyboardModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext,
    private val activityProvider: () -> Activity?
) : BridgeModule {

    override val moduleName = "Keyboard"

    override val methods = listOf(
        "Show",
        "Hide",
        "GetInfo",
        "SetAccessoryBarVisible",
        "SetScroll"
    )

    private val mainHandler = Handler(Looper.getMainLooper())
    private var isKeyboardVisible = false
    private var keyboardHeight = 0
    private var layoutListener: ViewTreeObserver.OnGlobalLayoutListener? = null
    private var isMonitoring = false

    init {
        startKeyboardMonitoring()
    }

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: BridgeCallback
    ) {
        when (method) {
            "Show" -> showKeyboard(callback)
            "Hide" -> hideKeyboard(callback)
            "GetInfo" -> getInfo(callback)
            "SetAccessoryBarVisible" -> setAccessoryBarVisible(request, callback)
            "SetScroll" -> setScroll(request, callback)
            else -> callback.error(BridgeError.methodNotFound("$moduleName.$method"))
        }
    }

    /**
     * 显示键盘
     */
    private fun showKeyboard(callback: BridgeCallback) {
        mainHandler.post {
            val activity = activityProvider()
            if (activity == null) {
                callback.error(BridgeError.unknown("无法获取 Activity"))
                return@post
            }

            val view = activity.currentFocus ?: activity.window.decorView.rootView
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showSoftInput(view, InputMethodManager.SHOW_IMPLICIT)
            callback.success(null)
        }
    }

    /**
     * 隐藏键盘
     */
    private fun hideKeyboard(callback: BridgeCallback) {
        mainHandler.post {
            val activity = activityProvider()
            if (activity == null) {
                callback.error(BridgeError.unknown("无法获取 Activity"))
                return@post
            }

            val view = activity.currentFocus ?: activity.window.decorView.rootView
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.hideSoftInputFromWindow(view.windowToken, 0)
            callback.success(null)
        }
    }

    /**
     * 获取键盘信息
     */
    private fun getInfo(callback: BridgeCallback) {
        callback.success(mapOf(
            "isVisible" to isKeyboardVisible,
            "height" to keyboardHeight
        ))
    }

    /**
     * 设置附件栏可见性
     */
    private fun setAccessoryBarVisible(request: BridgeRequest, callback: BridgeCallback) {
        // Android 不支持原生键盘附件栏
        callback.success(null)
    }

    /**
     * 设置滚动行为
     */
    private fun setScroll(request: BridgeRequest, callback: BridgeCallback) {
        // 控制键盘出现时的滚动行为
        callback.success(null)
    }

    /**
     * 开始监听键盘
     */
    private fun startKeyboardMonitoring() {
        if (isMonitoring) return

        mainHandler.post {
            val activity = activityProvider() ?: return@post
            val rootView = activity.window.decorView.rootView

            layoutListener = ViewTreeObserver.OnGlobalLayoutListener {
                val rect = Rect()
                rootView.getWindowVisibleDisplayFrame(rect)
                val screenHeight = rootView.height
                val keypadHeight = screenHeight - rect.bottom

                val wasVisible = isKeyboardVisible
                val previousHeight = keyboardHeight

                if (keypadHeight > screenHeight * 0.15) {
                    // 键盘显示
                    isKeyboardVisible = true
                    keyboardHeight = keypadHeight

                    if (!wasVisible) {
                        bridgeContext.sendEvent("Keyboard.WillShow", mapOf(
                            "height" to keypadHeight
                        ))
                        bridgeContext.sendEvent("Keyboard.DidShow", mapOf(
                            "height" to keypadHeight
                        ))
                    }
                } else {
                    // 键盘隐藏
                    isKeyboardVisible = false
                    keyboardHeight = 0

                    if (wasVisible) {
                        bridgeContext.sendEvent("Keyboard.WillHide", mapOf(
                            "height" to 0
                        ))
                        bridgeContext.sendEvent("Keyboard.DidHide", mapOf(
                            "height" to 0
                        ))
                    }
                }
            }

            rootView.viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
            isMonitoring = true
        }
    }

    /**
     * 停止监听键盘
     */
    fun stopKeyboardMonitoring() {
        if (!isMonitoring) return

        mainHandler.post {
            val activity = activityProvider() ?: return@post
            val rootView = activity.window.decorView.rootView
            
            layoutListener?.let {
                rootView.viewTreeObserver.removeOnGlobalLayoutListener(it)
            }
            layoutListener = null
            isMonitoring = false
        }
    }
}
