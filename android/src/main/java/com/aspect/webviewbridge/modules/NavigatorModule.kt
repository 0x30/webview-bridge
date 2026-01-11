/**
 * Navigator 模块 - 页面栈管理（类似小程序）
 *
 * 提供多 WebView 页面栈管理，支持页面间通信
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.WebView
import com.aspect.webviewbridge.WebViewBridge
import com.aspect.webviewbridge.protocol.*
import java.util.concurrent.ConcurrentHashMap

/**
 * 页面信息
 */
data class PageInfo(
    val id: String,
    val url: String,
    var title: String? = null,
    val index: Int,
    val createdAt: Long = System.currentTimeMillis()
) {
    fun toMap(): Map<String, Any?> = mapOf(
        "id" to id,
        "url" to url,
        "title" to (title ?: ""),
        "index" to index,
        "createdAt" to createdAt
    )
}

/**
 * 页面栈项
 */
data class PageStackItem(
    val info: PageInfo,
    val bridge: WebViewBridge,
    val activity: Activity
)

/**
 * 页面栈管理器（单例）
 */
object PageStackManager {
    
    private val pageStack = mutableListOf<PageStackItem>()
    private var pageIdCounter = 0
    
    /** 页面创建工厂 */
    var pageActivityClass: Class<out Activity>? = null
    
    /** WebView 配置回调 */
    var webViewConfigurator: ((WebView) -> Unit)? = null
    
    /** 页面间消息监听器 */
    private val messageListeners = ConcurrentHashMap<String, (String, Map<String, Any?>) -> Unit>()
    
    // MARK: - 页面栈操作
    
    private fun generatePageId(): String {
        pageIdCounter++
        return "page_${pageIdCounter}_${System.currentTimeMillis()}"
    }
    
    /** 获取当前页面 */
    val currentPage: PageStackItem?
        get() = pageStack.lastOrNull()
    
    /** 获取页面栈信息 */
    val pages: List<PageInfo>
        get() = pageStack.map { it.info }
    
    /** 页面数量 */
    val pageCount: Int
        get() = pageStack.size
    
    /** 根据ID获取页面 */
    fun getPage(byId: String): PageStackItem? {
        return pageStack.find { it.info.id == byId }
    }
    
    /** 注册根页面 */
    fun registerRootPage(bridge: WebViewBridge, activity: Activity, url: String, title: String? = null): PageInfo {
        val pageId = generatePageId()
        val info = PageInfo(id = pageId, url = url, title = title, index = 0)
        pageStack.add(PageStackItem(info, bridge, activity))
        
        // 发送页面创建事件
        bridge.sendEvent("Navigator.PageCreated", info.toMap())
        
        return info
    }
    
    /** Push 新页面 */
    fun push(
        context: Context,
        url: String,
        title: String? = null,
        data: Map<String, Any?>? = null,
        animated: Boolean = true,
        sourceBridge: WebViewBridge,
        callback: (Result<PageInfo>) -> Unit
    ) {
        val activityClass = pageActivityClass
        if (activityClass == null) {
            callback(Result.failure(Exception("pageActivityClass 未设置")))
            return
        }
        
        val pageId = generatePageId()
        val index = pageStack.size
        val info = PageInfo(id = pageId, url = url, title = title, index = index)
        
        // 创建 Intent
        val intent = Intent(context, activityClass).apply {
            putExtra(EXTRA_PAGE_ID, pageId)
            putExtra(EXTRA_URL, url)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_DATA, Bundle().apply {
                data?.forEach { (key, value) ->
                    when (value) {
                        is String -> putString(key, value)
                        is Int -> putInt(key, value)
                        is Boolean -> putBoolean(key, value)
                        is Double -> putDouble(key, value)
                        is Long -> putLong(key, value)
                        else -> putString(key, value.toString())
                    }
                }
            })
            if (!animated) {
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
            }
        }
        
        // 存储待注册的页面信息
        pendingPages[pageId] = PendingPageInfo(info, data, sourceBridge)
        
        context.startActivity(intent)
        
        // 发送事件给源页面
        sourceBridge.sendEvent("Navigator.PageOpened", info.toMap())
        
