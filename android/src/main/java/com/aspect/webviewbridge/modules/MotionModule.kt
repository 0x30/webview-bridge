/**
 * Motion 模块 - 运动传感器
 *
 * 提供加速度计、陀螺仪等传感器数据访问
 */

package com.aspect.webviewbridge.modules

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import com.aspect.webviewbridge.protocol.*

/**
 * 运动传感器模块
 */
class MotionModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule, SensorEventListener {

    override val moduleName = "Motion"

    override val methods = listOf(
        "StartAccelerometer",
        "StopAccelerometer",
        "StartGyroscope",
        "StopGyroscope",
        "GetOrientation"
    )

    private val sensorManager: SensorManager = 
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var rotationVector: Sensor? = null
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    private var isAccelerometerActive = false
    private var isGyroscopeActive = false
    
    private var accelerometerInterval = 100 // ms
    private var gyroscopeInterval = 100 // ms
    private var lastAccelerometerUpdate = 0L
    private var lastGyroscopeUpdate = 0L

    init {
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        rotationVector = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    }

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val cb = callback.toBridgeCallback()
        when (method) {
            "StartAccelerometer" -> startAccelerometer(request, cb)
            "StopAccelerometer" -> stopAccelerometer(cb)
            "StartGyroscope" -> startGyroscope(request, cb)
            "StopGyroscope" -> stopGyroscope(cb)
            "GetOrientation" -> getOrientation(cb)
            else -> cb.error(BridgeError.methodNotFound("$moduleName.$method"))
        }
    }

    /**
     * 开始加速度计
     */
    private fun startAccelerometer(request: BridgeRequest, callback: BridgeCallback) {
        if (accelerometer == null) {
            callback.error(BridgeError(BridgeError.Code.CAPABILITY_NOT_SUPPORTED, "加速度计不可用"))
            return
        }

        request.getInt("interval")?.let {
            accelerometerInterval = it
        }

        if (!isAccelerometerActive) {
            sensorManager.registerListener(
                this,
                accelerometer,
                SensorManager.SENSOR_DELAY_GAME
            )
            isAccelerometerActive = true
        }

        callback.success(mapOf("started" to true))
    }

    /**
     * 停止加速度计
     */
    private fun stopAccelerometer(callback: BridgeCallback) {
        if (isAccelerometerActive && !isGyroscopeActive) {
            sensorManager.unregisterListener(this, accelerometer)
        }
        isAccelerometerActive = false
        callback.success(mapOf("stopped" to true))
    }

    /**
     * 开始陀螺仪
     */
    private fun startGyroscope(request: BridgeRequest, callback: BridgeCallback) {
        if (gyroscope == null) {
            callback.error(BridgeError(BridgeError.Code.CAPABILITY_NOT_SUPPORTED, "陀螺仪不可用"))
            return
        }

        request.getInt("interval")?.let {
            gyroscopeInterval = it
        }

        if (!isGyroscopeActive) {
            sensorManager.registerListener(
                this,
                gyroscope,
                SensorManager.SENSOR_DELAY_GAME
            )
            isGyroscopeActive = true
        }

        callback.success(mapOf("started" to true))
    }

    /**
     * 停止陀螺仪
     */
    private fun stopGyroscope(callback: BridgeCallback) {
        if (isGyroscopeActive) {
            sensorManager.unregisterListener(this, gyroscope)
        }
        isGyroscopeActive = false
        callback.success(mapOf("stopped" to true))
    }

    /**
     * 获取设备方向
     */
    private fun getOrientation(callback: BridgeCallback) {
        if (rotationVector == null) {
            callback.error(BridgeError(BridgeError.Code.CAPABILITY_NOT_SUPPORTED, "旋转向量传感器不可用"))
            return
        }

        val orientationListener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent?) {
                event?.let {
                    val rotationMatrix = FloatArray(9)
                    SensorManager.getRotationMatrixFromVector(rotationMatrix, it.values)
                    
                    val orientation = FloatArray(3)
                    SensorManager.getOrientation(rotationMatrix, orientation)
                    
                    // 转换为角度
                    val alpha = Math.toDegrees(orientation[0].toDouble()) // 偏航角
                    val beta = Math.toDegrees(orientation[1].toDouble())  // 俯仰角
                    val gamma = Math.toDegrees(orientation[2].toDouble()) // 翻滚角
                    
                    sensorManager.unregisterListener(this)
                    
                    callback.success(mapOf(
                        "alpha" to alpha,
                        "beta" to beta,
                        "gamma" to gamma
                    ))
                }
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }

        sensorManager.registerListener(
            orientationListener,
            rotationVector,
            SensorManager.SENSOR_DELAY_NORMAL
        )
    }

    // MARK: - SensorEventListener

    override fun onSensorChanged(event: SensorEvent?) {
        event ?: return
        val currentTime = System.currentTimeMillis()

        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                if (isAccelerometerActive && currentTime - lastAccelerometerUpdate >= accelerometerInterval) {
                    lastAccelerometerUpdate = currentTime
                    bridgeContext.sendEvent("Motion.Accelerometer", mapOf(
                        "x" to event.values[0].toDouble(),
                        "y" to event.values[1].toDouble(),
                        "z" to event.values[2].toDouble(),
                        "timestamp" to currentTime
                    ))
                }
            }
            Sensor.TYPE_GYROSCOPE -> {
                if (isGyroscopeActive && currentTime - lastGyroscopeUpdate >= gyroscopeInterval) {
                    lastGyroscopeUpdate = currentTime
                    bridgeContext.sendEvent("Motion.Gyroscope", mapOf(
                        "x" to event.values[0].toDouble(),
                        "y" to event.values[1].toDouble(),
                        "z" to event.values[2].toDouble(),
                        "timestamp" to currentTime
                    ))
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // 不处理精度变化
    }

    /**
     * 清理资源
     */
    fun cleanup() {
        sensorManager.unregisterListener(this)
        isAccelerometerActive = false
        isGyroscopeActive = false
    }
}
