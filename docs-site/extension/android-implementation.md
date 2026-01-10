# Android 模块实现

本文档详细介绍如何使用 Kotlin 实现 Android 端的 Bridge 模块。

## 模块接口

所有 Android 模块都需要实现 `BridgeModule` 接口：

```kotlin
interface BridgeModule {
    /** 模块名称，用于路由请求 */
    val moduleName: String
    
    /** 处理来自 Web 的请求 */
    suspend fun handle(method: String, params: JSONObject): Any
}
```

## 基本结构

```kotlin
package com.aspect.webviewbridge.modules

import android.content.Context
import org.json.JSONObject

class MyModule(private val context: Context) : BridgeModule {
    
    override val moduleName = "MyModule"
    
    override suspend fun handle(method: String, params: JSONObject): Any {
        return when (method) {
            "MethodA" -> handleMethodA(params)
            "MethodB" -> handleMethodB(params)
            else -> throw IllegalArgumentException("Unknown method: $method")
        }
    }
    
    // ==========================================================================
    // Private Methods
    // ==========================================================================
    
    private fun handleMethodA(params: JSONObject): JSONObject {
        return JSONObject().apply {
            put("result", "success")
        }
    }
    
    private suspend fun handleMethodB(params: JSONObject): JSONObject {
        // 可以使用协程进行异步操作
        return JSONObject().apply {
            put("value", 123)
        }
    }
}
```

## 参数解析

### 基本类型

```kotlin
private fun handleExample(params: JSONObject): JSONObject {
    // String
    val name = params.optString("name", "")
    
    // Int
    val count = params.optInt("count", 0)
    
    // Double
    val value = params.optDouble("value", 0.0)
    
    // Boolean
    val enabled = params.optBoolean("enabled", false)
    
    // Optional - 检查是否存在
    if (params.has("optional")) {
        val optional = params.getString("optional")
    }
    
    return JSONObject().put("ok", true)
}
```

### 数组

```kotlin
// JSONArray
val items = params.optJSONArray("items")
val itemList = mutableListOf<String>()
if (items != null) {
    for (i in 0 until items.length()) {
        itemList.add(items.getString(i))
    }
}

// 或者使用扩展函数
fun JSONArray.toStringList(): List<String> {
    return (0 until length()).map { getString(it) }
}
```

### 嵌套对象

```kotlin
val options = params.optJSONObject("options") ?: JSONObject()
val nested = options.optJSONObject("nested") ?: JSONObject()
val nestedValue = nested.optString("key", "default")
```

### 必需参数验证

```kotlin
private fun handleWithRequired(params: JSONObject): JSONObject {
    if (!params.has("id")) {
        throw IllegalArgumentException("缺少必需参数 'id'")
    }
    val id = params.getString("id")
    
    val count = params.optInt("count", -1)
    if (count <= 0) {
        throw IllegalArgumentException("'count' 必须是正整数")
    }
    
    // 继续处理...
}
```

## 返回值

### 返回 JSONObject

```kotlin
return JSONObject().apply {
    put("id", "123")
    put("name", "John")
    put("age", 25)
    put("active", true)
}
```

### 返回数组

```kotlin
val items = JSONArray().apply {
    put(JSONObject().apply {
        put("id", "1")
        put("name", "Item 1")
    })
    put(JSONObject().apply {
        put("id", "2")
        put("name", "Item 2")
    })
}

return JSONObject().put("items", items)
```

### 使用数据类

```kotlin
// 定义数据类
data class User(
    val id: String,
    val name: String,
    val age: Int
)

// 转换为 JSONObject
fun User.toJSON(): JSONObject {
    return JSONObject().apply {
        put("id", id)
        put("name", name)
        put("age", age)
    }
}

// 使用
private fun handleGetUser(params: JSONObject): JSONObject {
    val user = User("123", "John", 25)
    return user.toJSON()
}
```

## 错误处理

### 定义错误

```kotlin
sealed class BridgeError(message: String) : Exception(message) {
    val code: Int
        get() = when (this) {
            is MethodNotFound -> -3
            is InvalidParams -> -4
            is PermissionDenied -> -6
            is NotSupported -> -3
            is InternalError -> -8
        }
    
    class MethodNotFound(method: String) : BridgeError("方法不存在: $method")
    class InvalidParams(msg: String) : BridgeError("参数无效: $msg")
    class PermissionDenied(msg: String) : BridgeError("权限被拒绝: $msg")
    class NotSupported(msg: String) : BridgeError("不支持: $msg")
    class InternalError(msg: String) : BridgeError("内部错误: $msg")
}
```

### 抛出错误

```kotlin
override suspend fun handle(method: String, params: JSONObject): Any {
    return when (method) {
        "MyMethod" -> handleMyMethod(params)
        else -> throw BridgeError.MethodNotFound(method)
    }
}

private fun handleMyMethod(params: JSONObject): JSONObject {
    if (!params.has("required")) {
        throw BridgeError.InvalidParams("缺少 'required' 参数")
    }
    // ...
}
```

## 异步操作

### 使用协程

```kotlin
private suspend fun handleAsync(params: JSONObject): JSONObject {
    return withContext(Dispatchers.IO) {
        // 在 IO 线程执行耗时操作
        val result = heavyComputation()
        
        JSONObject().put("result", result)
    }
}

private suspend fun handleMultipleAsync(params: JSONObject): JSONObject {
    return coroutineScope {
        // 并行执行多个操作
        val result1 = async { fetchData1() }
        val result2 = async { fetchData2() }
        
        JSONObject().apply {
            put("data1", result1.await())
            put("data2", result2.await())
        }
    }
}
```

