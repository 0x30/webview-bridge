package com.aspect.webviewbridge.demo

import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.aspect.webviewbridge.core.WebViewBridge
import com.aspect.webviewbridge.modules.PermissionModule

/**
 * 主界面 Activity
 * 演示 WebViewBridge SDK 的使用
 */
class MainActivity : AppCompatActivity() {
    
    // Bridge 实例
    private lateinit var bridge: WebViewBridge
    
    // WebView 实例
    private lateinit var webView: WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 设置全屏沉浸式布局
        setupImmersiveMode()
        
        // 创建 WebView
        webView = WebView(this).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(webView)
        
        // 处理 WindowInsets
        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
        
        // 初始化 Bridge
        setupBridge()
        
        // 加载内容
        loadContent()
    }
    
    /**
     * 设置沉浸式模式
     */
    private fun setupImmersiveMode() {
        // 设置状态栏透明
        window.apply {
            addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            statusBarColor = android.graphics.Color.TRANSPARENT
            
            // 设置导航栏透明
            navigationBarColor = android.graphics.Color.TRANSPARENT
            
            // 设置沉浸式布局
            @Suppress("DEPRECATION")
            decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
        }
    }
    
    /**
     * 初始化 WebViewBridge
     */
    private fun setupBridge() {
        // 创建 Bridge 实例，传入 Activity 提供者用于权限请求等操作
        bridge = WebViewBridge(
            context = this,
            webView = webView,
            activityProvider = { this }
        )
        
        // 设置启动参数（可选）
        bridge.setLaunchParams(mapOf(
            "source" to "demo",
            "version" to "1.0.0"
        ))
        
        android.util.Log.d("WebViewBridgeDemo", "✅ WebViewBridge 已初始化")
    }
    
    /**
     * 加载内容
     */
    private fun loadContent() {
        // 方式一：加载本地 HTML 文件
        // 将 example/www/index.html 复制到 app/src/main/assets/www/ 目录
//        bridge.loadLocalHtml("www/index.html")
        
        // 方式二：加载远程 URL（调试用）
         webView.loadUrl("http://10.0.2.2:5173")
    }
    
    // ==================== 生命周期 ====================
    
    override fun onResume() {
        super.onResume()
        bridge.onResume()
    }
    
    override fun onPause() {
        super.onPause()
        bridge.onPause()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        bridge.onDestroy()
    }
    
    // ==================== 权限处理 ====================
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        // 将权限结果传递给 PermissionModule
        bridge.getModule(PermissionModule::class.java)
            ?.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }
    
    // ==================== 返回键处理 ====================
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // 如果 WebView 可以返回，则返回上一页
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}
