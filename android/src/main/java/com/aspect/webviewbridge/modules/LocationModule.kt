/**
 * Location 模块 - 地理位置功能
 *
 * 提供获取位置、位置监听、地理编码等功能
 */

package com.aspect.webviewbridge.modules

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.aspect.webviewbridge.core.BridgeError
import com.aspect.webviewbridge.core.BridgeErrorCode
import com.aspect.webviewbridge.core.BridgeEvent
import com.aspect.webviewbridge.core.BridgeModule
import com.aspect.webviewbridge.core.WebViewBridge
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.Locale
import kotlin.coroutines.resume

class LocationModule(
    private val context: Context,
    private val bridge: WebViewBridge
) : BridgeModule {

    override val moduleName: String = "Location"

    override val methods: List<String> = listOf(
        "GetCurrentPosition",
        "WatchPosition",
        "ClearWatch",
        "HasPermission",
        "RequestPermission",
        "GetPermissionStatus",
        "OpenSettings",
        "Geocode",
        "ReverseGeocode"
    )

    private val locationManager: LocationManager by lazy {
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    }

    private val watchListeners = mutableMapOf<String, LocationListener>()
    private var watchIdCounter = 0
    private val scope = CoroutineScope(Dispatchers.Main)

    override suspend fun handleRequest(
        method: String,
        params: JSONObject
    ): Any? {
        return when (method) {
            "GetCurrentPosition" -> getCurrentPosition(params)
            "WatchPosition" -> watchPosition(params)
            "ClearWatch" -> clearWatch(params)
            "HasPermission" -> hasPermission()
            "RequestPermission" -> requestPermission(params)
            "GetPermissionStatus" -> getPermissionStatus()
            "OpenSettings" -> openSettings()
            "Geocode" -> geocode(params)
            "ReverseGeocode" -> reverseGeocode(params)
            else -> throw BridgeError(BridgeErrorCode.MethodNotFound, "$moduleName.$method")
        }
    }

    // MARK: - HasPermission

    private fun hasPermission(): Map<String, Any> {
        val fineGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        return mapOf(
            "granted" to (fineGranted || coarseGranted),
            "fineLocation" to fineGranted,
            "coarseLocation" to coarseGranted
        )
    }

    // MARK: - RequestPermission

    private suspend fun requestPermission(params: JSONObject): Map<String, Any> {
        val accuracy = params.optString("accuracy", "high")
        
        val permissions = mutableListOf<String>()
        if (accuracy == "high") {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        // 权限请求需要通过 Activity 进行
        // 返回当前状态，实际权限请求需要由客户端实现
        return mapOf(
            "message" to "请在应用层调用 ActivityCompat.requestPermissions",
            "permissions" to permissions,
            "currentStatus" to hasPermission()
        )
    }

    // MARK: - GetPermissionStatus

    private fun getPermissionStatus(): Map<String, Any> {
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

        return mapOf(
            "permissions" to hasPermission(),
            "isLocationEnabled" to (isGpsEnabled || isNetworkEnabled),
            "isGpsEnabled" to isGpsEnabled,
            "isNetworkEnabled" to isNetworkEnabled
        )
    }

    // MARK: - OpenSettings

    private fun openSettings(): Map<String, Boolean> {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        return mapOf("opened" to true)
    }

    // MARK: - GetCurrentPosition

    @SuppressLint("MissingPermission")
    private suspend fun getCurrentPosition(params: JSONObject): Map<String, Any> {
        if (!checkLocationPermission()) {
            throw BridgeError(BridgeErrorCode.PermissionDenied, "未获得位置权限")
        }

        val accuracy = params.optString("accuracy", "high")
        val timeout = params.optLong("timeout", 30000)

        val provider = when (accuracy) {
            "high" -> {
                if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    LocationManager.GPS_PROVIDER
                } else {
                    LocationManager.NETWORK_PROVIDER
                }
            }
            else -> LocationManager.NETWORK_PROVIDER
        }

        if (!locationManager.isProviderEnabled(provider)) {
            throw BridgeError(BridgeErrorCode.FeatureDisabled, "位置服务未开启")
        }

        return withContext(Dispatchers.Main) {
            suspendCancellableCoroutine { continuation ->
                val listener = object : LocationListener {
                    override fun onLocationChanged(location: Location) {
                        locationManager.removeUpdates(this)
                        if (continuation.isActive) {
                            continuation.resume(locationToMap(location))
                        }
                    }

                    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                    override fun onProviderEnabled(provider: String) {}
                    override fun onProviderDisabled(provider: String) {}
                }

                locationManager.requestSingleUpdate(provider, listener, null)

                continuation.invokeOnCancellation {
                    locationManager.removeUpdates(listener)
                }
            }
        }
    }

    // MARK: - WatchPosition

    @SuppressLint("MissingPermission")
    private fun watchPosition(params: JSONObject): Map<String, Any> {
        if (!checkLocationPermission()) {
            throw BridgeError(BridgeErrorCode.PermissionDenied, "未获得位置权限")
        }

        val accuracy = params.optString("accuracy", "high")
        val distanceFilter = params.optDouble("distanceFilter", 10.0).toFloat()
        val interval = params.optLong("interval", 5000)

        val provider = when (accuracy) {
            "high" -> {
                if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    LocationManager.GPS_PROVIDER
                } else {
                    LocationManager.NETWORK_PROVIDER
                }
            }
            else -> LocationManager.NETWORK_PROVIDER
        }

        watchIdCounter++
        val watchId = "watch_$watchIdCounter"

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                val result = locationToMap(location)
                result["watchId"] = watchId
                
                scope.launch {
                    bridge.sendEvent(BridgeEvent("Location.PositionChanged", result))
                }
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        watchListeners[watchId] = listener
        locationManager.requestLocationUpdates(provider, interval, distanceFilter, listener)

        return mapOf("watchId" to watchId)
    }

    // MARK: - ClearWatch

    private fun clearWatch(params: JSONObject): Map<String, Boolean> {
        val watchId = params.optString("watchId", "")

        if (watchId.isNotEmpty()) {
            watchListeners[watchId]?.let { listener ->
                locationManager.removeUpdates(listener)
                watchListeners.remove(watchId)
            }
        }

        return mapOf("cleared" to true)
    }

    // MARK: - Geocode

    @Suppress("DEPRECATION")
    private suspend fun geocode(params: JSONObject): Map<String, Any?> {
        val address = params.optString("address", "")
        if (address.isEmpty()) {
            throw BridgeError(BridgeErrorCode.InvalidParams, "address")
        }

        return withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                
                val addresses: List<Address>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    suspendCancellableCoroutine { continuation ->
                        geocoder.getFromLocationName(address, 1) { results ->
                            continuation.resume(results)
                        }
                    }
                } else {
                    geocoder.getFromLocationName(address, 1)
                }

                val result = addresses?.firstOrNull()
                    ?: throw BridgeError(BridgeErrorCode.InternalError, "未找到位置")

                mapOf(
                    "latitude" to result.latitude,
                    "longitude" to result.longitude,
                    "address" to addressToMap(result)
                )
            } catch (e: Exception) {
                throw BridgeError(BridgeErrorCode.InternalError, e.message ?: "地理编码失败")
            }
        }
    }

    // MARK: - ReverseGeocode

    @Suppress("DEPRECATION")
    private suspend fun reverseGeocode(params: JSONObject): Map<String, Any?> {
        val latitude = params.optDouble("latitude", Double.NaN)
        val longitude = params.optDouble("longitude", Double.NaN)

        if (latitude.isNaN() || longitude.isNaN()) {
            throw BridgeError(BridgeErrorCode.InvalidParams, "latitude/longitude")
        }

        return withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                
                val addresses: List<Address>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    suspendCancellableCoroutine { continuation ->
                        geocoder.getFromLocation(latitude, longitude, 1) { results ->
                            continuation.resume(results)
                        }
                    }
                } else {
                    geocoder.getFromLocation(latitude, longitude, 1)
                }

                val result = addresses?.firstOrNull()
                    ?: throw BridgeError(BridgeErrorCode.InternalError, "未找到地址")

                addressToMap(result)
            } catch (e: Exception) {
                throw BridgeError(BridgeErrorCode.InternalError, e.message ?: "反向地理编码失败")
            }
        }
    }

    // MARK: - 辅助方法

    private fun checkLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun locationToMap(location: Location): MutableMap<String, Any> {
        return mutableMapOf(
            "latitude" to location.latitude,
            "longitude" to location.longitude,
            "altitude" to location.altitude,
            "accuracy" to location.accuracy.toDouble(),
            "speed" to location.speed.toDouble(),
            "heading" to location.bearing.toDouble(),
            "timestamp" to location.time
        )
    }

    private fun addressToMap(address: Address): Map<String, Any?> {
        val formattedAddress = buildString {
            for (i in 0..address.maxAddressLineIndex) {
                if (i > 0) append(", ")
                append(address.getAddressLine(i))
            }
        }

        return mapOf(
            "name" to address.featureName,
            "thoroughfare" to address.thoroughfare,
            "subThoroughfare" to address.subThoroughfare,
            "locality" to address.locality,
            "subLocality" to address.subLocality,
            "administrativeArea" to address.adminArea,
            "subAdministrativeArea" to address.subAdminArea,
            "postalCode" to address.postalCode,
            "country" to address.countryName,
            "countryCode" to address.countryCode,
            "formattedAddress" to formattedAddress
        )
    }

    /**
     * 清理资源
     */
    fun cleanup() {
        watchListeners.values.forEach { listener ->
            locationManager.removeUpdates(listener)
        }
        watchListeners.clear()
    }
}
