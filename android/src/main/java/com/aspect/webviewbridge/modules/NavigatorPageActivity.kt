package com.aspect.webviewbridge.modules

import android.os.Bundle
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.aspect.webviewbridge.core.BridgeConfiguration
import com.aspect.webviewbridge.core.WebViewBridge

/**
 * Navigator 模块使用的默认页面 Activity
 * 
 * 用于 Navigator.push() 打开的新页面
 * 
 * 用法：
 * 1. 直接使用：PageStackManager.pageActivityClass = NavigatorPageActivity::class.java
 * 2. 继承自定义：创建自己的 Activity 继承此类，重写 setupCustomViews() 等方法
 */
open class NavigatorPageActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "NavigatorPageActivity"
    }
    
    protected var bridge: WebViewBridge? = null
    protected lateinit var webView: WebView
    protected lateinit var rootContainer: FrameLayout
    
    protected var pageId: String? = null
    protected var pageUrl: String? = null
    protected var pageTitle: String? = null
    protected var pageData: Bundle? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 获取传递的参数
        pageId = intent.getStringExtra(PageStackManager.EXTRA_PAGE_ID)
        pageUrl = intent.getStringExtra(PageStackManager.EXTRA_URL)
        pageTitle = intent.getStringExtra(PageStackManager.EXTRA_TITLE)
        pageData = intent.getBundleExtra(PageStackManager.EXTRA_DATA)
        
        // 设置标题
        pageTitle?.let { title = it }
        
        // 创建根容器
        rootContainer = FrameLayout(this)
        setContentView(rootContainer)
        
        // 初始化 WebView 和 Bridge
        setupWebViewAndBridge()
        
        // 自定义视图（子类可重写）
        setupCustomViews()
        
        // 加载 URL
        pageUrl?.let { url ->
            bridge?.loadUrl(url)
        }
    }
    
    /**
     * 设置自定义视图
     * 子类可重写此方法添加自定义 UI（如自定义导航栏等）
     */
    protected open fun setupCustomViews() {
        // 默认不添加额外视图
    }
    
    private fun setupWebViewAndBridge() {
        // 创建 WebView
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        
        // 应用自定义配置
        PageStackManager.webViewConfigurator?.invoke(webView)
        
        rootContainer.addView(webView)
        
        // 创建 Bridge
        bridge = createBridge()
        
        // 注册到页面栈
        pageId?.let { id ->
            bridge?.let { b ->
                PageStackManager.completePageRegistration(id, b, this)
            }
        }
        
        // 设置启动参数
        val launchParams = createLaunchParams()
        bridge?.setLaunchParams(launchParams)
    }
    
    /**
     * 创建 Bridge 实例
     * 子类可重写此方法自定义 Bridge 配置
     */
    protected open fun createBridge(): WebViewBridge {
        return WebViewBridge(
            context = this,
            webView = webView,
            configuration = BridgeConfiguration(
                debug = true,
                allowsHTTPLoading = true
            )
        )
    }
    
    /**
     * 创建启动参数
     * 子类可重写此方法添加额外的启动参数
     */
    protected open fun createLaunchParams(): Map<String, Any> {
        val launchParams = mutableMapOf<String, Any>(
            "source" to "navigator",
            "pageId" to (pageId ?: "")
        )
        
        // 添加传递的数据
        pageData?.keySet()?.forEach { key ->
            pageData?.get(key)?.let { value ->
                launchParams[key] = value
            }
        }
        
        return launchParams
    }
    
    override fun onResume() {
        super.onResume()
        bridge?.onResume()
    }
    
    override fun onPause() {
        super.onPause()
        bridge?.onPause()
    }
    
    override fun onBackPressed() {
        // 检查是否可以 pop
        if (PageStackManager.pageCount > 1) {
            // 通知页面栈移除当前页面
            pageId?.let { PageStackManager.removePage(it) }
            finish()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
    
    override fun onDestroy() {
        bridge?.onDestroy()
        super.onDestroy()
    }
}
