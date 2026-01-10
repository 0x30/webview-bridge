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
import com.aspect.webviewbridge.protocol.BridgeError
import com.aspect.webviewbridge.protocol.BridgeModule
import com.aspect.webviewbridge.protocol.BridgeModuleContext
import com.aspect.webviewbridge.protocol.BridgeRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import java.util.Locale
import kotlin.coroutines.resume

class LocationModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
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

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "GetCurrentPosition" -> getCurrentPosition(request, callback)
            "WatchPosition" -> watchPosition(request, callback)
            "ClearWatch" -> clearWatch(request, callback)
            "HasPermission" -> hasPermission(callback)
            "RequestPermission" -> requestPermission(request, callback)
            "GetPermissionStatus" -> getPermissionStatus(callback)
            "OpenSettings" -> openSettings(callback)
            "Geocode" -> geocode(request, callback)
            "ReverseGeocode" -> reverseGeocode(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - HasPermission

    private fun hasPermission(callback: (Result<Any?>) -> Unit) {
        val fineGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        callback(Result.success(mapOf(
            "granted" to (fineGranted || coarseGranted),
            "fineLocation" to fineGranted,
            "coarseLocation" to coarseGranted
        )))
    }

    // MARK: - RequestPermission

    private fun requestPermission(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val accuracy = request.getString("accuracy") ?: "high"

        val permissions = mutableListOf<String>()
        if (accuracy == "high") {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        // 权限请求需要通过 Activity 进行
        // 返回当前状态，实际权限请求需要由客户端实现
        callback(Result.success(mapOf(
            "message" to "请在应用层调用 ActivityCompat.requestPermissions",
            "permissions" to permissions,
            "currentStatus" to getCurrentPermissionStatus()
        )))
    }

    // MARK: - GetPermissionStatus
    
    private fun getPermissionStatus(callback: (Result<Any?>) -> Unit) {
        callback(Result.success(getCurrentPermissionStatus()))
    }
    
    private fun getCurrentPermissionStatus(): Map<String, Any> {
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        
        val fineGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        return mapOf(
            "permissions" to mapOf(
                "granted" to (fineGranted || coarseGranted),
                "fineLocation" to fineGranted,
                "coarseLocation" to coarseGranted
            ),
            "isLocationEnabled" to (isGpsEnabled || isNetworkEnabled),
            "isGpsEnabled" to isGpsEnabled,
            "isNetworkEnabled" to isNetworkEnabled
        )
    }

    // MARK: - OpenSettings

    private fun openSettings(callback: (Result<Any?>) -> Unit) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        callback(Result.success(mapOf("opened" to true)))
    }

    // MARK: - GetCurrentPosition

    @SuppressLint("MissingPermission")
    private fun getCurrentPosition(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        if (!checkLocationPermission()) {
            callback(Result.failure(BridgeError.permissionDenied("未获得位置权限")))
            return
        }

        val accuracy = request.getString("accuracy") ?: "high"
        val timeout = request.getLong("timeout") ?: 30000

        scope.launch {
            try {
                val result = getCurrentLocationInternal(accuracy, timeout)
                callback(Result.success(result))
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message ?: "获取位置失败")))
            }
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun getCurrentLocationInternal(accuracy: String, timeout: Long): Map<String, Any> {

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
            throw RuntimeException("位置服务未开启")
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
    private fun watchPosition(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        if (!checkLocationPermission()) {
            callback(Result.failure(BridgeError.permissionDenied("未获得位置权限")))
            return
        }

        val accuracy = request.getString("accuracy") ?: "high"
        val distanceFilter = request.getDouble("distanceFilter")?.toFloat() ?: 10.0f
        val interval = request.getLong("interval") ?: 5000

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
                val result = locationToMap(location).toMutableMap()
                result["watchId"] = watchId

                scope.launch {
                    bridgeContext.sendEvent("Location.PositionChanged", result)
                }
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        watchListeners[watchId] = listener
        locationManager.requestLocationUpdates(provider, interval, distanceFilter, listener)

        callback(Result.success(mapOf("watchId" to watchId)))
    }

    // MARK: - ClearWatch

    private fun clearWatch(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val watchId = request.getString("watchId") ?: ""

        if (watchId.isNotEmpty()) {
            watchListeners[watchId]?.let { listener ->
                locationManager.removeUpdates(listener)
                watchListeners.remove(watchId)
            }
        }

        callback(Result.success(mapOf("cleared" to true)))
    }

    // MARK: - Geocode

    @Suppress("DEPRECATION")
    private fun geocode(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val address = request.getString("address") ?: ""
        if (address.isEmpty()) {
            callback(Result.failure(BridgeError.invalidParams("address")))
            return
        }

        scope.launch {
            try {
                val result = geocodeInternal(address)
                callback(Result.success(result))
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message ?: "地理编码失败")))
            }
        }
    }

    @Suppress("DEPRECATION")
    private suspend fun geocodeInternal(address: String): Map<String, Any?> {

        return withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())

                val addresses: List<Address>? =
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        suspendCancellableCoroutine { continuation ->
                            geocoder.getFromLocationName(address, 1) { results ->
                                continuation.resume(results)
                            }
                        }
                    } else {
                        geocoder.getFromLocationName(address, 1)
                    }

                val result = addresses?.firstOrNull()
                    ?: throw RuntimeException("未找到位置")

                mapOf(
                    "latitude" to result.latitude,
                    "longitude" to result.longitude,
                    "address" to addressToMap(result)
                )
            } catch (e: Exception) {
                throw RuntimeException(e.message ?: "地理编码失败")
            }
        }
    }

    // MARK: - ReverseGeocode

    @Suppress("DEPRECATION")
    private fun reverseGeocode(request: BridgeRequest, callback: (Result<Any?>) -> Unit) {
        val latitude = request.getDouble("latitude")
        val longitude = request.getDouble("longitude")

        if (latitude == null || longitude == null) {
            callback(Result.failure(BridgeError.invalidParams("latitude/longitude")))
            return
        }

        scope.launch {
            try {
                val result = reverseGeocodeInternal(latitude, longitude)
                callback(Result.success(result))
            } catch (e: Exception) {
                callback(Result.failure(BridgeError.internalError(e.message ?: "反向地理编码失败")))
            }
        }
    }

    @Suppress("DEPRECATION")
    private suspend fun reverseGeocodeInternal(latitude: Double, longitude: Double): Map<String, Any?> {

        if (latitude.isNaN() || longitude.isNaN()) {
            throw RuntimeException("Invalid latitude/longitude")
        }

        return withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())

                val addresses: List<Address>? =
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        suspendCancellableCoroutine { continuation ->
                            geocoder.getFromLocation(latitude, longitude, 1) { results ->
                                continuation.resume(results)
                            }
                        }
                    } else {
                        geocoder.getFromLocation(latitude, longitude, 1)
                    }

                val result = addresses?.firstOrNull()
                    ?: throw RuntimeException("未找到地址")

                addressToMap(result)
            } catch (e: Exception) {
                throw RuntimeException(e.message ?: "反向地理编码失败")
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