### 超时处理

```kotlin
private suspend fun handleWithTimeout(params: JSONObject): JSONObject {
    return withTimeout(5000) {
        // 5 秒超时
        val result = longRunningOperation()
        JSONObject().put("result", result)
    }
}
```

## 权限处理

### 检查权限

```kotlin
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

private fun hasPermission(permission: String): Boolean {
    return ContextCompat.checkSelfPermission(context, permission) == 
           PackageManager.PERMISSION_GRANTED
}

private fun handleCheckPermission(params: JSONObject): JSONObject {
    val permission = params.getString("permission")
    val androidPermission = mapToAndroidPermission(permission)
    
    return JSONObject().apply {
        put("granted", hasPermission(androidPermission))
    }
}

private fun mapToAndroidPermission(type: String): String {
    return when (type) {
        "camera" -> Manifest.permission.CAMERA
        "location" -> Manifest.permission.ACCESS_FINE_LOCATION
        "contacts" -> Manifest.permission.READ_CONTACTS
        "storage" -> Manifest.permission.READ_EXTERNAL_STORAGE
        else -> throw BridgeError.InvalidParams("未知权限类型: $type")
    }
}
```

### 请求权限

```kotlin
class PermissionModule(
    private val context: Context,
    private val activityProvider: () -> Activity?
) : BridgeModule {
    
    private var pendingPermissionCallback: ((Boolean) -> Unit)? = null
    
    private suspend fun requestPermission(permission: String): Boolean {
        val activity = activityProvider() 
            ?: throw BridgeError.InternalError("无法获取 Activity")
        
        return suspendCancellableCoroutine { continuation ->
            pendingPermissionCallback = { granted ->
                continuation.resume(granted)
            }
            
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(permission),
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    // 在 Activity 中调用
    fun onRequestPermissionsResult(granted: Boolean) {
        pendingPermissionCallback?.invoke(granted)
        pendingPermissionCallback = null
    }
    
    companion object {
        const val PERMISSION_REQUEST_CODE = 1001
    }
}
```

## 发送事件

```kotlin
class MyModule(
    private val context: Context,
    private val bridge: WebViewBridge
) : BridgeModule {
    
    // 发送事件到 Web
    private fun sendEvent(eventName: String, data: JSONObject) {
        bridge.dispatchEvent("MyModule.$eventName", data)
    }
    
    // 示例：监听广播并发送事件
    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            sendEvent("StatusChanged", JSONObject().apply {
                put("newStatus", "active")
            })
        }
    }
    
    fun register() {
        context.registerReceiver(receiver, IntentFilter("ACTION_STATUS_CHANGED"))
    }
    
    fun unregister() {
        context.unregisterReceiver(receiver)
    }
}
```

## 模块注册

```kotlin
class MainActivity : AppCompatActivity() {
    
    private lateinit var bridge: WebViewBridge
    private lateinit var webView: WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        webView = findViewById(R.id.webView)
        
        // 配置 WebView
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }
        
        // 创建 Bridge
        bridge = WebViewBridge(webView, this)
        
        // 注册模块
        bridge.registerModule(DeviceModule(this))
        bridge.registerModule(HapticsModule(this))
        bridge.registerModule(MyModule(this, bridge))
        
        // 加载页面
        webView.loadUrl("https://example.com")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        bridge.destroy()
    }
}
```

## 完整示例

```kotlin
package com.aspect.webviewbridge.modules

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class FlashlightModule(private val context: Context) : BridgeModule {
    
    override val moduleName = "Flashlight"
    
    private val cameraManager: CameraManager by lazy {
        context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    }
    
    private var cameraId: String? = null
    private var isOn = false
    
    init {
        cameraId = cameraManager.cameraIdList.firstOrNull { id ->
            cameraManager.getCameraCharacteristics(id)
                .get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        }
    }
    
    override suspend fun handle(method: String, params: JSONObject): Any {
        return when (method) {
            "IsAvailable" -> handleIsAvailable()
            "TurnOn" -> handleTurnOn(params)
            "TurnOff" -> handleTurnOff()
            "GetStatus" -> handleGetStatus()
            else -> throw BridgeError.MethodNotFound(method)
        }
    }
    
    private fun handleIsAvailable(): JSONObject {
        return JSONObject().apply {
            put("isAvailable", cameraId != null)
        }
    }
    
    private suspend fun handleTurnOn(params: JSONObject): JSONObject {
        return withContext(Dispatchers.Main) {
            val cameraId = this@FlashlightModule.cameraId
                ?: return@withContext JSONObject().put("success", false)
            
            try {
                cameraManager.setTorchMode(cameraId, true)
                isOn = true
                JSONObject().put("success", true)
            } catch (e: Exception) {
                JSONObject().put("success", false)
            }
        }
    }
    
    private suspend fun handleTurnOff(): JSONObject {
        return withContext(Dispatchers.Main) {
            val cameraId = this@FlashlightModule.cameraId
                ?: return@withContext JSONObject().put("success", false)
            
            try {
                cameraManager.setTorchMode(cameraId, false)
                isOn = false
                JSONObject().put("success", true)
            } catch (e: Exception) {
                JSONObject().put("success", false)
            }
        }
    }
    
    private fun handleGetStatus(): JSONObject {
        return JSONObject().apply {
            put("isOn", isOn)
            put("level", if (isOn) 1.0 else 0.0)
        }
    }
}
```
