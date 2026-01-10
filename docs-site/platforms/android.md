# Android SDK

WebView Bridge SDK 的 Android 端提供了将 Web 应用与 Android 原生能力连接的桥接功能。

## 系统要求

- Android 5.0 (API 21)+
- Kotlin 1.8+
- Android Studio Flamingo+

## 安装

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("com.aspect.webviewbridge:core:1.0.0")
}
```

### Gradle (Groovy)

```groovy
dependencies {
    implementation 'com.aspect.webviewbridge:core:1.0.0'
}
```

### Maven

```xml
<dependency>
    <groupId>com.aspect.webviewbridge</groupId>
    <artifactId>core</artifactId>
    <version>1.0.0</version>
</dependency>
```

## 快速开始

### 1. 添加权限

在 `AndroidManifest.xml` 中添加所需权限：

```xml
<!-- 网络 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- 位置 -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- 联系人 -->
<uses-permission android:name="android.permission.READ_CONTACTS" />

<!-- 相机 -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- 存储 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- 震动 -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- NFC -->
<uses-permission android:name="android.permission.NFC" />
```

### 2. 布局文件

```xml
<!-- res/layout/activity_main.xml -->
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    
    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />
        
</FrameLayout>
```

### 3. Activity 实现

```kotlin
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.aspect.webviewbridge.WebViewBridge
import com.aspect.webviewbridge.modules.*

class MainActivity : AppCompatActivity() {
    
    private lateinit var webView: WebView
    private lateinit var bridge: WebViewBridge
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        webView = findViewById(R.id.webView)
        setupWebView()
        setupBridge()
        
        webView.loadUrl("https://your-webapp.com")
    }
    
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
        }
        
        webView.webViewClient = WebViewClient()
    }
    
    private fun setupBridge() {
        bridge = WebViewBridge(webView, this)
        
        // 注册模块
        bridge.registerModule(DeviceModule(this))
        bridge.registerModule(HapticsModule(this))
        bridge.registerModule(StorageModule(this))
        bridge.registerModule(ClipboardModule(this))
        bridge.registerModule(StatusBarModule(this))
        bridge.registerModule(AppModule(this))
        bridge.registerModule(SystemModule(this))
        bridge.registerModule(PermissionModule(this) { this })
        bridge.registerModule(ContactsModule(this) { this })
        bridge.registerModule(MediaModule(this) { this })
        bridge.registerModule(LocationModule(this))
        bridge.registerModule(BiometricsModule(this))
        bridge.registerModule(NFCModule(this))
        bridge.registerModule(NetworkModule(this))
    }
    
    override fun onDestroy() {
        super.onDestroy()
        bridge.destroy()
    }
}
```

## 内置模块

| 模块 | 说明 | 权限 |
|------|------|------|
| DeviceModule | 设备信息 | - |
| HapticsModule | 触觉反馈 | VIBRATE |
| StorageModule | 本地存储 | - |
| ClipboardModule | 剪贴板 | - |
| StatusBarModule | 状态栏 | - |
| AppModule | 应用信息 | - |
| SystemModule | 系统功能 | - |
| PermissionModule | 权限管理 | - |
| ContactsModule | 联系人 | READ_CONTACTS |
| MediaModule | 相机/相册 | CAMERA, READ_EXTERNAL_STORAGE |
| LocationModule | 位置 | ACCESS_FINE_LOCATION |
| BiometricsModule | 生物识别 | USE_BIOMETRIC |
| NFCModule | NFC | NFC |
| NetworkModule | 网络状态 | ACCESS_NETWORK_STATE |

## 自定义模块

### 实现接口

```kotlin
class MyModule(private val context: Context) : BridgeModule {
    
    override val moduleName = "MyModule"
    
    override suspend fun handle(method: String, params: JSONObject): Any {
        return when (method) {
            "DoSomething" -> handleDoSomething(params)
            else -> throw IllegalArgumentException("Unknown method: $method")
        }
    }
    
    private fun handleDoSomething(params: JSONObject): JSONObject {
        val value = params.optString("value", "")
        return JSONObject().apply {
            put("result", value.uppercase())
        }
    }
}
```

### 注册模块

```kotlin
bridge.registerModule(MyModule(this))
```

## 发送事件

```kotlin
// 在模块中发送事件到 Web
bridge.dispatchEvent("MyModule.SomethingHappened", JSONObject().apply {
    put("key", "value")
})
```

## 处理权限请求

```kotlin
class MainActivity : AppCompatActivity() {
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        bridge.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        bridge.onActivityResult(requestCode, resultCode, data)
    }
}
```

## 加载本地资源

### Assets 目录

```kotlin
// 加载 assets/www/index.html
webView.loadUrl("file:///android_asset/www/index.html")
```

### 使用 WebViewAssetLoader

```kotlin
import androidx.webkit.WebViewAssetLoader

val assetLoader = WebViewAssetLoader.Builder()
    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
    .build()

webView.webViewClient = object : WebViewClient() {
    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {
        return assetLoader.shouldInterceptRequest(request.url)
    }
}

webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
```

## Jetpack Compose 集成

```kotlin
import android.webkit.WebView
import androidx.compose.runtime.*
import androidx.compose.ui.viewinterop.AndroidView
import com.aspect.webviewbridge.WebViewBridge

@Composable
fun BridgeWebView(url: String) {
    var bridge by remember { mutableStateOf<WebViewBridge?>(null) }
    val context = LocalContext.current
    
    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                
                bridge = WebViewBridge(this, context as Activity).also { b ->
                    b.registerModule(DeviceModule(ctx))
                    b.registerModule(HapticsModule(ctx))
                    // ...
                }
                
                loadUrl(url)
            }
        }
    )
    
    DisposableEffect(Unit) {
        onDispose {
            bridge?.destroy()
        }
    }
}
```

## ProGuard 配置

```proguard
# WebView Bridge
-keep class com.aspect.webviewbridge.** { *; }
-keepclassmembers class com.aspect.webviewbridge.** { *; }

# JavaScript Interface
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
```

## 调试

### 启用 WebView 调试

```kotlin
if (BuildConfig.DEBUG) {
    WebView.setWebContentsDebuggingEnabled(true)
}
```

### Chrome DevTools

1. 连接设备，启用 USB 调试
2. 在 Chrome 打开 `chrome://inspect`
3. 找到 WebView 并点击 "inspect"

### 日志

```kotlin
WebViewBridge.logLevel = LogLevel.VERBOSE
```

## 常见问题

### Q: WebView 加载空白

A: 检查网络权限和 HTTPS 配置。

### Q: JavaScript 不执行

A: 确保 `javaScriptEnabled = true`。

### Q: 无法访问相机/位置

A: 实现 `WebChromeClient.onPermissionRequest()`：

```kotlin
webView.webChromeClient = object : WebChromeClient() {
    override fun onPermissionRequest(request: PermissionRequest) {
        request.grant(request.resources)
    }
}
```

### Q: 文件选择器不工作

A: 实现 `WebChromeClient.onShowFileChooser()`。