        callback(Result.success(info))
    }
    
    /** 完成页面注册（在新 Activity 的 onCreate 中调用） */
    fun completePageRegistration(
        pageId: String,
        bridge: WebViewBridge,
        activity: Activity
    ) {
        val pending = pendingPages.remove(pageId) ?: return
        
        pageStack.add(PageStackItem(pending.info, bridge, activity))
        
        // 发送页面创建事件给新页面
        bridge.sendEvent("Navigator.PageCreated", mapOf(
            "page" to pending.info.toMap(),
            "data" to (pending.data ?: emptyMap<String, Any>())
        ))
        
        // 发送启动数据
        pending.data?.let { data ->
            bridge.sendEvent("Navigator.LaunchData", data)
        }
    }
    
    /** Pop 当前页面 */
    fun pop(
        result: Map<String, Any?>? = null,
        delta: Int = 1,
        callback: (Result<Unit>) -> Unit
    ) {
        if (pageStack.size <= 1) {
            callback(Result.failure(Exception("已经是根页面，无法 pop")))
            return
        }
        
        val popCount = minOf(delta, pageStack.size - 1)
        val targetIndex = pageStack.size - popCount - 1
        val targetPage = pageStack[targetIndex]
        
        // 移除页面
        val poppedPages = mutableListOf<PageInfo>()
        repeat(popCount) {
            val popped = pageStack.removeLastOrNull()
            popped?.let {
                poppedPages.add(it.info)
                // 发送页面销毁事件
                it.bridge.sendEvent("Navigator.PageDestroyed", it.info.toMap())
                // 关闭 Activity
                it.activity.finish()
            }
        }
        
        // 发送返回结果给目标页面
        result?.let { resultData ->
            targetPage.bridge.sendEvent("Navigator.Result", mapOf(
                "from" to (poppedPages.firstOrNull()?.toMap() ?: emptyMap<String, Any>()),
                "result" to resultData
            ))
        }
        
        callback(Result.success(Unit))
    }
    
    /** 向指定页面发送消息 */
    fun postMessage(
        targetPageId: String?,
        message: Map<String, Any?>,
        sourcePageId: String
    ): Boolean {
        val sourceInfo = pageStack.find { it.info.id == sourcePageId }?.info
        
        return if (targetPageId != null) {
            // 发送给指定页面
            val target = getPage(targetPageId) ?: return false
            target.bridge.sendEvent("Navigator.Message", mapOf(
                "from" to (sourceInfo?.toMap() ?: emptyMap<String, Any>()),
                "message" to message
            ))
            true
        } else {
            // 广播给所有其他页面
            pageStack.filter { it.info.id != sourcePageId }.forEach { page ->
                page.bridge.sendEvent("Navigator.Message", mapOf(
                    "from" to (sourceInfo?.toMap() ?: emptyMap<String, Any>()),
                    "message" to message
                ))
            }
            true
        }
    }
    
    /** 移除页面 */
    fun removePage(byId: String) {
        pageStack.removeAll { it.info.id == byId }
    }
    
    /** 设置页面标题 */
    fun setTitle(pageId: String?, title: String): Boolean {
        val page = if (pageId != null) {
            getPage(pageId)
        } else {
            currentPage
        }
        
        page?.let {
            it.activity.title = title
            return true
        }
        
        return false
    }
    
    // 待注册的页面信息
    private val pendingPages = ConcurrentHashMap<String, PendingPageInfo>()
    
    private data class PendingPageInfo(
        val info: PageInfo,
        val data: Map<String, Any?>?,
        val sourceBridge: WebViewBridge
    )
    
    // Intent extras keys
    const val EXTRA_PAGE_ID = "navigator_page_id"
    const val EXTRA_URL = "navigator_url"
    const val EXTRA_TITLE = "navigator_title"
    const val EXTRA_DATA = "navigator_data"
}

/**
 * Navigator 模块
 */
class NavigatorModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {

    override val moduleName = "Navigator"

    override val methods = listOf(
        "Push",
        "Pop",
        "PopToRoot",
        "Replace",
        "PostMessage",
        "GetPages",
        "GetCurrentPage",
        "SetTitle"
    )
    
