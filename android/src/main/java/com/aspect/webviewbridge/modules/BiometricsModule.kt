/**
 * Biometrics 模块 - 生物识别认证
 *
 * 提供指纹/面部识别认证功能
 */

package com.aspect.webviewbridge.modules

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.aspect.webviewbridge.protocol.BridgeError
import com.aspect.webviewbridge.protocol.BridgeModule
import com.aspect.webviewbridge.protocol.BridgeModuleContext
import com.aspect.webviewbridge.protocol.BridgeRequest

class BiometricsModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext,
    private val activityProvider: () -> FragmentActivity?
) : BridgeModule {

    override val moduleName: String = "Biometrics"

    override val methods: List<String> = listOf(
        "IsAvailable",
        "GetBiometryType",
        "Authenticate",
        "CheckEnrollment"
    )

    private val biometricManager: BiometricManager by lazy {
        BiometricManager.from(context)
    }

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "IsAvailable" -> isAvailable(callback)
            "GetBiometryType" -> getBiometryType(callback)
            "Authenticate" -> authenticate(request, callback)
            "CheckEnrollment" -> checkEnrollment(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - IsAvailable

    private fun isAvailable(callback: (Result<Any?>) -> Unit) {
        val canAuthenticate =
            biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        val canAuthenticateWeak =
            biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)

        val isAvailable = canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS ||
                canAuthenticateWeak == BiometricManager.BIOMETRIC_SUCCESS

        callback(
            Result.success(
                mapOf(
                    "isAvailable" to isAvailable,
                    "biometryType" to getBiometryTypeString(),
                    "strongBiometrics" to (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS),
                    "weakBiometrics" to (canAuthenticateWeak == BiometricManager.BIOMETRIC_SUCCESS)
                )
            )
        )
    }

    // MARK: - GetBiometryType

    private fun getBiometryType(callback: (Result<Any?>) -> Unit) {
        val type = getBiometryTypeString()
        val displayName = when (type) {
            "fingerprint" -> "指纹识别"
            "face" -> "面部识别"
            "iris" -> "虹膜识别"
            "multiple" -> "多种生物识别"
            else -> "无"
        }

        callback(
            Result.success(
                mapOf(
                    "type" to type,
                    "displayName" to displayName
                )
            )
        )
    }

    // MARK: - Authenticate

    private fun authenticate(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }

        val title = request.getString("title") ?: "生物识别认证"
        val subtitle = request.getString("subtitle") ?: ""
        val description = request.getString("reason") ?: "请验证您的身份"
        val negativeButtonText = request.getString("cancelTitle") ?: "取消"
        val allowDeviceCredential = request.getBool("allowDeviceCredential") ?: false

        activity.runOnUiThread {
            val authCallback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    val result = mapOf(
                        "success" to false,
                        "errorCode" to errorCode,
                        "errorMessage" to errString.toString(),
                        "reason" to errorReasonString(errorCode)
                    )
                    callback(Result.success(result))
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    val successResult = mapOf(
                        "success" to true,
                        "biometryType" to getBiometryTypeString(),
                        "authenticationType" to when (result.authenticationType) {
                            BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC -> "biometric"
                            BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL -> "deviceCredential"
                            else -> "unknown"
                        }
                    )
                    callback(Result.success(successResult))
                }

                override fun onAuthenticationFailed() {
                    // 认证失败但还可以重试，不需要返回结果
                }
            }

            val executor = ContextCompat.getMainExecutor(context)
            val biometricPrompt = BiometricPrompt(activity, executor, authCallback)

            val promptInfoBuilder = BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setDescription(description)

            if (subtitle.isNotEmpty()) {
                promptInfoBuilder.setSubtitle(subtitle)
            }

            if (allowDeviceCredential) {
                promptInfoBuilder.setAllowedAuthenticators(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG or
                            BiometricManager.Authenticators.DEVICE_CREDENTIAL
                )
            } else {
                promptInfoBuilder.setNegativeButtonText(negativeButtonText)
                promptInfoBuilder.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            }

            val promptInfo = promptInfoBuilder.build()
            biometricPrompt.authenticate(promptInfo)
        }
    }

    // MARK: - CheckEnrollment

    private fun checkEnrollment(callback: (Result<Any?>) -> Unit) {
        val canAuthenticate =
            biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)

        val isEnrolled = canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS

        val reason = when (canAuthenticate) {
            BiometricManager.BIOMETRIC_SUCCESS -> "enrolled"
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "noHardware"
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "hardwareUnavailable"
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "notEnrolled"
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> "securityUpdateRequired"
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> "unsupported"
            BiometricManager.BIOMETRIC_STATUS_UNKNOWN -> "unknown"
            else -> "unknown"
        }

        callback(
            Result.success(
                mapOf(
                    "isEnrolled" to isEnrolled,
                    "biometryType" to getBiometryTypeString(),
                    "reason" to reason
                )
            )
        )
    }

    // MARK: - 辅助方法

    private fun getBiometryTypeString(): String {
        val hasFingerprint =
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
        val hasFace = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_FACE)
        } else false
        val hasIris = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_IRIS)
        } else false

        return when {
            hasFingerprint && hasFace -> "multiple"
            hasFace -> "face"
            hasIris -> "iris"
            hasFingerprint -> "fingerprint"
            else -> "none"
        }
    }

    private fun errorReasonString(errorCode: Int): String {
        return when (errorCode) {
            BiometricPrompt.ERROR_HW_UNAVAILABLE -> "hardwareUnavailable"
            BiometricPrompt.ERROR_UNABLE_TO_PROCESS -> "unableToProcess"
            BiometricPrompt.ERROR_TIMEOUT -> "timeout"
            BiometricPrompt.ERROR_NO_SPACE -> "noSpace"
            BiometricPrompt.ERROR_CANCELED -> "systemCancel"
            BiometricPrompt.ERROR_LOCKOUT -> "lockout"
            BiometricPrompt.ERROR_VENDOR -> "vendor"
            BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "lockoutPermanent"
            BiometricPrompt.ERROR_USER_CANCELED -> "userCancel"
            BiometricPrompt.ERROR_NO_BIOMETRICS -> "notEnrolled"
            BiometricPrompt.ERROR_HW_NOT_PRESENT -> "noHardware"
            BiometricPrompt.ERROR_NEGATIVE_BUTTON -> "userFallback"
            BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> "noDeviceCredential"
            else -> "unknown"
        }
    }
}
