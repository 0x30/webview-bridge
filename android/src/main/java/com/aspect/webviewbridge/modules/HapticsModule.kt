/**
 * Haptics 模块 - 触觉反馈
 *
 * 提供 Android 触觉反馈功能，支持多种反馈类型
 */

package com.aspect.webviewbridge.modules

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View
import com.aspect.webviewbridge.protocol.*

/**
 * 冲击反馈强度
 */
enum class ImpactStyle(val amplitude: Int) {
    LIGHT(50),
    MEDIUM(128),
    HEAVY(200),
    SOFT(30),
    RIGID(255)
}

/**
 * 通知反馈类型
 */
enum class NotificationFeedbackType {
    SUCCESS,
    WARNING,
    ERROR
}

/**
 * Haptics 模块
 */
class HapticsModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {

    override val moduleName = "Haptics"

    override val methods = listOf(
        "Impact",
        "Notification",
        "Selection",
        "Vibrate",
        "IsSupported"
    )

    private val vibrator: Vibrator by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager =
                context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "Impact" -> impact(request, callback)
            "Notification" -> notification(request, callback)
            "Selection" -> selection(callback)
            "Vibrate" -> vibrate(request, callback)
            "IsSupported" -> isSupported(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - Impact

    private fun impact(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val styleString = request.getString("style") ?: "medium"
        val style = try {
            ImpactStyle.valueOf(styleString.uppercase())
        } catch (e: Exception) {
            ImpactStyle.MEDIUM
        }

        val intensity = request.getDouble("intensity") ?: 1.0
        val amplitude = (style.amplitude * intensity).toInt().coerceIn(1, 255)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = VibrationEffect.createOneShot(
                getDurationForStyle(style),
                amplitude
            )
            vibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(getDurationForStyle(style))
        }

        callback(Result.success(null))
    }

    // MARK: - Notification

    private fun notification(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val typeString = request.getString("type") ?: "success"
        val type = try {
            NotificationFeedbackType.valueOf(typeString.uppercase())
        } catch (e: Exception) {
            NotificationFeedbackType.SUCCESS
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val pattern = when (type) {
                NotificationFeedbackType.SUCCESS -> longArrayOf(0, 50, 50, 50)
                NotificationFeedbackType.WARNING -> longArrayOf(0, 100, 100, 100)
                NotificationFeedbackType.ERROR -> longArrayOf(0, 100, 50, 100, 50, 100)
            }

            val amplitudes = when (type) {
                NotificationFeedbackType.SUCCESS -> intArrayOf(0, 128, 0, 255)
                NotificationFeedbackType.WARNING -> intArrayOf(0, 200, 0, 200)
                NotificationFeedbackType.ERROR -> intArrayOf(0, 255, 0, 255, 0, 255)
            }

            val effect = VibrationEffect.createWaveform(pattern, amplitudes, -1)
            vibrator.vibrate(effect)
        } else {
            val pattern = when (type) {
                NotificationFeedbackType.SUCCESS -> longArrayOf(0, 50, 50, 50)
                NotificationFeedbackType.WARNING -> longArrayOf(0, 100, 100, 100)
                NotificationFeedbackType.ERROR -> longArrayOf(0, 100, 50, 100, 50, 100)
            }
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }

        callback(Result.success(null))
    }

    // MARK: - Selection

    private fun selection(callback: (Result<Any?>) -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val effect = VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
            vibrator.vibrate(effect)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = VibrationEffect.createOneShot(10, 50)
            vibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(10)
        }

        callback(Result.success(null))
    }

    // MARK: - Vibrate

    private fun vibrate(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val pattern = request.getArray("pattern")?.map {
            it.asLong
        }?.toLongArray() ?: longArrayOf(100)

        // 确保模式以 0 开始（延迟为 0）
        val fullPattern = if (pattern.isNotEmpty() && pattern[0] != 0L) {
            longArrayOf(0) + pattern
        } else {
            pattern
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // 创建振幅数组
            val amplitudes = IntArray(fullPattern.size) { index ->
                if (index % 2 == 0) 0 else 255
            }

            val effect = VibrationEffect.createWaveform(fullPattern, amplitudes, -1)
            vibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(fullPattern, -1)
        }

        callback(Result.success(null))
    }

    // MARK: - IsSupported

    private fun isSupported(callback: (Result<Any?>) -> Unit) {
        val hasVibrator = vibrator.hasVibrator()
        val hasAmplitudeControl = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.hasAmplitudeControl()
        } else {
            false
        }

        callback(
            Result.success(
                mapOf(
                    "supported" to hasVibrator,
                    "impactSupported" to hasVibrator,
                    "notificationSupported" to hasVibrator,
                    "selectionSupported" to hasVibrator,
                    "hasAmplitudeControl" to hasAmplitudeControl
                )
            )
        )
    }

    // MARK: - 辅助方法

    private fun getDurationForStyle(style: ImpactStyle): Long {
        return when (style) {
            ImpactStyle.LIGHT -> 20L
            ImpactStyle.MEDIUM -> 40L
            ImpactStyle.HEAVY -> 60L
            ImpactStyle.SOFT -> 30L
            ImpactStyle.RIGID -> 20L
        }
    }
}
