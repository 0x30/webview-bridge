package com.aspect.webviewbridge.demo

import android.os.Bundle
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.aspect.webviewbridge.core.BridgeConfiguration
import com.aspect.webviewbridge.core.WebViewBridge
import com.aspect.webviewbridge.modules.PageStackManager

/**
 * Navigator 模块使用的页面 Activity
 * 
 * 用于 Navigator.push() 打开的新页面
 */
class NavigatorPageActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "NavigatorPageActivity"
    }
    
    private var bridge: WebViewBridge? = null
    private lateinit var webView: WebView
    private lateinit var rootContainer: FrameLayout
    
    private var pageId: String? = null
    private var pageUrl: String? = null
    private var pageTitle: String? = null
    private var pageData: Bundle? = null
    
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
        
        // 加载 URL
        pageUrl?.let { url ->
            bridge?.loadUrl(url)
        }
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
        bridge = WebViewBridge(
            context = this,
            webView = webView,
            configuration = BridgeConfiguration(
                debug = true,
                allowsHTTPLoading = true
            )
        )
        
        // 注册到页面栈
        pageId?.let { id ->
            bridge?.let { b ->
                PageStackManager.completePageRegistration(id, b, this)
            }
        }
        
        // 设置启动参数
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
        
        bridge?.setLaunchParams(launchParams)
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
            super.onBackPressed()
        }
    }
    
    override fun onDestroy() {
        bridge?.onDestroy()
        super.onDestroy()
    }
}
