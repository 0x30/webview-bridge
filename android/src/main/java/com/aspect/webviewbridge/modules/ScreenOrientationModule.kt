/**
 * ScreenOrientation 模块 - 屏幕方向控制
 *
 * 提供屏幕方向锁定和监听功能
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Handler
import android.os.Looper
import android.view.OrientationEventListener
import com.aspect.webviewbridge.protocol.*

/**
 * 屏幕方向模块
 */
class ScreenOrientationModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext,
    private val activityProvider: () -> Activity?
) : BridgeModule {

    override val moduleName = "ScreenOrientation"

    override val methods = listOf(
        "Get",
        "Lock",
        "Unlock"
    )

    private val mainHandler = Handler(Looper.getMainLooper())
    private var isLocked = false
    private var orientationListener: OrientationEventListener? = null
    private var lastOrientation: String = "portrait"

    init {
        startOrientationMonitoring()
    }

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val cb = callback.toBridgeCallback()
        when (method) {
            "Get" -> getOrientation(cb)
            "Lock" -> lockOrientation(request, cb)
            "Unlock" -> unlockOrientation(cb)
            else -> cb.error(BridgeError.methodNotFound("$moduleName.$method"))
        }
    }

    /**
     * 获取当前屏幕方向
     */
    private fun getOrientation(callback: BridgeCallback) {
        val activity = activityProvider()
        if (activity == null) {
            callback.error(BridgeError.unknown("无法获取 Activity"))
            return
        }

        val orientation = when (activity.resources.configuration.orientation) {
            Configuration.ORIENTATION_LANDSCAPE -> "landscape"
            Configuration.ORIENTATION_PORTRAIT -> "portrait"
            else -> "portrait"
        }

        callback.success(mapOf(
            "type" to orientation,
            "isLocked" to isLocked
        ))
    }

    /**
     * 锁定屏幕方向
     */
    private fun lockOrientation(request: BridgeRequest, callback: BridgeCallback) {
        val orientationType = request.getString("orientation")
        if (orientationType == null) {
            callback.error(BridgeError.invalidParams("缺少 orientation 参数"))
            return
        }

        mainHandler.post {
            val activity = activityProvider()
            if (activity == null) {
                callback.error(BridgeError.unknown("无法获取 Activity"))
                return@post
            }

            val requestedOrientation = when (orientationType) {
                "portrait" -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                "portrait-primary" -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                "portrait-secondary" -> ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT
                "landscape" -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                "landscape-primary" -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                "landscape-secondary" -> ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE
                "any" -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                else -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }

            activity.requestedOrientation = requestedOrientation
            isLocked = true

            callback.success(mapOf(
                "type" to orientationType,
                "isLocked" to true
            ))
        }
    }

    /**
     * 解锁屏幕方向
     */
    private fun unlockOrientation(callback: BridgeCallback) {
        mainHandler.post {
            val activity = activityProvider()
            if (activity == null) {
                callback.error(BridgeError.unknown("无法获取 Activity"))
                return@post
            }

            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            isLocked = false

            callback.success(mapOf(
                "isLocked" to false
            ))
        }
    }

    /**
     * 开始监听屏幕方向变化
     */
    private fun startOrientationMonitoring() {
        orientationListener = object : OrientationEventListener(context) {
            override fun onOrientationChanged(orientation: Int) {
                val activity = activityProvider() ?: return
                
                val currentOrientation = when (activity.resources.configuration.orientation) {
                    Configuration.ORIENTATION_LANDSCAPE -> "landscape"
                    Configuration.ORIENTATION_PORTRAIT -> "portrait"
                    else -> "portrait"
                }

                if (currentOrientation != lastOrientation) {
                    lastOrientation = currentOrientation
                    bridgeContext.sendEvent("ScreenOrientation.Changed", mapOf(
                        "type" to currentOrientation
                    ))
                }
            }
        }

        if (orientationListener?.canDetectOrientation() == true) {
            orientationListener?.enable()
        }
    }

    /**
     * 停止监听
     */
    fun stopOrientationMonitoring() {
        orientationListener?.disable()
        orientationListener = null
    }
}
