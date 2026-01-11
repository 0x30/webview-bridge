/**
 * Motion 传感器模块 Demo 组件 (TSX 版本)
 */

import { defineComponent, ref, onUnmounted } from 'vue'
import { CellGroup, Cell, Button, Toast, Divider, Tag, Progress } from 'vant'
import { Bridge } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'MotionDemoTsx',
  props: {
    onLog: {
      type: Function,
      required: false
    }
  },
  setup(props) {
    const isLoading = ref(false)
    const accelerometerData = ref<any>(null)
    const gyroscopeData = ref<any>(null)
    const isAccelerometerActive = ref(false)
    const isGyroscopeActive = ref(false)

    const log = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      console.log(`[${type}] ${message}`)
      props.onLog?.(type, message)
    }

    const startAccelerometer = async () => {
      try {
        isLoading.value = true
        await Bridge.motion.startAccelerometer({ interval: 100 })
        isAccelerometerActive.value = true
        log('success', '加速度计已启动')
        Toast.success('加速度计已启动')
      } catch (error: any) {
        log('error', `启动加速度计失败: ${error.message}`)
        Toast.fail(error.message || '启动加速度计失败')
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
        log('success', '加速度计已停止')
        Toast.success('加速度计已停止')
      } catch (error: any) {
        log('error', `停止加速度计失败: ${error.message}`)
        Toast.fail(error.message || '停止加速度计失败')
      } finally {
        isLoading.value = false
      }
    }

    const startGyroscope = async () => {
      try {
        isLoading.value = true
        await Bridge.motion.startGyroscope({ interval: 100 })
        isGyroscopeActive.value = true
        log('success', '陀螺仪已启动')
        Toast.success('陀螺仪已启动')
      } catch (error: any) {
        log('error', `启动陀螺仪失败: ${error.message}`)
        Toast.fail(error.message || '启动陀螺仪失败')
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
        log('success', '陀螺仪已停止')
        Toast.success('陀螺仪已停止')
      } catch (error: any) {
        log('error', `停止陀螺仪失败: ${error.message}`)
        Toast.fail(error.message || '停止陀螺仪失败')
      } finally {
        isLoading.value = false
      }
    }

    const stopAll = async () => {
      try {
        await Bridge.motion.stopAll()
        isAccelerometerActive.value = false
        isGyroscopeActive.value = false
        accelerometerData.value = null
        gyroscopeData.value = null
        log('success', '所有传感器已停止')
        Toast.success('所有传感器已停止')
      } catch (error: any) {
        log('error', `停止失败: ${error.message}`)
      }
    }

    // 监听传感器数据
    Bridge.motion.onAccelerometer((data) => {
      accelerometerData.value = data
    })

    Bridge.motion.onGyroscope((data) => {
      gyroscopeData.value = data
    })

    // 格式化数值
    const formatValue = (value: number) => value?.toFixed(4) || '0.0000'

    // 计算进度条值 (将 -10 到 10 的值映射到 0-100)
    const toProgress = (value: number) => Math.min(100, Math.max(0, ((value || 0) + 10) * 5))

    // 组件卸载时停止传感器
    onUnmounted(() => {
      Bridge.motion.stopAll()
    })

    return () => (
      <div class="section">
        <div class="section-title">📡 运动传感器</div>
        
        {/* 加速度计 */}
        <CellGroup inset title="加速度计">
          <Cell
            title="状态"
            value={
              <Tag type={isAccelerometerActive.value ? 'success' : 'default'}>
                {isAccelerometerActive.value ? '运行中' : '已停止'}
              </Tag>
            }
          />
          {accelerometerData.value && (
            <>
              <Cell title="X 轴" value={formatValue(accelerometerData.value.x)} />
              <Cell title="Y 轴" value={formatValue(accelerometerData.value.y)} />
              <Cell title="Z 轴" value={formatValue(accelerometerData.value.z)} />
            </>
          )}
        </CellGroup>

        <div class="button-group" style={{ marginTop: '12px' }}>
          <Button
            type="primary"
            block
            loading={isLoading.value}
            onClick={startAccelerometer}
            disabled={isAccelerometerActive.value}
          >
            启动加速度计
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={stopAccelerometer}
            disabled={!isAccelerometerActive.value}
          >
            停止加速度计
          </Button>
        </div>

        <Divider />

        {/* 陀螺仪 */}
        <CellGroup inset title="陀螺仪">
          <Cell
            title="状态"
            value={
              <Tag type={isGyroscopeActive.value ? 'success' : 'default'}>
                {isGyroscopeActive.value ? '运行中' : '已停止'}
              </Tag>
            }
          />
          {gyroscopeData.value && (
            <>
              <Cell title="X 轴 (rad/s)" value={formatValue(gyroscopeData.value.x)} />
              <Cell title="Y 轴 (rad/s)" value={formatValue(gyroscopeData.value.y)} />
              <Cell title="Z 轴 (rad/s)" value={formatValue(gyroscopeData.value.z)} />
            </>
          )}
        </CellGroup>

        <div class="button-group" style={{ marginTop: '12px' }}>
          <Button
            type="primary"
            block
            loading={isLoading.value}
            onClick={startGyroscope}
            disabled={isGyroscopeActive.value}
          >
            启动陀螺仪
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={stopGyroscope}
            disabled={!isGyroscopeActive.value}
          >
            停止陀螺仪
          </Button>
        </div>

        <Divider />

        <Button
          type="warning"
          block
          onClick={stopAll}
        >
          停止所有传感器
        </Button>

        <div class="tip-box" style={{ marginTop: '12px', padding: '12px', background: '#f8f8f8', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
          <p>💡 提示：</p>
          <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
            <li>加速度计: 检测设备在 X/Y/Z 轴上的加速度 (m/s²)</li>
            <li>陀螺仪: 检测设备的旋转速度 (rad/s)</li>
            <li>传感器会消耗电量，不用时请停止</li>
          </ul>
        </div>
      </div>
    )
  }
})
