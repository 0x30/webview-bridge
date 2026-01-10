/**
 * WebView Bridge SDK - 核心类
 *
 * 提供 WebView 与 Native 的通信桥梁
 */

package com.aspect.webviewbridge.core

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.fragment.app.FragmentActivity
import androidx.webkit.WebViewAssetLoader
import com.aspect.webviewbridge.modules.*
import com.aspect.webviewbridge.protocol.*
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.ByteArrayInputStream

/**
 * URL Scheme 配置
 */
data class URLSchemeConfiguration(
    /** 自定义 scheme (如 "app") */
    val scheme: String = "app",
    /** 主机名 (如 "localhost") */
    val host: String = "localhost",
    /** 本地资源根目录 (相对于 assets) */
    val resourcePath: String = ""
)

/**
 * Bridge 配置
 */
data class BridgeConfiguration(
    /** 是否启用调试模式 */
    val debug: Boolean = false,
    /** JavaScript 接口名称 */
    val jsInterfaceName: String = "NativeBridge",
    /** URL Scheme 配置（可选，null 表示不启用自定义 scheme） */
    val urlScheme: URLSchemeConfiguration? = null,
    /** 是否允许加载 HTTP URL（用于开发调试） */
    val allowsHTTPLoading: Boolean = false
) {
    companion object {
        /** 默认配置 */
        val DEFAULT = BridgeConfiguration()

        /** 开发调试配置（允许 HTTP 加载） */
        val DEVELOPMENT = BridgeConfiguration(
            debug = true,
            allowsHTTPLoading = true
        )

        /** 带自定义 Scheme 的配置 */
        fun withURLScheme(scheme: URLSchemeConfiguration) = BridgeConfiguration(
            urlScheme = scheme
        )
    }
}

/**
 * WebView Bridge 核心类
 *
 * 负责管理 WebView、模块注册、消息路由
 */
