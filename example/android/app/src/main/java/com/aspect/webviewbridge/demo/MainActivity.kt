package com.aspect.webviewbridge.demo

import android.app.AlertDialog
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.aspect.webviewbridge.core.BridgeConfiguration
import com.aspect.webviewbridge.core.URLSchemeConfiguration
import com.aspect.webviewbridge.core.WebViewBridge
import com.aspect.webviewbridge.demo.modules.CustomModule
import com.aspect.webviewbridge.modules.NavigatorPageActivity
import com.aspect.webviewbridge.modules.PageStackManager
import com.aspect.webviewbridge.modules.PermissionModule
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.zip.ZipInputStream

/**
 * 加载模式枚举
 */
enum class LoadMode {
    /** 加载远程 URL */
    REMOTE_URL,
    /** 加载本地 assets 资源 */
    LOCAL_ASSETS,
    /** 下载并加载远程 ZIP 包 */
    DOWNLOAD_ZIP
}

/**
 * 主界面 Activity
 * 演示 WebViewBridge SDK 的使用
 * 
 * 支持三种加载模式：
 * 1. 远程 URL - 用于开发调试
 * 2. 本地 Assets - 用于正式发布
 * 3. 下载 ZIP - 用于热更新测试
 */
class MainActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "WebViewBridgeDemo"
        private const val PREFS_NAME = "demo_prefs"
        private const val KEY_LOAD_MODE = "load_mode"
        private const val KEY_REMOTE_URL = "remote_url"
        private const val KEY_ZIP_URL = "zip_url"
        
        // 默认 URL
        private const val DEFAULT_REMOTE_URL = "http://10.0.2.2:5173"
        private const val DEFAULT_ZIP_URL = "http://10.0.2.2:5173/web-bundle.zip"
    }
    
    // Bridge 实例
    private var bridge: WebViewBridge? = null
    
    // WebView 实例
    private lateinit var webView: WebView
    
    // 根容器
    private lateinit var rootContainer: FrameLayout
    
    // 当前加载模式
    private var currentMode: LoadMode = LoadMode.REMOTE_URL
    
    // URL 配置
    private var remoteUrl: String = DEFAULT_REMOTE_URL
    private var zipUrl: String = DEFAULT_ZIP_URL
    
    // 协程作用域
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 设置全屏沉浸式布局
        setupImmersiveMode()
        
        // 加载保存的配置
        loadPreferences()
        
        // 创建根容器
        rootContainer = FrameLayout(this)
        setContentView(rootContainer)
        
        // 显示模式选择对话框
        showModeSelectionDialog()
    }
    
    /**
     * 加载保存的配置
     */
    private fun loadPreferences() {
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        currentMode = LoadMode.entries.getOrNull(prefs.getInt(KEY_LOAD_MODE, 0)) ?: LoadMode.REMOTE_URL
        remoteUrl = prefs.getString(KEY_REMOTE_URL, DEFAULT_REMOTE_URL) ?: DEFAULT_REMOTE_URL
        zipUrl = prefs.getString(KEY_ZIP_URL, DEFAULT_ZIP_URL) ?: DEFAULT_ZIP_URL
    }
    
    /**
     * 保存配置
     */
    private fun savePreferences() {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().apply {
            putInt(KEY_LOAD_MODE, currentMode.ordinal)
            putString(KEY_REMOTE_URL, remoteUrl)
            putString(KEY_ZIP_URL, zipUrl)
            apply()
        }
    }
    
    /**
     * 显示模式选择对话框
     */
    private fun showModeSelectionDialog() {
        val modes = arrayOf(
            "🌐 远程 URL (开发调试)",
            "📦 本地 Assets (正式发布)",
            "⬇️ 下载 ZIP (热更新测试)"
        )
        
        AlertDialog.Builder(this)
            .setTitle("选择加载模式")
            .setSingleChoiceItems(modes, currentMode.ordinal) { _, which ->
                currentMode = LoadMode.entries[which]
            }
            .setPositiveButton("确定") { _, _ ->
                when (currentMode) {
                    LoadMode.REMOTE_URL -> showUrlInputDialog()
                    LoadMode.LOCAL_ASSETS -> startWithLocalAssets()
                    LoadMode.DOWNLOAD_ZIP -> showZipUrlInputDialog()
                }
            }
            .setNeutralButton("快速启动") { _, _ ->
                // 使用上次的配置快速启动
                savePreferences()
                startLoading()
            }
            .setCancelable(false)
            .show()
    }
    
    /**
     * 显示 URL 输入对话框
     */
    private fun showUrlInputDialog() {
        val input = EditText(this).apply {
            setText(remoteUrl)
            hint = "输入远程 URL"
            setPadding(48, 32, 48, 32)
        }
        
        AlertDialog.Builder(this)
            .setTitle("远程 URL")
            .setMessage("请输入开发服务器地址：")
            .setView(input)
            .setPositiveButton("加载") { _, _ ->
                remoteUrl = input.text.toString()
                savePreferences()
                startWithRemoteUrl()
            }
            .setNegativeButton("返回") { _, _ ->
                showModeSelectionDialog()
            }
            .setCancelable(false)
            .show()
    }
    
    /**
     * 显示 ZIP URL 输入对话框
     */
    private fun showZipUrlInputDialog() {
        val input = EditText(this).apply {
            setText(zipUrl)
            hint = "输入 ZIP 包 URL"
            setPadding(48, 32, 48, 32)
        }
        
        AlertDialog.Builder(this)
            .setTitle("ZIP 包地址")
            .setMessage("请输入 ZIP 包下载地址：")
            .setView(input)
            .setPositiveButton("下载并加载") { _, _ ->
                zipUrl = input.text.toString()
                savePreferences()
                startWithZipDownload()
            }
            .setNegativeButton("返回") { _, _ ->
                showModeSelectionDialog()
            }
            .setCancelable(false)
            .show()
    }
    
    /**
     * 开始加载（根据当前模式）
     */
    private fun startLoading() {
        when (currentMode) {
            LoadMode.REMOTE_URL -> startWithRemoteUrl()
            LoadMode.LOCAL_ASSETS -> startWithLocalAssets()
            LoadMode.DOWNLOAD_ZIP -> startWithZipDownload()
        }
    }
    
    /**
     * 使用远程 URL 模式启动
     */
    private fun startWithRemoteUrl() {
        setupWebView()
        setupBridge(BridgeConfiguration.DEVELOPMENT)
        webView.loadUrl(remoteUrl)
        android.util.Log.d(TAG, "✅ 加载远程 URL: $remoteUrl")
    }
    
    /**
     * 使用本地 Assets 模式启动
     */
    private fun startWithLocalAssets() {
        setupWebView()
        
        // 配置自定义 URL Scheme
        val config = BridgeConfiguration(
            debug = true,
            urlScheme = URLSchemeConfiguration(
                scheme = "app",
                host = "localhost",
                resourcePath = ""
            )
        )
        
        setupBridge(config)
        bridge?.loadLocalHtml("www/index.html")
        android.util.Log.d(TAG, "✅ 加载本地 Assets")
    }
    
    /**
     * 使用 ZIP 下载模式启动
     */
    private fun startWithZipDownload() {
        // 显示下载进度
        showDownloadProgress()
        
        scope.launch {
            try {
                // 下载并解压
                val success = downloadAndExtractZip(zipUrl)
                
                if (success) {
                    // 加载解压后的内容
                    withContext(Dispatchers.Main) {
                        hideDownloadProgress()
                        loadFromExtractedFiles()
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        hideDownloadProgress()
                        Toast.makeText(this@MainActivity, "下载失败", Toast.LENGTH_SHORT).show()
                        showModeSelectionDialog()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    hideDownloadProgress()
                    Toast.makeText(this@MainActivity, "错误: ${e.message}", Toast.LENGTH_SHORT).show()
                    showModeSelectionDialog()
                }
            }
        }
    }
    
    /**
     * 显示下载进度
     */
    private var progressView: View? = null
    
    private fun showDownloadProgress() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(android.graphics.Color.WHITE)
            
            addView(ProgressBar(context).apply {
                isIndeterminate = true
            })
            
            addView(TextView(context).apply {
                text = "正在下载资源包..."
                setPadding(0, 32, 0, 0)
            })
        }
        
        progressView = layout
        rootContainer.addView(layout, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
    }
    
    private fun hideDownloadProgress() {
        progressView?.let { rootContainer.removeView(it) }
        progressView = null
    }
    
    /**
     * 下载并解压 ZIP 文件
     */
    private suspend fun downloadAndExtractZip(url: String): Boolean = withContext(Dispatchers.IO) {
        try {
            android.util.Log.d(TAG, "开始下载: $url")
            
            // 下载目录
            val downloadDir = File(filesDir, "web_bundle")
            if (downloadDir.exists()) {
                downloadDir.deleteRecursively()
            }
            downloadDir.mkdirs()
            
            // 下载 ZIP
            val connection = URL(url).openConnection()
            connection.connectTimeout = 30000
            connection.readTimeout = 30000
            
            ZipInputStream(connection.getInputStream()).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    val file = File(downloadDir, entry.name)
                    
                    if (entry.isDirectory) {
                        file.mkdirs()
                    } else {
                        file.parentFile?.mkdirs()
                        FileOutputStream(file).use { fos ->
                            zis.copyTo(fos)
                        }
                    }
                    
                    zis.closeEntry()
                    entry = zis.nextEntry
                }
            }
            
            android.util.Log.d(TAG, "✅ 下载并解压完成: ${downloadDir.absolutePath}")
            true
        } catch (e: Exception) {
            android.util.Log.e(TAG, "下载失败: ${e.message}", e)
            false
        }
    }
    
    /**
     * 从解压的文件加载
     */
    private fun loadFromExtractedFiles() {
        setupWebView()
        
        // 配置 URL Scheme
        val urlScheme = URLSchemeConfiguration(
            scheme = "app",
            host = "localhost"
        )
        
        val config = BridgeConfiguration(
            debug = true,
            allowsHTTPLoading = true,
            urlScheme = urlScheme
        )
        
        setupBridge(config)
        
        // 设置外部资源根目录（解压后的 ZIP 目录）
        val extractedDir = File(filesDir, "web_bundle")
        val indexFile = File(extractedDir, "index.html")
        
        if (indexFile.exists()) {
            // 更新 Bridge 的外部资源目录
            bridge?.updateExternalRootDirectory(extractedDir)
            
            // 使用自定义 scheme 加载
            webView.loadUrl("app://localhost/")
            android.util.Log.d(TAG, "✅ 使用 app:// scheme 加载: ${extractedDir.absolutePath}")
        } else {
            Toast.makeText(this, "找不到 index.html", Toast.LENGTH_SHORT).show()
            showModeSelectionDialog()
        }
    }
    
    /**
     * 设置 WebView
     */
    private fun setupWebView() {
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        
        rootContainer.addView(webView)
        
        // 处理 WindowInsets
        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
    
    /**
     * 设置沉浸式模式
     */
    private fun setupImmersiveMode() {
        window.apply {
            addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            statusBarColor = android.graphics.Color.TRANSPARENT
            navigationBarColor = android.graphics.Color.TRANSPARENT
            
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
    private fun setupBridge(config: BridgeConfiguration) {
        bridge = WebViewBridge(this, webView, config)
        
        // 配置 Navigator 模块的页面 Activity
        PageStackManager.pageActivityClass = NavigatorPageActivity::class.java
        
        // 配置 WebView 配置器
        PageStackManager.webViewConfigurator = { webView ->
            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
            }
        }
        
        // 注册自定义模块
        bridge?.registerModule(CustomModule(this, bridge!!, { this }))
        
        bridge?.setLaunchParams(mapOf(
            "source" to "demo",
            "version" to "1.0.0",
            "loadMode" to currentMode.name
        ))
        
        android.util.Log.d(TAG, "✅ WebViewBridge 已初始化 (模式: ${currentMode.name})")
        android.util.Log.d(TAG, "✅ 已注册自定义模块: Custom")
    }
    
    // ==================== 生命周期 ====================
    
    override fun onResume() {
        super.onResume()
        bridge?.onResume()
    }
    
    override fun onPause() {
        super.onPause()
        bridge?.onPause()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        bridge?.onDestroy()
        scope.cancel()
    }
    
    // ==================== 权限处理 ====================
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        bridge?.getModule(PermissionModule::class.java)
            ?.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }
    
    // ==================== 返回键处理 ====================
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}
