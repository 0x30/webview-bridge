import { defineComponent, ref } from 'vue'
import { Button, Tag } from 'vant'
import {
  Bridge,
  type DeviceInfo as DeviceInfoType,
} from '@aspect/webview-bridge'

export default defineComponent({
  name: 'DeviceInfo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const deviceInfo = ref<DeviceInfoType | null>(null)
    const batteryInfo = ref<{ level: number; isCharging: boolean } | null>(null)
    const networkInfo = ref<{ type: string; isConnected: boolean } | null>(null)

    /**
     * 获取设备信息
     */
    async function fetchDeviceInfo() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const [device, battery, network] = await Promise.all([
          Bridge.device.getInfo(),
          Bridge.device.getBatteryInfo(),
          Bridge.device.getNetworkInfo(),
        ])

        deviceInfo.value = device
        batteryInfo.value = battery
        networkInfo.value = network

        emit('log', 'success', '设备信息获取成功')
      } catch (error) {
        emit('log', 'error', `获取设备信息失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    return () => (
      <div class="section">
        <div class="section-title">📱 设备信息</div>

        <Button
          type="primary"
          block
          loading={loading.value}
          onClick={fetchDeviceInfo}
        >
          获取设备信息
        </Button>

        {deviceInfo.value && (
          <div style={{ marginTop: '12px' }}>
            <div class="info-row">
              <span class="info-label">设备型号</span>
              <span class="info-value">{deviceInfo.value.deviceModel}</span>
            </div>
            <div class="info-row">
              <span class="info-label">系统版本</span>
              <span class="info-value">
                {deviceInfo.value.os} {deviceInfo.value.osVersion}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">设备 ID</span>
              <span class="info-value" style={{ fontSize: '12px' }}>
                {deviceInfo.value.deviceId}
              </span>
            </div>
          </div>
        )}

        {batteryInfo.value && (
          <div style={{ marginTop: '8px' }}>
            <div class="info-row">
              <span class="info-label">电池电量</span>
              <span class="info-value">
                {Math.round(batteryInfo.value.level * 100)}%
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">充电状态</span>
              <Tag type={batteryInfo.value.isCharging ? 'success' : 'default'}>
                {batteryInfo.value.isCharging ? '充电中' : '未充电'}
              </Tag>
            </div>
          </div>
        )}

        {networkInfo.value && (
          <div style={{ marginTop: '8px' }}>
            <div class="info-row">
              <span class="info-label">网络类型</span>
              <span class="info-value">{networkInfo.value.type}</span>
            </div>
            <div class="info-row">
              <span class="info-label">网络状态</span>
              <Tag type={networkInfo.value.isConnected ? 'success' : 'danger'}>
                {networkInfo.value.isConnected ? '已连接' : '未连接'}
              </Tag>
            </div>
          </div>
        )}
      </div>
    )
  },
})
