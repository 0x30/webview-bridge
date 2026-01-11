/**
 * Browser 模块 - 应用内浏览器
 *
 * 提供应用内浏览器功能（Chrome Custom Tabs）
 */

package com.aspect.webviewbridge.modules

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsIntent
import androidx.browser.customtabs.CustomTabsServiceConnection
import androidx.browser.customtabs.CustomTabsSession
import com.aspect.webviewbridge.protocol.*

/**
 * 应用内浏览器模块
 */
class BrowserModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {

    override val moduleName = "Browser"

    override val methods = listOf(
        "Open",
        "Close",
        "Prefetch"
    )

    private var customTabsClient: CustomTabsClient? = null
    private var customTabsSession: CustomTabsSession? = null
    private var connection: CustomTabsServiceConnection? = null

    init {
        // 初始化 Custom Tabs 连接
        bindCustomTabsService()
    }

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val cb = callback.toBridgeCallback()
        when (method) {
            "Open" -> open(request, cb)
            "Close" -> close(cb)
            "Prefetch" -> prefetch(request, cb)
            else -> cb.error(BridgeError.methodNotFound("$moduleName.$method"))
        }
    }

    /**
     * 绑定 Custom Tabs 服务
     */
    private fun bindCustomTabsService() {
        val packageName = CustomTabsClient.getPackageName(context, null)
        if (packageName != null) {
            connection = object : CustomTabsServiceConnection() {
                override fun onCustomTabsServiceConnected(
                    name: android.content.ComponentName,
                    client: CustomTabsClient
                ) {
                    customTabsClient = client
                    client.warmup(0)
                    customTabsSession = client.newSession(null)
                }

                override fun onServiceDisconnected(name: android.content.ComponentName) {
                    customTabsClient = null
                    customTabsSession = null
                }
            }

            try {
                CustomTabsClient.bindCustomTabsService(context, packageName, connection!!)
            } catch (e: Exception) {
                // 某些设备可能不支持
            }
        }
    }

    /**
     * 打开浏览器
     */
    private fun open(request: BridgeRequest, callback: BridgeCallback) {
        val urlString = request.getString("url")
        if (urlString == null) {
            callback.error(BridgeError.invalidParams("url 参数必需"))
            return
        }

        val uri = try {
            Uri.parse(urlString)
        } catch (e: Exception) {
            callback.error(BridgeError.invalidParams("url 格式无效"))
            return
        }

        val toolbarColor = request.getString("toolbarColor")
        val showTitle = request.getBool("showTitle") ?: true
        val shareState = request.getInt("shareState") ?: 0

        try {
            val builder = CustomTabsIntent.Builder(customTabsSession)

            // 设置工具栏颜色
            toolbarColor?.let { colorString ->
                try {
                    val color = Color.parseColor(colorString)
                    builder.setToolbarColor(color)
                } catch (e: Exception) {
                    // 忽略无效颜色
                }
            }

            // 设置标题显示
            builder.setShowTitle(showTitle)

            // 设置分享状态
            builder.setShareState(shareState)

            // 启用 URL 栏隐藏
            builder.setUrlBarHidingEnabled(true)

            // 动画
            builder.setStartAnimations(
                context,
                android.R.anim.slide_in_left,
                android.R.anim.slide_out_right
            )
            builder.setExitAnimations(
                context,
                android.R.anim.slide_in_left,
                android.R.anim.slide_out_right
            )

            val customTabsIntent = builder.build()
            customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            customTabsIntent.launchUrl(context, uri)

            bridgeContext.sendEvent("Browser.Opened", mapOf("url" to urlString))
            callback.success(mapOf("opened" to true))

        } catch (e: Exception) {
            // 回退到普通浏览器
            try {
                val intent = Intent(Intent.ACTION_VIEW, uri)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)

                bridgeContext.sendEvent(
                    "Browser.Opened", mapOf(
                        "url" to urlString,
                        "fallback" to true
                    )
                )
                callback.success(
                    mapOf(
                        "opened" to true,
                        "fallback" to true
                    )
                )
            } catch (e2: Exception) {
                callback.error(BridgeError.unknown("无法打开浏览器: ${e2.message}"))
            }
        }
    }

    /**
     * 关闭浏览器
     * 注意：Chrome Custom Tabs 不支持程序化关闭
     */
    private fun close(callback: BridgeCallback) {
        // Chrome Custom Tabs 是独立的 Activity，无法程序化关闭
        // 只能提示用户手动关闭
        callback.success(
            mapOf(
                "closed" to false,
                "reason" to "Custom Tabs 需要用户手动关闭"
            )
        )
    }

    /**
     * 预加载 URL
     */
    private fun prefetch(request: BridgeRequest, callback: BridgeCallback) {
        val urls = request.getArray("urls")
        if (urls == null || urls.isEmpty()) {
            callback.error(BridgeError.invalidParams("urls 参数无效"))
            return
        }

        val session = customTabsSession
        if (session == null) {
            callback.error(
                BridgeError(
                    BridgeError.Code.CAPABILITY_NOT_SUPPORTED,
                    "Custom Tabs 不可用"
                )
            )
            return
        }

        var count = 0
        urls.filterIsInstance<String>().forEach { urlString ->
            try {
                val uri = Uri.parse(urlString)
                session.mayLaunchUrl(uri, null, null)
                count++
            } catch (e: Exception) {
                // 忽略无效 URL
            }
        }

        callback.success(
            mapOf(
                "prefetched" to true,
                "count" to count
            )
        )
    }

    /**
     * 清理资源
     */
    fun cleanup() {
        connection?.let {
            try {
                context.unbindService(it)
            } catch (e: Exception) {
                // 忽略
            }
        }
        connection = null
        customTabsClient = null
        customTabsSession = null
    }
}