    private var currentPageId: String? = null

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: BridgeCallback
    ) {
        when (method) {
            "Push" -> push(request, callback)
            "Pop" -> pop(request, callback)
            "PopToRoot" -> popToRoot(request, callback)
            "Replace" -> replace(request, callback)
            "PostMessage" -> postMessage(request, callback)
            "GetPages" -> getPages(callback)
            "GetCurrentPage" -> getCurrentPage(callback)
            "SetTitle" -> setTitle(request, callback)
            else -> callback.error(BridgeError.methodNotFound("$moduleName.$method"))
        }
    }
    
    /** 设置当前页面ID */
    fun setCurrentPageId(id: String) {
        currentPageId = id
    }
    
    // MARK: - Push
    
    private fun push(request: BridgeRequest, callback: BridgeCallback) {
        val url = request.getString("url")
        if (url == null) {
            callback.error(BridgeError.invalidParams("url 参数必需"))
            return
        }
        
        val title = request.getString("title")
        val data = request.getObject("data")
        val animated = request.getBoolean("animated") ?: true
        
        // 获取源 Bridge（需要通过 bridgeContext 获取）
        val sourceBridge = bridgeContext.getBridge()
        if (sourceBridge == null) {
            callback.error(BridgeError.unknown("Bridge 未初始化"))
            return
        }
        
        PageStackManager.push(
            context = context,
            url = url,
            title = title,
            data = data,
            animated = animated,
            sourceBridge = sourceBridge
        ) { result ->
            result.onSuccess { pageInfo ->
                callback.success(pageInfo.toMap())
            }.onFailure { error ->
                callback.error(BridgeError.unknown(error.message ?: "Push 失败"))
            }
        }
    }
    
    // MARK: - Pop
    
    private fun pop(request: BridgeRequest, callback: BridgeCallback) {
        val result = request.getObject("result")
        val delta = request.getInt("delta") ?: 1
        
        PageStackManager.pop(
            result = result,
            delta = delta
        ) { popResult ->
            popResult.onSuccess {
                callback.success(mapOf("popped" to true))
            }.onFailure { error ->
                callback.error(BridgeError.unknown(error.message ?: "Pop 失败"))
            }
        }
    }
    
    // MARK: - PopToRoot
    
    private fun popToRoot(request: BridgeRequest, callback: BridgeCallback) {
        val pageCount = PageStackManager.pageCount
        
        if (pageCount <= 1) {
            callback.success(mapOf("popped" to false, "reason" to "已经是根页面"))
            return
        }
        
        PageStackManager.pop(
            result = null,
            delta = pageCount - 1
        ) { result ->
            result.onSuccess {
                callback.success(mapOf("popped" to true))
            }.onFailure { error ->
                callback.error(BridgeError.unknown(error.message ?: "PopToRoot 失败"))
            }
        }
    }
    
    // MARK: - Replace
    
    private fun replace(request: BridgeRequest, callback: BridgeCallback) {
        val url = request.getString("url")
        if (url == null) {
            callback.error(BridgeError.invalidParams("url 参数必需"))
            return
        }
        
        // 简化实现：先 push 再 pop 旧的
        // 实际可能需要更复杂的逻辑
        val title = request.getString("title")
        val data = request.getObject("data")
        
        val sourceBridge = bridgeContext.getBridge()
        if (sourceBridge == null) {
            callback.error(BridgeError.unknown("Bridge 未初始化"))
            return
        }
        
        PageStackManager.push(
            context = context,
            url = url,
            title = title,
            data = data,
            animated = false,
            sourceBridge = sourceBridge
        ) { result ->
            result.onSuccess { pageInfo ->
                callback.success(pageInfo.toMap())
            }.onFailure { error ->
                callback.error(BridgeError.unknown(error.message ?: "Replace 失败"))
            }
        }
    }
    
    // MARK: - PostMessage
    
    private fun postMessage(request: BridgeRequest, callback: BridgeCallback) {
        val message = request.getObject("message")
        if (message == null) {
            callback.error(BridgeError.invalidParams("message 参数必需"))
            return
        }
        
        val targetPageId = request.getString("targetPageId")
        val sourcePageId = currentPageId ?: PageStackManager.currentPage?.info?.id ?: ""
        
        val success = PageStackManager.postMessage(
            targetPageId = targetPageId,
            message = message,
            sourcePageId = sourcePageId
        )
        
        callback.success(mapOf("sent" to success))
    }
    
    // MARK: - GetPages
    
    private fun getPages(callback: BridgeCallback) {
        val pages = PageStackManager.pages.map { it.toMap() }
        callback.success(mapOf(
            "pages" to pages,
            "count" to pages.size
        ))
    }
    
    // MARK: - GetCurrentPage
    
    private fun getCurrentPage(callback: BridgeCallback) {
        val current = PageStackManager.currentPage
        if (current != null) {
            callback.success(current.info.toMap())
        } else {
            callback.error(BridgeError.unknown("没有当前页面"))
        }
    }
    
    // MARK: - SetTitle
    
    private fun setTitle(request: BridgeRequest, callback: BridgeCallback) {
        val title = request.getString("title")
        if (title == null) {
            callback.error(BridgeError.invalidParams("title 参数必需"))
            return
        }
        
        val pageId = request.getString("pageId")
        val success = PageStackManager.setTitle(pageId, title)
        
        callback.success(mapOf("set" to success))
    }
}

/**
 * BridgeModuleContext 扩展 - 获取 Bridge 实例
 */
interface BridgeModuleContext {
    fun sendEvent(eventName: String, data: Map<String, Any?>)
    fun getBridge(): WebViewBridge?
}
