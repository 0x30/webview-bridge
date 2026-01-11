/**
 * Custom 模块 - 自定义模块示例
 *
 * 演示如何创建自定义原生模块，供开发者参考
 * 包含 Alert、Confirm、Prompt、Toast 等常见 UI 交互方法
 */

package com.aspect.webviewbridge.demo.modules

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.widget.EditText
import android.widget.Toast
import com.aspect.webviewbridge.protocol.*

/**
 * 自定义模块 - 演示原生 UI 交互
 * 
 * 此模块展示如何创建自定义模块，包含：
 * - Alert: 显示原生警告框
 * - Confirm: 显示确认对话框
 * - Prompt: 显示输入对话框  
 * - Toast: 显示 Toast 消息
 * - Loading: 显示/隐藏加载指示器
 */
class CustomModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext,
    private val activityProvider: () -> Activity?
) : BridgeModule {

    override val moduleName = "Custom"

    override val methods = listOf(
        "Alert",
        "Confirm",
        "Prompt",
        "Toast",
        "ShowLoading",
        "HideLoading",
        "ActionSheet"
    )
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // 加载对话框
    private var loadingDialog: AlertDialog? = null

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "Alert" -> showAlert(request, callback)
            "Confirm" -> showConfirm(request, callback)
            "Prompt" -> showPrompt(request, callback)
            "Toast" -> showToast(request, callback)
            "ShowLoading" -> showLoading(request, callback)
            "HideLoading" -> hideLoading(callback)
            "ActionSheet" -> showActionSheet(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - Alert
    
    /**
     * 显示原生警告框
     * 
     * 参数：
     * - title: 标题
     * - message: 消息内容
     * - buttonText: 按钮文字（默认"确定"）
     */
    private fun showAlert(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val title = request.getString("title") ?: ""
        val message = request.getString("message") ?: ""
        val buttonText = request.getString("buttonText") ?: "确定"
        
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        mainHandler.post {
            try {
                AlertDialog.Builder(activity)
                    .setTitle(title)
                    .setMessage(message)
                    .setPositiveButton(buttonText) { dialog, _ ->
                        dialog.dismiss()
                        callback(Result.success(mapOf("action" to "confirm")))
                    }
                    .setCancelable(false)
                    .show()
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message)))
            }
        }
    }

    // MARK: - Confirm
    
    /**
     * 显示确认对话框
     * 
     * 参数：
     * - title: 标题
     * - message: 消息内容
     * - confirmText: 确认按钮文字（默认"确定"）
     * - cancelText: 取消按钮文字（默认"取消"）
     * 
     * 返回：
     * - confirmed: 是否点击了确认
     */
    private fun showConfirm(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val title = request.getString("title") ?: ""
        val message = request.getString("message") ?: ""
        val confirmText = request.getString("confirmText") ?: "确定"
        val cancelText = request.getString("cancelText") ?: "取消"
        
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        mainHandler.post {
            try {
                AlertDialog.Builder(activity)
                    .setTitle(title)
                    .setMessage(message)
                    .setPositiveButton(confirmText) { dialog, _ ->
                        dialog.dismiss()
                        callback(Result.success(mapOf(
                            "confirmed" to true,
                            "action" to "confirm"
                        )))
                    }
                    .setNegativeButton(cancelText) { dialog, _ ->
                        dialog.dismiss()
                        callback(Result.success(mapOf(
                            "confirmed" to false,
                            "action" to "cancel"
                        )))
                    }
                    .setCancelable(false)
                    .show()
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message)))
            }
        }
    }

    // MARK: - Prompt
    
    /**
     * 显示输入对话框
     * 
     * 参数：
     * - title: 标题
     * - message: 消息内容
     * - placeholder: 输入框占位符
     * - defaultValue: 默认值
     * - confirmText: 确认按钮文字
     * - cancelText: 取消按钮文字
     * 
     * 返回：
     * - confirmed: 是否点击了确认
     * - value: 输入的值（仅确认时有值）
     */
    private fun showPrompt(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val title = request.getString("title") ?: ""
        val message = request.getString("message") ?: ""
        val placeholder = request.getString("placeholder") ?: ""
        val defaultValue = request.getString("defaultValue") ?: ""
        val confirmText = request.getString("confirmText") ?: "确定"
        val cancelText = request.getString("cancelText") ?: "取消"
        
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        mainHandler.post {
            try {
                val input = EditText(activity).apply {
                    hint = placeholder
                    setText(defaultValue)
                    setPadding(48, 32, 48, 32)
                }
                
                AlertDialog.Builder(activity)
                    .setTitle(title)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton(confirmText) { dialog, _ ->
                        dialog.dismiss()
                        callback(Result.success(mapOf(
                            "confirmed" to true,
                            "action" to "confirm",
                            "value" to input.text.toString()
                        )))
                    }
                    .setNegativeButton(cancelText) { dialog, _ ->
                        dialog.dismiss()
                        callback(Result.success(mapOf(
                            "confirmed" to false,
                            "action" to "cancel",
                            "value" to null
                        )))
                    }
                    .setCancelable(false)
                    .show()
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message)))
            }
        }
    }

    // MARK: - Toast
    
    /**
     * 显示 Toast 消息
     * 
     * 参数：
     * - message: 消息内容
     * - duration: 显示时长 "short" | "long"
     */
    private fun showToast(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val message = request.getString("message") ?: ""
        val duration = request.getString("duration") ?: "short"
        
        val toastDuration = if (duration == "long") Toast.LENGTH_LONG else Toast.LENGTH_SHORT
        
        mainHandler.post {
            Toast.makeText(context, message, toastDuration).show()
        }
        
        callback(Result.success(null))
    }

    // MARK: - ShowLoading
    
    /**
     * 显示加载指示器
     * 
     * 参数：
     * - message: 加载提示文字（默认"加载中..."）
     */
    private fun showLoading(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val message = request.getString("message") ?: "加载中..."
        
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        mainHandler.post {
            try {
                // 先关闭现有的
                loadingDialog?.dismiss()
                
                loadingDialog = AlertDialog.Builder(activity)
                    .setMessage(message)
                    .setCancelable(false)
                    .create()
                
                loadingDialog?.show()
                callback(Result.success(null))
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message)))
            }
        }
    }

    // MARK: - HideLoading
    
    /**
     * 隐藏加载指示器
     */
    private fun hideLoading(callback: (Result<Any?>) -> Unit) {
        mainHandler.post {
            loadingDialog?.dismiss()
            loadingDialog = null
        }
        callback(Result.success(null))
    }

    // MARK: - ActionSheet
    
    /**
     * 显示操作表
     * 
     * 参数：
     * - title: 标题（可选）
     * - options: 选项数组
     * - cancelText: 取消按钮文字（默认"取消"）
     * 
     * 返回：
     * - index: 选中的索引（取消时为 -1）
     * - option: 选中的选项文字
     */
    private fun showActionSheet(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val title = request.getString("title")
        val options = request.getStringArray("options") ?: emptyList()
        val cancelText = request.getString("cancelText") ?: "取消"
        
        if (options.isEmpty()) {
            callback(Result.failure(BridgeError.invalidParams("options 不能为空")))
            return
        }
        
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        mainHandler.post {
            try {
                val builder = AlertDialog.Builder(activity)
                
                if (!title.isNullOrEmpty()) {
                    builder.setTitle(title)
                }
                
                builder.setItems(options.toTypedArray()) { dialog, which ->
                    dialog.dismiss()
                    callback(Result.success(mapOf(
                        "index" to which,
                        "option" to options[which],
                        "cancelled" to false
                    )))
                }
                
                builder.setNegativeButton(cancelText) { dialog, _ ->
                    dialog.dismiss()
                    callback(Result.success(mapOf(
                        "index" to -1,
                        "option" to null,
                        "cancelled" to true
                    )))
                }
                
                builder.show()
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message)))
            }
        }
    }
}
