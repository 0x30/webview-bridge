/**
 * Clipboard 模块 - 剪贴板操作
 *
 * 提供剪贴板读写功能，支持文本、HTML 等格式
 */

package com.aspect.webviewbridge.modules

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.util.Base64
import com.aspect.webviewbridge.protocol.*

/**
 * 剪贴板内容类型
 */
enum class ClipboardContentType {
    TEXT,
    HTML,
    URL,
    IMAGE
}

/**
 * Clipboard 模块
 */
class ClipboardModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {

    override val moduleName = "Clipboard"

    override val methods = listOf(
        "Read",
        "Write",
        "HasContent",
        "Clear",
        "GetAvailableTypes"
    )

    private val clipboardManager: ClipboardManager by lazy {
        context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    }

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "Read" -> read(request, callback)
            "Write" -> write(request, callback)
            "HasContent" -> hasContent(request, callback)
            "Clear" -> clear(callback)
            "GetAvailableTypes" -> getAvailableTypes(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - Read

    private fun read(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val typeString = request.getString("type") ?: "text"
        val type = try {
            ClipboardContentType.valueOf(typeString.uppercase())
        } catch (e: Exception) {
            ClipboardContentType.TEXT
        }

        val clipData = clipboardManager.primaryClip

        if (clipData == null || clipData.itemCount == 0) {
            callback(
                Result.success(
                    mapOf(
                        "type" to typeString,
                        "content" to null
                    )
                )
            )
            return
        }

        val item = clipData.getItemAt(0)

        when (type) {
            ClipboardContentType.TEXT -> {
                val text = item.text?.toString()
                callback(
                    Result.success(
                        mapOf(
                            "type" to "text",
                            "content" to text
                        )
                    )
                )
            }

            ClipboardContentType.HTML -> {
                val html = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                    item.htmlText ?: item.text?.toString()
                } else {
                    item.text?.toString()
                }
                callback(
                    Result.success(
                        mapOf(
                            "type" to "html",
                            "content" to html
                        )
                    )
                )
            }

            ClipboardContentType.URL -> {
                val uri = item.uri?.toString() ?: item.text?.toString()
                callback(
                    Result.success(
                        mapOf(
                            "type" to "url",
                            "content" to uri
                        )
                    )
                )
            }

            ClipboardContentType.IMAGE -> {
                // Android 剪贴板图片处理较复杂，需要 ContentResolver
                val uri = item.uri
                if (uri != null) {
                    try {
                        context.contentResolver.openInputStream(uri)?.use { stream ->
                            val bytes = stream.readBytes()
                            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                            callback(
                                Result.success(
                                    mapOf(
                                        "type" to "image",
                                        "content" to "data:image/png;base64,$base64"
                                    )
                                )
                            )
                        } ?: run {
                            callback(
                                Result.success(
                                    mapOf(
                                        "type" to "image",
                                        "content" to null
                                    )
                                )
                            )
                        }
                    } catch (e: Exception) {
                        callback(
                            Result.success(
                                mapOf(
                                    "type" to "image",
                                    "content" to null
                                )
                            )
                        )
                    }
                } else {
                    callback(
                        Result.success(
                            mapOf(
                                "type" to "image",
                                "content" to null
                            )
                        )
                    )
                }
            }
        }
    }

    // MARK: - Write

    private fun write(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val typeString = request.getString("type") ?: "text"
        val content = request.getString("content")

        if (content == null) {
            callback(Result.failure(BridgeError.invalidParams("content")))
            return
        }

        val type = try {
            ClipboardContentType.valueOf(typeString.uppercase())
        } catch (e: Exception) {
            ClipboardContentType.TEXT
        }

        try {
            val clip = when (type) {
                ClipboardContentType.TEXT -> {
                    ClipData.newPlainText("text", content)
                }

                ClipboardContentType.HTML -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                        ClipData.newHtmlText("html", stripHtml(content), content)
                    } else {
                        ClipData.newPlainText("html", content)
                    }
                }

                ClipboardContentType.URL -> {
                    ClipData.newPlainText("url", content)
                }

                ClipboardContentType.IMAGE -> {
                    // 图片写入需要 ContentProvider，这里简化处理
                    callback(Result.failure(BridgeError.notSupported("图片写入暂不支持")))
                    return
                }
            }

            clipboardManager.setPrimaryClip(clip)
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }

    // MARK: - HasContent

    private fun hasContent(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val typeString = request.getString("type") ?: "text"

        val hasContent = clipboardManager.hasPrimaryClip() &&
                clipboardManager.primaryClip?.itemCount ?: 0 > 0

        callback(
            Result.success(
                mapOf(
                    "type" to typeString,
                    "hasContent" to hasContent
                )
            )
        )
    }

    // MARK: - Clear

    private fun clear(callback: (Result<Any?>) -> Unit) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                clipboardManager.clearPrimaryClip()
            } else {
                clipboardManager.setPrimaryClip(ClipData.newPlainText("", ""))
            }
            callback(Result.success(null))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError(e.message)))
        }
    }

    // MARK: - GetAvailableTypes

    private fun getAvailableTypes(callback: (Result<Any?>) -> Unit) {
        val types = mutableListOf<String>()

        val clipData = clipboardManager.primaryClip
        if (clipData != null && clipData.itemCount > 0) {
            val description = clipData.description

            // 检查 MIME 类型
            for (i in 0 until description.mimeTypeCount) {
                when {
                    description.getMimeType(i).startsWith("text/html") -> {
                        if (!types.contains("html")) types.add("html")
                    }

                    description.getMimeType(i).startsWith("text/") -> {
                        if (!types.contains("text")) types.add("text")
                    }

                    description.getMimeType(i).startsWith("image/") -> {
                        if (!types.contains("image")) types.add("image")
                    }
                }
            }

            // 检查 URI
            val item = clipData.getItemAt(0)
            if (item.uri != null && !types.contains("url")) {
                types.add("url")
            }

            // 确保至少有 text
            if (item.text != null && !types.contains("text")) {
                types.add("text")
            }
        }

        callback(
            Result.success(
                mapOf(
                    "types" to types,
                    "isEmpty" to types.isEmpty()
                )
            )
        )
    }

    // MARK: - 辅助方法

    private fun stripHtml(html: String): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            android.text.Html.fromHtml(html, android.text.Html.FROM_HTML_MODE_LEGACY).toString()
        } else {
            @Suppress("DEPRECATION")
            android.text.Html.fromHtml(html).toString()
        }
    }
}
