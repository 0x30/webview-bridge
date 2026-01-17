/**
 * InAppReview 模块 - 应用内评价
 *
 * 提供 Google Play In-App Review API 功能
 * 允许用户在不离开应用的情况下提交评价
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.aspect.webviewbridge.protocol.*
import com.google.android.play.core.review.ReviewException
import com.google.android.play.core.review.ReviewInfo
import com.google.android.play.core.review.ReviewManager
import com.google.android.play.core.review.ReviewManagerFactory
import com.google.android.play.core.review.model.ReviewErrorCode

/**
 * InAppReview 模块
 * 
 * 使用 Google Play In-App Review API 实现应用内评价功能
 */
class InAppReviewModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {

    override val moduleName = "InAppReview"

    override val methods = listOf(
        "RequestReview",
        "IsAvailable",
        "OpenAppStoreReview"
    )

    private val reviewManager: ReviewManager by lazy {
        ReviewManagerFactory.create(context)
    }

    private var cachedReviewInfo: ReviewInfo? = null

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "RequestReview" -> requestReview(callback)
            "IsAvailable" -> isAvailable(callback)
            "OpenAppStoreReview" -> openAppStoreReview(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - RequestReview

    /**
     * 请求应用内评价
     * 
     * 注意：Google Play 会根据自己的策略决定是否显示评价弹窗
     * 配额限制由 Google Play 控制，开发者无法控制显示频率
     */
    private fun requestReview(callback: (Result<Any?>) -> Unit) {
        val activity = getActivity()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("No activity available")))
            return
        }

        // 如果有缓存的 ReviewInfo，直接使用
        cachedReviewInfo?.let { reviewInfo ->
            launchReviewFlow(activity, reviewInfo, callback)
            return
        }

        // 请求 ReviewInfo
        val requestFlow = reviewManager.requestReviewFlow()
        requestFlow.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val reviewInfo = task.result
                cachedReviewInfo = reviewInfo
                launchReviewFlow(activity, reviewInfo, callback)
            } else {
                val exception = task.exception
                val errorMessage = when {
                    exception is ReviewException -> {
                        getReviewErrorMessage(exception.errorCode)
                    }
                    exception != null -> exception.message ?: "Unknown error"
                    else -> "Failed to request review flow"
                }
                callback(Result.failure(BridgeError.internalError(errorMessage)))
            }
        }
    }

    /**
     * 启动评价流程
     */
    private fun launchReviewFlow(
        activity: Activity,
        reviewInfo: ReviewInfo,
        callback: (Result<Any?>) -> Unit
    ) {
        val flow = reviewManager.launchReviewFlow(activity, reviewInfo)
        flow.addOnCompleteListener { task ->
            // 无论用户是否完成评价，这里都会被调用
            // Google Play API 不会告诉我们用户是否真的提交了评价
            // 这是为了防止开发者根据用户是否评价来改变应用行为
            cachedReviewInfo = null // 清除缓存，下次需要重新请求
            
            if (task.isSuccessful) {
                callback(Result.success(mapOf(
                    "requested" to true,
                    "message" to "Review flow completed"
                )))
            } else {
                // 即使失败，也返回成功，因为我们无法确定用户实际操作
                callback(Result.success(mapOf(
                    "requested" to true,
                    "message" to "Review flow finished"
                )))
            }
        }
    }

    /**
     * 获取评价错误信息
     */
    private fun getReviewErrorMessage(@ReviewErrorCode errorCode: Int): String {
        return when (errorCode) {
            ReviewErrorCode.NO_ERROR -> "No error"
            ReviewErrorCode.PLAY_STORE_NOT_FOUND -> "Play Store not found on device"
            ReviewErrorCode.INTERNAL_ERROR -> "Internal error in Play Store"
            ReviewErrorCode.INVALID_REQUEST -> "Invalid review request"
            else -> "Unknown error (code: $errorCode)"
        }
    }

    // MARK: - IsAvailable

    /**
     * 检查应用内评价是否可用
     * 
     * Google Play In-App Review API 需要：
     * 1. 设备上安装了 Google Play Store
     * 2. 应用是从 Google Play 安装的（生产环境）
     * 3. 用户已登录 Google Play
     */
    private fun isAvailable(callback: (Result<Any?>) -> Unit) {
        // 检查 Google Play Store 是否可用
        val isPlayStoreInstalled = try {
            context.packageManager.getPackageInfo("com.android.vending", 0)
            true
        } catch (e: Exception) {
            false
        }

        val result = mapOf(
            "isSupported" to isPlayStoreInstalled,
            "reason" to if (!isPlayStoreInstalled) "Google Play Store not installed" else null
        )
        
        callback(Result.success(result))
    }

    // MARK: - OpenAppStoreReview

    /**
     * 打开 Google Play 商店评价页面
     * 直接跳转到 Play Store 的应用详情页
     */
    private fun openAppStoreReview(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        // packageName 参数可选，默认使用当前应用的包名
        val packageName = request.getString("packageName") 
            ?: request.getString("appId")  // 兼容 iOS 的参数名
            ?: context.packageName

        try {
            // 尝试使用 Play Store 应用打开
            val playStoreUri = Uri.parse("market://details?id=$packageName")
            val playStoreIntent = Intent(Intent.ACTION_VIEW, playStoreUri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                setPackage("com.android.vending")
            }
            
            if (playStoreIntent.resolveActivity(context.packageManager) != null) {
                context.startActivity(playStoreIntent)
                callback(Result.success(mapOf("opened" to true)))
            } else {
                // 回退到浏览器打开
                val webUri = Uri.parse("https://play.google.com/store/apps/details?id=$packageName")
                val webIntent = Intent(Intent.ACTION_VIEW, webUri).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(webIntent)
                callback(Result.success(mapOf("opened" to true)))
            }
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError("Failed to open Play Store: ${e.message}")))
        }
    }

    /**
     * 获取当前 Activity
     */
    private fun getActivity(): Activity? {
        return bridgeContext.getActivity()
    }
}
