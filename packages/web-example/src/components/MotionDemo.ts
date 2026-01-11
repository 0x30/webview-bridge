/**
 * Motion 模块 Demo 组件
 */

import { ref, onUnmounted } from 'vue'
import { showToast } from 'vant'
import Bridge from '@aspect/webview-bridge'

export default {
  name: 'MotionDemo',
  setup() {
    const isLoading = ref(false)
    const accelerometerData = ref<any>(null)
    const gyroscopeData = ref<any>(null)
    const orientationData = ref<any>(null)
    const isAccelerometerActive = ref(false)
    const isGyroscopeActive = ref(false)

    const startAccelerometer = async () => {
      try {
        isLoading.value = true
        await Bridge.motion.startAccelerometer({ interval: 100 })
        isAccelerometerActive.value = true
        showToast('加速度计已启动')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '启动加速度计失败' })
      } finally {
        isLoading.value = false
      }
    }

    const stopAccelerometer = async () => {
      try {
        isLoading.value = true
        await Bridge.motion.stopAccelerometer()
        isAccelerometerActive.value = false
        accelerometerData.value = null
        showToast('加速度计已停止')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '停止加速度计失败' })
      } finally {
        isLoading.value = false
      }
    }

    const startGyroscope = async () => {
      try {
        isLoading.value = true
        await Bridge.motion.startGyroscope({ interval: 100 })
        isGyroscopeActive.value = true
        showToast('陀螺仪已启动')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '启动陀螺仪失败' })
      } finally {
        isLoading.value = false
      }
    }

    const stopGyroscope = async () => {
      try {
        isLoading.value = true
        await Bridge.motion.stopGyroscope()
        isGyroscopeActive.value = false
        gyroscopeData.value = null
        showToast('陀螺仪已停止')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '停止陀螺仪失败' })
      } finally {
        isLoading.value = false
      }
    }

    const getOrientation = async () => {
      try {
        isLoading.value = true
        const data = await Bridge.motion.getOrientation()
        orientationData.value = data
        showToast('获取方向成功')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '获取方向失败' })
      } finally {
        isLoading.value = false
      }
    }

    // 监听传感器数据
    Bridge.motion.onAccelerometer((data) => {
      accelerometerData.value = data
    })

    Bridge.motion.onGyroscope((data) => {
      gyroscopeData.value = data
    })

    // 组件卸载时停止传感器
    onUnmounted(() => {
      Bridge.motion.stopAll()
    })

    return {
      isLoading,
      accelerometerData,
      gyroscopeData,
      orientationData,
      isAccelerometerActive,
      isGyroscopeActive,
      startAccelerometer,
      stopAccelerometer,
      startGyroscope,
      stopGyroscope,
      getOrientation,
    }
  },
  template: `
    <div class="demo-section">
      <h3>Motion 运动传感器</h3>
      
      <van-cell-group inset title="加速度计">
        <van-cell 
          :title="isAccelerometerActive ? '停止加速度计' : '启动加速度计'" 
          is-link 
          @click="isAccelerometerActive ? stopAccelerometer() : startAccelerometer()" 
          :clickable="!isLoading" 
        />
      </van-cell-group>

      <div v-if="accelerometerData" class="result-box">
        <div class="sensor-data">
          <div class="sensor-item">
            <span class="label">X:</span>
            <span class="value">{{ accelerometerData.x?.toFixed(3) }}</span>
          </div>
          <div class="sensor-item">
            <span class="label">Y:</span>
            <span class="value">{{ accelerometerData.y?.toFixed(3) }}</span>
          </div>
          <div class="sensor-item">
            <span class="label">Z:</span>
            <span class="value">{{ accelerometerData.z?.toFixed(3) }}</span>
          </div>
        </div>
      </div>

      <van-cell-group inset title="陀螺仪">
        <van-cell 
          :title="isGyroscopeActive ? '停止陀螺仪' : '启动陀螺仪'" 
          is-link 
          @click="isGyroscopeActive ? stopGyroscope() : startGyroscope()" 
          :clickable="!isLoading" 
        />
      </van-cell-group>

      <div v-if="gyroscopeData" class="result-box">
        <div class="sensor-data">
          <div class="sensor-item">
            <span class="label">X:</span>
            <span class="value">{{ gyroscopeData.x?.toFixed(3) }}</span>
          </div>
          <div class="sensor-item">
            <span class="label">Y:</span>
            <span class="value">{{ gyroscopeData.y?.toFixed(3) }}</span>
          </div>
          <div class="sensor-item">
            <span class="label">Z:</span>
            <span class="value">{{ gyroscopeData.z?.toFixed(3) }}</span>
          </div>
        </div>
      </div>

      <van-cell-group inset title="设备方向">
        <van-cell title="获取设备方向" is-link @click="getOrientation" :clickable="!isLoading" />
      </van-cell-group>

      <div v-if="orientationData" class="result-box">
        <pre>{{ JSON.stringify(orientationData, null, 2) }}</pre>
      </div>
    </div>
  `
}
