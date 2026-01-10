/**
 * Network 模块 - 网络状态监控
 *
 * 提供网络连接状态检查和监听功能
 */

package com.aspect.webviewbridge.modules

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.telephony.TelephonyManager
import com.aspect.webviewbridge.core.BridgeError
import com.aspect.webviewbridge.core.BridgeErrorCode
import com.aspect.webviewbridge.core.BridgeEvent
import com.aspect.webviewbridge.core.BridgeModule
import com.aspect.webviewbridge.core.WebViewBridge
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class NetworkModule(
    private val context: Context,
    private val bridge: WebViewBridge
) : BridgeModule {

    override val moduleName: String = "Network"

    override val methods: List<String> = listOf(
        "GetStatus",
        "StartMonitoring",
        "StopMonitoring"
    )

    private val connectivityManager: ConnectivityManager by lazy {
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var isMonitoring = false
    private val scope = CoroutineScope(Dispatchers.Main)

    override suspend fun handleRequest(
        method: String,
        params: JSONObject
    ): Any? {
        return when (method) {
            "GetStatus" -> getStatus()
            "StartMonitoring" -> startMonitoring()
            "StopMonitoring" -> stopMonitoring()
            else -> throw BridgeError(BridgeErrorCode.MethodNotFound, "$moduleName.$method")
        }
    }

    // MARK: - GetStatus

    private fun getStatus(): Map<String, Any> {
        return getCurrentNetworkStatus()
    }

    // MARK: - StartMonitoring

    private fun startMonitoring(): Map<String, Any> {
        if (isMonitoring) {
            return mapOf("monitoring" to true, "message" to "已在监听中")
        }

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                sendNetworkStatus()
            }

            override fun onLost(network: Network) {
                sendNetworkStatus()
            }

            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                sendNetworkStatus()
            }

            override fun onLinkPropertiesChanged(
                network: Network,
                linkProperties: android.net.LinkProperties
            ) {
                sendNetworkStatus()
            }
        }

        networkCallback = callback

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            connectivityManager.registerDefaultNetworkCallback(callback)
        } else {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            connectivityManager.registerNetworkCallback(request, callback)
        }

        isMonitoring = true
        return mapOf("monitoring" to true)
    }

    // MARK: - StopMonitoring

    private fun stopMonitoring(): Map<String, Boolean> {
        networkCallback?.let {
            try {
                connectivityManager.unregisterNetworkCallback(it)
            } catch (e: Exception) {
                // 忽略
            }
        }
        networkCallback = null
        isMonitoring = false

        return mapOf("monitoring" to false)
    }

    // MARK: - 辅助方法

    private fun getCurrentNetworkStatus(): Map<String, Any> {
        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = activeNetwork?.let {
            connectivityManager.getNetworkCapabilities(it)
        }

        val isConnected = capabilities != null
        var connectionType = "none"
        var isMetered = false
        var isNotRestricted = false

        if (capabilities != null) {
            isMetered = !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
            isNotRestricted = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_RESTRICTED)

            connectionType = when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "bluetooth"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "vpn"
                else -> "other"
            }
        }

        val result = mutableMapOf<String, Any>(
            "isConnected" to isConnected,
            "type" to connectionType,
            "isExpensive" to isMetered,
            "isConstrained" to !isNotRestricted
        )

        // 获取蜂窝网络详情
        if (connectionType == "cellular") {
            result["cellularType"] = getCellularType()
        }

        // 添加带宽信息（如果可用）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && capabilities != null) {
            val downstreamBandwidth = capabilities.linkDownstreamBandwidthKbps
            val upstreamBandwidth = capabilities.linkUpstreamBandwidthKbps
            result["downstreamBandwidthKbps"] = downstreamBandwidth
            result["upstreamBandwidthKbps"] = upstreamBandwidth
        }

        return result
    }

    private fun getCellularType(): String {
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            ?: return "unknown"

        return when (telephonyManager.dataNetworkType) {
            TelephonyManager.NETWORK_TYPE_GPRS,
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_CDMA,
            TelephonyManager.NETWORK_TYPE_1xRTT,
            TelephonyManager.NETWORK_TYPE_IDEN -> "2g"

            TelephonyManager.NETWORK_TYPE_UMTS,
            TelephonyManager.NETWORK_TYPE_EVDO_0,
            TelephonyManager.NETWORK_TYPE_EVDO_A,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSPA,
            TelephonyManager.NETWORK_TYPE_EVDO_B,
            TelephonyManager.NETWORK_TYPE_EHRPD,
            TelephonyManager.NETWORK_TYPE_HSPAP -> "3g"

            TelephonyManager.NETWORK_TYPE_LTE -> "4g"

            TelephonyManager.NETWORK_TYPE_NR -> "5g"

            else -> "unknown"
        }
    }

    private fun sendNetworkStatus() {
        scope.launch {
            val status = getCurrentNetworkStatus()
            bridge.sendEvent(BridgeEvent("Network.StatusChanged", status))
        }
    }

    /**
     * 清理资源
     */
    fun cleanup() {
        stopMonitoring()
    }
}
