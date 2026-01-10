/**
 * NFC 模块 - 近场通信功能
 *
 * 提供 NFC 读写功能
 */

package com.aspect.webviewbridge.modules

import android.app.Activity
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import android.os.Build
import android.provider.Settings
import com.aspect.webviewbridge.protocol.BridgeError
import com.aspect.webviewbridge.protocol.BridgeModule
import com.aspect.webviewbridge.protocol.BridgeModuleContext
import com.aspect.webviewbridge.protocol.BridgeRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.nio.charset.Charset
import java.util.Locale

class NFCModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext,
    private val activityProvider: () -> Activity?
) : BridgeModule {

    override val moduleName: String = "NFC"

    override val methods: List<String> = listOf(
        "IsAvailable",
        "IsEnabled",
        "StartScan",
        "StopScan",
        "WriteTag",
        "OpenSettings"
    )

    private val nfcAdapter: NfcAdapter? by lazy {
        NfcAdapter.getDefaultAdapter(context)
    }

    private var isScanning = false
    private var isWriteMode = false
    private var pendingWriteMessage: NdefMessage? = null
    private val scope = CoroutineScope(Dispatchers.Main)

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "IsAvailable" -> isAvailable(callback)
            "IsEnabled" -> isEnabled(callback)
            "StartScan" -> startScan(request, callback)
            "StopScan" -> stopScan(callback)
            "WriteTag" -> writeTag(request, callback)
            "OpenSettings" -> openSettings(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - IsAvailable

    private fun isAvailable(): Map<String, Any> {
        val adapter = nfcAdapter
        return mapOf(
            "isAvailable" to (adapter != null),
            "ndefSupported" to (adapter != null),
            "tagSupported" to (adapter != null)
        )
    }

    // MARK: - IsEnabled

    private fun isEnabled(): Map<String, Boolean> {
        return mapOf(
            "isEnabled" to (nfcAdapter?.isEnabled == true)
        )
    }

    // MARK: - StartScan

    private fun startScan(params: JSONObject): Map<String, Any> {
        val adapter = nfcAdapter
            ?: throw BridgeError(BridgeErrorCode.FeatureDisabled, "NFC 不可用")

        if (!adapter.isEnabled) {
            throw BridgeError(BridgeErrorCode.FeatureDisabled, "NFC 未开启")
        }

        val activity = activityProvider()
            ?: throw BridgeError(BridgeErrorCode.InternalError, "无法获取 Activity")

        isWriteMode = false
        isScanning = true

        enableForegroundDispatch(activity)

        return mapOf(
            "scanning" to true,
            "message" to "NFC 扫描已启动"
        )
    }

    // MARK: - StopScan

    private fun stopScan(): Map<String, Boolean> {
        isScanning = false
        isWriteMode = false
        pendingWriteMessage = null

        activityProvider()?.let { activity ->
            try {
                nfcAdapter?.disableForegroundDispatch(activity)
            } catch (e: Exception) {
                // 忽略
            }
        }

        return mapOf("stopped" to true)
    }

    // MARK: - WriteTag

    private fun writeTag(params: JSONObject): Map<String, Any> {
        val adapter = nfcAdapter
            ?: throw BridgeError(BridgeErrorCode.FeatureDisabled, "NFC 不可用")

        if (!adapter.isEnabled) {
            throw BridgeError(BridgeErrorCode.FeatureDisabled, "NFC 未开启")
        }

        val activity = activityProvider()
            ?: throw BridgeError(BridgeErrorCode.InternalError, "无法获取 Activity")

        // 构建 NDEF 消息
        val records = mutableListOf<NdefRecord>()

        // 写入文本
        params.optString("text", "").takeIf { it.isNotEmpty() }?.let { text ->
            records.add(createTextRecord(text))
        }

        // 写入 URI
        params.optString("uri", "").takeIf { it.isNotEmpty() }?.let { uri ->
            records.add(NdefRecord.createUri(uri))
        }

        // 写入自定义记录
        params.optJSONArray("records")?.let { recordsArray ->
            for (i in 0 until recordsArray.length()) {
                val record = recordsArray.getJSONObject(i)
                createNdefRecord(record)?.let { records.add(it) }
            }
        }

        if (records.isEmpty()) {
            throw BridgeError(BridgeErrorCode.InvalidParams, "text/uri/records")
        }

        pendingWriteMessage = NdefMessage(records.toTypedArray())
        isWriteMode = true
        isScanning = true

        enableForegroundDispatch(activity)

        return mapOf(
            "ready" to true,
            "message" to "请将设备靠近 NFC 标签以写入"
        )
    }

    // MARK: - OpenSettings

    private fun openSettings(): Map<String, Boolean> {
        val intent = Intent(Settings.ACTION_NFC_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        return mapOf("opened" to true)
    }

    // MARK: - 前台调度

    private fun enableForegroundDispatch(activity: Activity) {
        val intent = Intent(activity, activity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getActivity(activity, 0, intent, flags)

        val filters = arrayOf(
            IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED).apply {
                addCategory(Intent.CATEGORY_DEFAULT)
                try {
                    addDataType("*/*")
                } catch (e: IntentFilter.MalformedMimeTypeException) {
                    throw RuntimeException(e)
                }
            },
            IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED),
            IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        )

        val techList = arrayOf(
            arrayOf(Ndef::class.java.name),
            arrayOf(NdefFormatable::class.java.name)
        )

        nfcAdapter?.enableForegroundDispatch(activity, pendingIntent, filters, techList)
    }

    // MARK: - 处理 NFC Intent

    /**
     * 在 Activity 的 onNewIntent 中调用此方法
     */
    fun handleIntent(intent: Intent) {
        if (!isScanning) return

        val action = intent.action ?: return

        when (action) {
            NfcAdapter.ACTION_NDEF_DISCOVERED,
            NfcAdapter.ACTION_TAG_DISCOVERED,
            NfcAdapter.ACTION_TECH_DISCOVERED -> {
                val tag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
                }

                tag?.let {
                    if (isWriteMode) {
                        handleWrite(it)
                    } else {
                        handleRead(it, intent)
                    }
                }
            }
        }
    }

    // MARK: - 读取

    private fun handleRead(tag: Tag, intent: Intent) {
        val ndef = Ndef.get(tag)

        if (ndef != null) {
            try {
                ndef.connect()
                val message = ndef.cachedNdefMessage ?: ndef.ndefMessage

                if (message != null) {
                    val records = parseNdefMessage(message)

                    scope.launch {
                        bridgeContext.sendEvent("NFC.TagDetected", mapOf(
                            "records" to records,
                            "capacity" to ndef.maxSize,
                            "isWritable" to ndef.isWritable
                        )))
                    }
                }
            } catch (e: Exception) {
                scope.launch {
                    bridgeContext.sendEvent("NFC.Error", mapOf(
                        "error" to (e.message ?: "读取失败")
                    )))
                }
            } finally {
                try {
                    ndef.close()
                } catch (e: Exception) {
                    // 忽略
                }
            }
        } else {
            // 尝试从 Intent 读取
            val messages = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES, NdefMessage::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)
            }

            messages?.let { msgs ->
                val allRecords = mutableListOf<Map<String, Any?>>()
                msgs.filterIsInstance<NdefMessage>().forEach { message ->
                    allRecords.addAll(parseNdefMessage(message))
                }

                scope.launch {
                    bridgeContext.sendEvent("NFC.TagDetected", mapOf(
                        "records" to allRecords
                    ))
                }
            }
        }
    }

    // MARK: - 写入

    private fun handleWrite(tag: Tag) {
        val message = pendingWriteMessage ?: return

        val ndef = Ndef.get(tag)
        if (ndef != null) {
            try {
                ndef.connect()

                if (!ndef.isWritable) {
                    sendWriteError("标签是只读的")
                    return
                }

                if (ndef.maxSize < message.byteArrayLength) {
                    sendWriteError("数据太大，超出标签容量")
                    return
                }

                ndef.writeNdefMessage(message)

                scope.launch {
                    bridgeContext.sendEvent("NFC.WriteSuccess", mapOf(
                        "success" to true,
                        "capacity" to ndef.maxSize
                    ))
                }

                // 写入成功后重置状态
                isWriteMode = false
                pendingWriteMessage = null

            } catch (e: Exception) {
                sendWriteError(e.message ?: "写入失败")
            } finally {
                try {
                    ndef.close()
                } catch (e: Exception) {
                    // 忽略
                }
            }
        } else {
            // 尝试格式化
            val formatable = NdefFormatable.get(tag)
            if (formatable != null) {
                try {
                    formatable.connect()
                    formatable.format(message)

                    scope.launch {
                        bridgeContext.sendEvent("NFC.WriteSuccess", mapOf(
                            "success" to true,
                            "formatted" to true
                        )))
                    }

                    isWriteMode = false
                    pendingWriteMessage = null

                } catch (e: Exception) {
                    sendWriteError(e.message ?: "格式化失败")
                } finally {
                    try {
                        formatable.close()
                    } catch (e: Exception) {
                        // 忽略
                    }
                }
            } else {
                sendWriteError("标签不支持 NDEF")
            }
        }
    }

    private fun sendWriteError(message: String) {
        scope.launch {
            bridgeContext.sendEvent("NFC.WriteError", mapOf(
                "success" to false,
                "error" to message
            )))
        }
    }

    // MARK: - 辅助方法

    private fun createTextRecord(text: String): NdefRecord {
        val lang = Locale.getDefault().language
        val langBytes = lang.toByteArray(Charset.forName("US-ASCII"))
        val textBytes = text.toByteArray(Charset.forName("UTF-8"))
        val payload = ByteArray(1 + langBytes.size + textBytes.size)

        payload[0] = langBytes.size.toByte()
        System.arraycopy(langBytes, 0, payload, 1, langBytes.size)
        System.arraycopy(textBytes, 0, payload, 1 + langBytes.size, textBytes.size)

        return NdefRecord(NdefRecord.TNF_WELL_KNOWN, NdefRecord.RTD_TEXT, ByteArray(0), payload)
    }

    private fun createNdefRecord(record: JSONObject): NdefRecord? {
        val tnf = when (record.optString("tnf", "wellKnown")) {
            "empty" -> NdefRecord.TNF_EMPTY
            "wellKnown" -> NdefRecord.TNF_WELL_KNOWN
            "media" -> NdefRecord.TNF_MIME_MEDIA
            "absoluteUri" -> NdefRecord.TNF_ABSOLUTE_URI
            "external" -> NdefRecord.TNF_EXTERNAL_TYPE
            else -> NdefRecord.TNF_UNKNOWN
        }

        val type = record.optString("type", "").toByteArray()
        val id = record.optString("id", "").toByteArray()
        val payload = record.optString("payload", "").toByteArray()

        return NdefRecord(tnf.toShort(), type, id, payload)
    }

    private fun parseNdefMessage(message: NdefMessage): List<Map<String, Any?>> {
        return message.records.map { record ->
            val info = mutableMapOf<String, Any?>(
                "tnf" to tnfString(record.tnf),
                "type" to String(record.type, Charset.forName("UTF-8")),
                "id" to String(record.id, Charset.forName("UTF-8")),
                "payload" to android.util.Base64.encodeToString(record.payload, android.util.Base64.NO_WRAP)
            )

            // 解析文本
            if (record.tnf == NdefRecord.TNF_WELL_KNOWN &&
                record.type.contentEquals(NdefRecord.RTD_TEXT)) {
                parseTextRecord(record)?.let { text ->
                    info["text"] = text
                }
            }

            // 解析 URI
            if (record.tnf == NdefRecord.TNF_WELL_KNOWN &&
                record.type.contentEquals(NdefRecord.RTD_URI)) {
                val uri = record.toUri()
                info["uri"] = uri?.toString()
            }

            info
        }
    }

    private fun parseTextRecord(record: NdefRecord): String? {
        val payload = record.payload
        if (payload.isEmpty()) return null

        val languageCodeLength = payload[0].toInt() and 0x3F
        if (payload.size <= languageCodeLength + 1) return null

        return String(
            payload,
            languageCodeLength + 1,
            payload.size - languageCodeLength - 1,
            Charset.forName("UTF-8")
        )
    }

    private fun tnfString(tnf: Short): String {
        return when (tnf) {
            NdefRecord.TNF_EMPTY -> "empty"
            NdefRecord.TNF_WELL_KNOWN -> "wellKnown"
            NdefRecord.TNF_MIME_MEDIA -> "media"
            NdefRecord.TNF_ABSOLUTE_URI -> "absoluteUri"
            NdefRecord.TNF_EXTERNAL_TYPE -> "external"
            NdefRecord.TNF_UNKNOWN -> "unknown"
            NdefRecord.TNF_UNCHANGED -> "unchanged"
            else -> "unknown"
        }
    }

    /**
     * 清理资源
     */
    fun cleanup() {
        stopScan()
    }
}
