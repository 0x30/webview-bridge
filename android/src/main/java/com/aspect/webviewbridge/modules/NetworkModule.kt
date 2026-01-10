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
import com.aspect.webviewbridge.protocol.BridgeError
import com.aspect.webviewbridge.protocol.BridgeModule
import com.aspect.webviewbridge.protocol.BridgeModuleContext
import com.aspect.webviewbridge.protocol.BridgeRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NetworkModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
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

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "GetStatus" -> getStatus(callback)
            "StartMonitoring" -> startMonitoring(callback)
            "StopMonitoring" -> stopMonitoring(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - GetStatus

    private fun getStatus(callback: (Result<Any?>) -> Unit) {
        callback(Result.success(getCurrentNetworkStatus()))
    }

    // MARK: - StartMonitoring

    private fun startMonitoring(callback: (Result<Any?>) -> Unit) {
        if (isMonitoring) {
            callback(Result.success(mapOf("monitoring" to true, "message" to "已在监听中")))
            return
        }

        val networkCallback = object : ConnectivityManager.NetworkCallback() {
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

        this.networkCallback = networkCallback

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            connectivityManager.registerDefaultNetworkCallback(networkCallback)
        } else {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            connectivityManager.registerNetworkCallback(request, networkCallback)
        }

        isMonitoring = true
        callback(Result.success(mapOf("monitoring" to true)))
    }

    // MARK: - StopMonitoring

    private fun stopMonitoring(callback: (Result<Any?>) -> Unit) {
        networkCallback?.let {
            try {
                connectivityManager.unregisterNetworkCallback(it)
            } catch (e: Exception) {
                // 忽略
            }
        }
        networkCallback = null
        isMonitoring = false

        callback(Result.success(mapOf("monitoring" to false)))
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
            isNotRestricted =
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_RESTRICTED)

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
        val telephonyManager =
            context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
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
            bridgeContext.sendEvent("Network.StatusChanged", status)
        }
    }

    /**
     * 清理资源
     */
    fun cleanup() {
        stopMonitoring()
    }
}