class WebViewBridge(
    private val context: Context,
    private val webView: WebView,
    private val configuration: BridgeConfiguration = BridgeConfiguration.DEFAULT,
    private val activityProvider: () -> FragmentActivity? = { null }
) : BridgeModuleContext {

    companion object {
        private const val TAG = "WebViewBridge"
        private const val PROTOCOL_VERSION = "1.0"
    }

    private val gson = Gson()
    private val mainHandler = Handler(Looper.getMainLooper())

    // 模块注册表
    private val modules = mutableMapOf<String, BridgeModule>()

    // 资源加载器
    private var assetLoader: WebViewAssetLoader? = null

    // 启动参数
    private var launchParams: Map<String, Any> = emptyMap()

    init {
        Log.d(TAG, "========== WebViewBridge 初始化开始 ==========")
        Log.d(TAG, "配置: debug=${configuration.debug}, jsInterface=${configuration.jsInterfaceName}")
        
        setupWebView()
        Log.d(TAG, "WebView 配置完成")
        
        if (configuration.urlScheme != null) {
            setupAssetLoader()
            Log.d(TAG, "AssetLoader 配置完成")
        }
        
        registerBuiltInModules()
        Log.d(TAG, "========== WebViewBridge 初始化完成，已注册 ${modules.size} 个模块 ==========")
    }

    /**
     * 配置 WebView
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        Log.d(TAG, "开始配置 WebView...")
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false

            // 开发模式允许混合内容
            if (configuration.allowsHTTPLoading) {
                mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
        }

        // 添加 JavaScript 接口
        webView.addJavascriptInterface(BridgeJSInterface(), configuration.jsInterfaceName)
        Log.d(TAG, "JavaScript 接口已添加: ${configuration.jsInterfaceName}")

        // 设置 WebViewClient 处理资源请求
        webView.webViewClient = BridgeWebViewClient()

        if (configuration.debug) {
            WebView.setWebContentsDebuggingEnabled(true)
            Log.d(TAG, "WebView 调试已启用")
        }
    }

    /**
     * 设置资源加载器
     */
    private fun setupAssetLoader() {
        val urlScheme = configuration.urlScheme ?: return

        assetLoader = WebViewAssetLoader.Builder()
            .setDomain(urlScheme.host)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(context))
            .build()
    }

    /**
     * 注册内置模块
     */
    private fun registerBuiltInModules() {
        Log.d(TAG, "开始注册内置模块...")
        
        // 使用安全注册，确保单个模块失败不影响其他模块
        safeRegisterModule { AppModule(context, this) }
        safeRegisterModule { DeviceModule(context, this) }
        safeRegisterModule { PermissionModule(context, this) }
        safeRegisterModule { ClipboardModule(context, this) }
        safeRegisterModule { HapticsModule(context, this) }
        safeRegisterModule { StatusBarModule(context, this) }
        safeRegisterModule { SystemModule(context, this) }
        safeRegisterModule { StorageModule(context, this) }
        safeRegisterModule { BiometricsModule(context, this, activityProvider) }
        safeRegisterModule { ContactsModule(context, this, activityProvider) }
        safeRegisterModule { LocationModule(context, this) }
        safeRegisterModule { MediaModule(context, this, activityProvider) }
        safeRegisterModule { NetworkModule(context, this) }
        safeRegisterModule { NFCModule(context, this, activityProvider) }
        
        Log.d(TAG, "模块注册完成！已注册 ${modules.size} 个模块:")
        modules.keys.forEach { moduleName ->
            Log.d(TAG, "  ✓ $moduleName")
        }
    }
    
    /**
     * 安全注册模块 - 捕获异常以防止单个模块失败影响整体
     */
    private fun safeRegisterModule(creator: () -> BridgeModule) {
        try {
            val module = creator()
            registerModule(module)
            Log.d(TAG, "  ✓ ${module.moduleName} 注册成功")
        } catch (e: Exception) {
            Log.e(TAG, "  ✗ 模块注册失败: ${e.message}", e)
            e.printStackTrace()
        }
    }

    /**
     * 注册模块
     */
    fun registerModule(module: BridgeModule) {
        modules[module.moduleName] = module
        if (configuration.debug) {
            Log.d(TAG, "模块已注册: ${module.moduleName}")
        }
    }

    /**
     * 注销模块
     */
    fun unregisterModule(moduleName: String) {
        modules.remove(moduleName)?.let { module ->
            if (module is BridgeModuleLifecycle) {
                module.onDisable()
            }
        }
    }

    /**
     * 设置启动参数
     */
    fun setLaunchParams(params: Map<String, Any>) {
        this.launchParams = params
    }

    /**
     * 获取启动参数
     */
    fun getLaunchParams(): Map<String, Any> = launchParams

    /**
     * 加载本地 HTML 文件（使用自定义 URL Scheme）
     *
     * @param path 相对于 assets 的路径，例如 "www/index.html"
     */
    fun loadLocalHtml(path: String) {
        val urlScheme = configuration.urlScheme
        if (urlScheme != null) {
            val fullPath = if (urlScheme.resourcePath.isNotEmpty()) {
                "${urlScheme.resourcePath}/$path"
            } else {
                path
            }
            val url = "${urlScheme.scheme}://${urlScheme.host}/$fullPath"
            webView.loadUrl(url)
            if (configuration.debug) {
                Log.d(TAG, "加载本地资源: $url")
            }
        } else {
            // 不使用自定义 scheme，直接从 assets 加载
            webView.loadUrl("file:///android_asset/$path")
            if (configuration.debug) {
                Log.d(TAG, "从 assets 加载: $path")
            }
        }
    }

    /**
     * 加载远程 URL（用于开发调试）
     *
     * @param url 远程 URL
     */
    fun loadUrl(url: String) {
        if (url.startsWith("http://") && !configuration.allowsHTTPLoading) {
            Log.e(TAG, "不允许加载 HTTP URL，请使用 HTTPS 或启用 allowsHTTPLoading")
            return
        }
        webView.loadUrl(url)
        if (configuration.debug) {
            Log.d(TAG, "加载远程 URL: $url")
        }
    }

    /**
     * 重新加载当前页面
     */
    fun reload() {
        webView.reload()
    }

    /**
     * 处理请求
     */
    private fun handleRequest(requestJson: String) {
        try {
            val request = gson.fromJson(requestJson, BridgeRequest::class.java)

            // 验证协议版本
            if (request.version != PROTOCOL_VERSION) {
                sendError(request.callbackId, BridgeError(BridgeErrorCode.INVALID_VERSION))
                return
            }

            // 查找模块
            val module = modules[request.moduleName]
            if (module == null) {
                sendError(request.callbackId, BridgeError.moduleNotFound(request.moduleName))
                return
            }

            // 验证方法
            if (!module.methods.contains(request.methodName)) {
                sendError(request.callbackId, BridgeError.methodNotFound(request.type))
                return
            }

            // 调用模块处理
            module.handleRequest(request.methodName, request) { result ->
                result.fold(
                    onSuccess = { data ->
                        sendSuccess(request.callbackId, data)
                    },
                    onFailure = { error ->
                        when (error) {
                            is BridgeError -> sendError(request.callbackId, error)
                            else -> sendError(
                                request.callbackId,
                                BridgeError.internalError(error.message)
                            )
                        }
                    }
                )
            }

        } catch (e: JsonSyntaxException) {
            Log.e(TAG, "请求解析失败: $requestJson", e)
            sendError(null, BridgeError.parseError(e.message))
        } catch (e: Exception) {
            Log.e(TAG, "处理请求失败", e)
            sendError(null, BridgeError.internalError(e.message))
        }
    }

    /**
     * 发送成功响应
     */
    private fun sendSuccess(callbackId: String?, data: Any?) {
        val response = BridgeResponse.success(callbackId, data)
        sendResponse(response)
    }

    /**
     * 发送错误响应
     */
    private fun sendError(callbackId: String?, error: BridgeError) {
        val response = BridgeResponse.error(callbackId, error)
        sendResponse(response)
    }

    /**
     * 发送响应到 Web 端
     */
    private fun sendResponse(response: BridgeResponse) {
        val json = response.toJson().escapeForJs()
        val js = "window.__bridgeCallback && window.__bridgeCallback('$json')"
        evaluateJavaScript(js)
    }

    /**
     * 发送事件到 Web 端
     */
    override fun sendEvent(eventName: String, data: Any?) {
        val event = BridgeEvent(eventName, data)
        val json = event.toJson().escapeForJs()
        val js = "window.__bridgeEvent && window.__bridgeEvent('$json')"
        evaluateJavaScript(js)
    }

    /**
     * 获取模块
     */
    @Suppress("UNCHECKED_CAST")
    override fun <T : BridgeModule> getModule(moduleClass: Class<T>): T? {
        return modules.values.find { moduleClass.isInstance(it) } as? T
    }

    /**
     * 执行 JavaScript
     */
    private fun evaluateJavaScript(js: String) {
        mainHandler.post {
            webView.evaluateJavascript(js, null)
        }
    }

    /**
     * 生命周期方法 - onResume
     */
    fun onResume() {
        modules.values.forEach { module ->
            if (module is BridgeModuleLifecycle) {
                module.onResume()
            }
        }
        sendEvent("foreground", null)
    }

    /**
     * 生命周期方法 - onPause
     */
    fun onPause() {
        modules.values.forEach { module ->
            if (module is BridgeModuleLifecycle) {
                module.onPause()
            }
        }
        sendEvent("background", null)
    }

    /**
     * 生命周期方法 - onDestroy
     */
    fun onDestroy() {
        modules.values.forEach { module ->
            if (module is BridgeModuleLifecycle) {
                module.onDestroy()
            }
        }
        modules.clear()
    }

    /**
     * JavaScript 接口
     */
    private inner class BridgeJSInterface {

        @JavascriptInterface
        fun postMessage(message: String) {
            Log.d(TAG, "收到来自 JS 的消息: ${message.take(100)}...")
            handleRequest(message)
        }
    }

    /**
     * WebView Client - 处理资源拦截
     */
    private inner class BridgeWebViewClient : WebViewClient() {

        override fun shouldInterceptRequest(
            view: WebView?,
            request: WebResourceRequest?
        ): WebResourceResponse? {
            request?.url?.let { uri ->
                val urlScheme = configuration.urlScheme

                // 处理自定义 scheme
                if (urlScheme != null &&
                    uri.scheme == urlScheme.scheme &&
                    uri.host == urlScheme.host
                ) {
                    val path = uri.path?.removePrefix("/") ?: ""
                    return loadAsset(path)
                }

                // 使用 AssetLoader 处理
                assetLoader?.shouldInterceptRequest(uri)?.let { return it }
            }

            return super.shouldInterceptRequest(view, request)
        }

        private fun loadAsset(path: String): WebResourceResponse? {
            return try {
                val inputStream = context.assets.open(path)
                val mimeType = getMimeType(path)
                WebResourceResponse(mimeType, "UTF-8", inputStream)
            } catch (e: Exception) {
                if (configuration.debug) {
                    Log.e(TAG, "加载资源失败: $path", e)
                }
                // 返回 404
                WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    404,
                    "Not Found",
                    mapOf("Content-Type" to "text/plain"),
                    ByteArrayInputStream("Not Found".toByteArray())
                )
            }
        }

        private fun getMimeType(path: String): String {
            return when {
                path.endsWith(".html") -> "text/html"
                path.endsWith(".js") -> "application/javascript"
                path.endsWith(".mjs") -> "application/javascript"
                path.endsWith(".css") -> "text/css"
                path.endsWith(".json") -> "application/json"
                path.endsWith(".png") -> "image/png"
                path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
                path.endsWith(".gif") -> "image/gif"
                path.endsWith(".svg") -> "image/svg+xml"
                path.endsWith(".webp") -> "image/webp"
                path.endsWith(".ico") -> "image/x-icon"
                path.endsWith(".woff") -> "font/woff"
                path.endsWith(".woff2") -> "font/woff2"
                path.endsWith(".ttf") -> "font/ttf"
                path.endsWith(".otf") -> "font/otf"
                path.endsWith(".mp4") -> "video/mp4"
                path.endsWith(".webm") -> "video/webm"
                path.endsWith(".mp3") -> "audio/mpeg"
                path.endsWith(".wav") -> "audio/wav"
                else -> "application/octet-stream"
            }
        }
    }
}

/**
 * 字符串扩展 - 转义 JavaScript 字符串
 */
private fun String.escapeForJs(): String {
    return this
        .replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
}
