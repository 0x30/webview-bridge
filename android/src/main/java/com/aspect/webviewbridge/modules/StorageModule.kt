/**
 * Storage 模块 - 安全存储
 *
 * 提供 SharedPreferences 和 EncryptedSharedPreferences 存储功能
 */

package com.aspect.webviewbridge.modules

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.aspect.webviewbridge.protocol.*

/**
 * 存储安全级别
 */
enum class StorageSecurityLevel {
    STANDARD,   // SharedPreferences
    SECURE      // EncryptedSharedPreferences
}

/**
 * Storage 模块
 */
class StorageModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "Storage"
    
    override val methods = listOf(
        "Get",
        "Set",
        "Remove",
        "Clear",
        "GetKeys",
        "Has",
        "GetMultiple",
        "SetMultiple",
        "GetSize"
    )
    
    companion object {
        private const val STANDARD_PREFS_NAME = "webview_bridge_storage"
        private const val SECURE_PREFS_NAME = "webview_bridge_secure_storage"
        private const val KEY_PREFIX = "wb_"
    }
    
    // 标准存储
    private val standardPrefs: SharedPreferences by lazy {
        context.getSharedPreferences(STANDARD_PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    // 加密存储
    private val securePrefs: SharedPreferences? by lazy {
        createEncryptedPrefs()
    }
    
    private fun createEncryptedPrefs(): SharedPreferences? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val spec = KeyGenParameterSpec.Builder(
                    MasterKey.DEFAULT_MASTER_KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build()
                
                val masterKey = MasterKey.Builder(context)
                    .setKeyGenParameterSpec(spec)
                    .build()
                
                EncryptedSharedPreferences.create(
                    context,
                    SECURE_PREFS_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
            } else {
                // API 23 以下不支持加密存储，使用标准存储
                context.getSharedPreferences(SECURE_PREFS_NAME, Context.MODE_PRIVATE)
            }
        } catch (e: Exception) {
            // 回退到标准存储
            context.getSharedPreferences(SECURE_PREFS_NAME, Context.MODE_PRIVATE)
        }
    }
    
    private fun getPrefs(securityLevel: StorageSecurityLevel): SharedPreferences {
        return when (securityLevel) {
            StorageSecurityLevel.STANDARD -> standardPrefs
            StorageSecurityLevel.SECURE -> securePrefs ?: standardPrefs
        }
    }
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "Get" -> get(request, callback)
            "Set" -> set(request, callback)
            "Remove" -> remove(request, callback)
            "Clear" -> clear(request, callback)
            "GetKeys" -> getKeys(request, callback)
            "Has" -> has(request, callback)
            "GetMultiple" -> getMultiple(request, callback)
            "SetMultiple" -> setMultiple(request, callback)
            "GetSize" -> getSize(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - Get
    
    private fun get(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val key = request.getString("key")
        if (key == null) {
            callback(Result.failure(BridgeError.invalidParams("key")))
            return
        }
        
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        val fullKey = KEY_PREFIX + key
        
        val value = prefs.getString(fullKey, null)
        
        callback(Result.success(mapOf(
            "key" to key,
            "value" to value
        )))
    }
    
    // MARK: - Set
    
    private fun set(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val key = request.getString("key")
        if (key == null) {
            callback(Result.failure(BridgeError.invalidParams("key")))
            return
        }
        
        val value = request.getString("value")
        if (value == null) {
            callback(Result.failure(BridgeError.invalidParams("value")))
            return
        }
        
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        val fullKey = KEY_PREFIX + key
        
        try {
            prefs.edit().putString(fullKey, value).apply()
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - Remove
    
    private fun remove(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val key = request.getString("key")
        if (key == null) {
            callback(Result.failure(BridgeError.invalidParams("key")))
            return
        }
        
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        val fullKey = KEY_PREFIX + key
        
        try {
            prefs.edit().remove(fullKey).apply()
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - Clear
    
    private fun clear(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        
        try {
            val allKeys = prefs.all.keys.filter { it.startsWith(KEY_PREFIX) }
            val editor = prefs.edit()
            allKeys.forEach { editor.remove(it) }
            editor.apply()
            
            callback(Result.success(mapOf(
                "clearedCount" to allKeys.size
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - GetKeys
    
    private fun getKeys(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        
        val keys = prefs.all.keys
            .filter { it.startsWith(KEY_PREFIX) }
            .map { it.removePrefix(KEY_PREFIX) }
        
        callback(Result.success(mapOf(
            "keys" to keys
        )))
    }
    
    // MARK: - Has
    
    private fun has(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val key = request.getString("key")
        if (key == null) {
            callback(Result.failure(BridgeError.invalidParams("key")))
            return
        }
        
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        val fullKey = KEY_PREFIX + key
        
        val exists = prefs.contains(fullKey)
        
        callback(Result.success(mapOf(
            "key" to key,
            "exists" to exists
        )))
    }
    
    // MARK: - GetMultiple
    
    private fun getMultiple(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val keys = request.getStringArray("keys")
        if (keys.isNullOrEmpty()) {
            callback(Result.failure(BridgeError.invalidParams("keys")))
            return
        }
        
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        
        val values = mutableMapOf<String, Any?>()
        for (key in keys) {
            val fullKey = KEY_PREFIX + key
            values[key] = prefs.getString(fullKey, null)
        }
        
        callback(Result.success(mapOf(
            "values" to values
        )))
    }
    
    // MARK: - SetMultiple
    
    private fun setMultiple(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val items = request.getObject("items")
        if (items == null || items.size() == 0) {
            callback(Result.failure(BridgeError.invalidParams("items")))
            return
        }
        
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        
        try {
            val editor = prefs.edit()
            var successCount = 0
            val failedKeys = mutableListOf<String>()
            
            for (key in items.keySet()) {
                val value = items.get(key)?.takeIf { !it.isJsonNull }?.asString
                val fullKey = KEY_PREFIX + key
                
                if (value != null) {
                    editor.putString(fullKey, value)
                    successCount++
                } else {
                    failedKeys.add(key)
                }
            }
            
            editor.apply()
            
            callback(Result.success(mapOf(
                "successCount" to successCount,
                "failedKeys" to failedKeys
            )))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }
    
    // MARK: - GetSize
    
    private fun getSize(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val securityLevel = parseSecurityLevel(request.getString("securityLevel"))
        val prefs = getPrefs(securityLevel)
        
        var totalBytes = 0
        for ((key, value) in prefs.all) {
            if (key.startsWith(KEY_PREFIX)) {
                totalBytes += key.toByteArray().size
                if (value is String) {
                    totalBytes += value.toByteArray().size
                }
            }
        }
        
        callback(Result.success(mapOf(
            "bytes" to totalBytes,
            "formatted" to formatBytes(totalBytes)
        )))
    }
    
    // MARK: - 辅助方法
    
    private fun parseSecurityLevel(value: String?): StorageSecurityLevel {
        return when (value?.lowercase()) {
            "secure" -> StorageSecurityLevel.SECURE
            else -> StorageSecurityLevel.STANDARD
        }
    }
    
    private fun formatBytes(bytes: Int): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> String.format("%.2f KB", bytes / 1024.0)
            bytes < 1024 * 1024 * 1024 -> String.format("%.2f MB", bytes / (1024.0 * 1024.0))
            else -> String.format("%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0))
        }
    }
}
