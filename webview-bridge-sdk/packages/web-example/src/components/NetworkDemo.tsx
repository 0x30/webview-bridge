import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { Button, Tag, Loading } from 'vant'
import { Bridge, type NetworkStatus } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'NetworkDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const networkStatus = ref<NetworkStatus | null>(null)
    const isMonitoring = ref(false)

    // 移除监听器函数
    let removeStatusListener: (() => void) | null = null

    /**
     * 获取网络状态
     */
    async function getStatus() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const status = await Bridge.network.getStatus()
        networkStatus.value = status
        emit('log', 'success', `网络: ${status.type} (${status.isConnected ? '已连接' : '未连接'})`)
      } catch (error) {
        emit('log', 'error', `获取网络状态失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 开始监听
     */
    async function startMonitoring() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      // 设置事件监听
      removeStatusListener = Bridge.network.onStatusChanged((status) => {
        networkStatus.value = status
        emit('log', 'info', `网络变化: ${status.type} (${status.isConnected ? '已连接' : '未连接'})`)
      })

      try {
        await Bridge.network.startMonitoring()
        isMonitoring.value = true
        emit('log', 'success', '开始监听网络状态')
      } catch (error) {
        emit('log', 'error', `开始监听失败: ${error}`)
      }
    }

    /**
     * 停止监听
     */
    async function stopMonitoring() {
      if (!Bridge.isNative) return

      try {
        await Bridge.network.stopMonitoring()
        isMonitoring.value = false
        removeStatusListener?.()
        removeStatusListener = null
        emit('log', 'info', '停止监听网络状态')
      } catch (error) {
        emit('log', 'error', `停止监听失败: ${error}`)
      }
    }

    /**
     * 获取网络类型图标
     */
    function getNetworkIcon(type: string): string {
      switch (type) {
        case 'wifi':
          return '📶'
        case 'cellular':
          return '📱'
        case 'ethernet':
          return '🔌'
        case 'bluetooth':
          return '🔵'
        case 'vpn':
          return '🔐'
        case 'none':
          return '❌'
        default:
          return '🌐'
      }
    }

    /**
     * 获取网络类型名称
     */
    function getNetworkTypeName(type: string): string {
      const names: Record<string, string> = {
        wifi: 'WiFi',
        cellular: '蜂窝网络',
        ethernet: '以太网',
        bluetooth: '蓝牙',
        vpn: 'VPN',
        none: '无连接',
        other: '其他',
        unknown: '未知',
      }
      return names[type] || type
    }

    /**
     * 获取蜂窝网络类型名称
     */
    function getCellularTypeName(type: string | undefined): string {
      if (!type) return ''
      const names: Record<string, string> = {
        '2g': '2G',
        '3g': '3G',
        '4g': '4G LTE',
        '5g': '5G',
      }
      return names[type] || type
    }

    // 清理
    onUnmounted(() => {
      removeStatusListener?.()
    })

    return () => (
      <div class="section">
        <div class="section-title">🌐 网络状态</div>

        <Button
          type="primary"
          block
          loading={loading.value}
          onClick={getStatus}
          style={{ marginBottom: '8px' }}
        >
          获取网络状态
        </Button>

        <Button
          block
          type={isMonitoring.value ? 'warning' : 'default'}
          onClick={isMonitoring.value ? stopMonitoring : startMonitoring}
        >
          {isMonitoring.value ? '停止监听' : '开始监听'}
        </Button>

        {isMonitoring.value && (
          <div style={{ textAlign: 'center', padding: '8px', color: '#1989fa' }}>
            <Loading size="16" /> 正在监听网络变化...
          </div>
        )}

        {/* 网络状态信息 */}
        {networkStatus.value && (
          <div class="info-card" style={{ marginTop: '12px' }}>
            <div style={{ 
              fontSize: '24px', 
              textAlign: 'center', 
              marginBottom: '12px' 
            }}>
              {getNetworkIcon(networkStatus.value.type)}
            </div>

            <div class="info-row">
              <span class="info-label">连接状态</span>
              <Tag type={networkStatus.value.isConnected ? 'success' : 'danger'}>
                {networkStatus.value.isConnected ? '已连接' : '未连接'}
              </Tag>
            </div>

            <div class="info-row">
              <span class="info-label">网络类型</span>
              <span class="info-value">
                {getNetworkTypeName(networkStatus.value.type)}
              </span>
            </div>

            {networkStatus.value.cellularType && (
              <div class="info-row">
                <span class="info-label">蜂窝类型</span>
                <span class="info-value">
                  {getCellularTypeName(networkStatus.value.cellularType)}
                </span>
              </div>
            )}

            <div class="info-row">
              <span class="info-label">计量网络</span>
              <Tag type={networkStatus.value.isExpensive ? 'warning' : 'success'}>
                {networkStatus.value.isExpensive ? '是' : '否'}
              </Tag>
            </div>

            <div class="info-row">
              <span class="info-label">受限连接</span>
              <Tag type={networkStatus.value.isConstrained ? 'warning' : 'success'}>
                {networkStatus.value.isConstrained ? '是' : '否'}
              </Tag>
            </div>

            {networkStatus.value.downstreamBandwidthKbps !== undefined && (
              <div class="info-row">
                <span class="info-label">下行带宽</span>
                <span class="info-value">
                  {(networkStatus.value.downstreamBandwidthKbps / 1000).toFixed(1)} Mbps
                </span>
              </div>
            )}

            {networkStatus.value.upstreamBandwidthKbps !== undefined && (
              <div class="info-row">
                <span class="info-label">上行带宽</span>
                <span class="info-value">
                  {(networkStatus.value.upstreamBandwidthKbps / 1000).toFixed(1)} Mbps
                </span>
              </div>
            )}

            {/* iOS 特有属性 */}
            {networkStatus.value.supportsIPv4 !== undefined && (
              <div class="info-row">
                <span class="info-label">IPv4/IPv6</span>
                <span class="info-value">
                  {networkStatus.value.supportsIPv4 ? 'v4 ' : ''}
                  {networkStatus.value.supportsIPv6 ? 'v6' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 便捷方法演示 */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', color: '#666' }}>
            便捷方法
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={async () => {
                if (!Bridge.isNative) return
                const connected = await Bridge.network.isConnected()
                emit('log', 'info', `网络连接: ${connected ? '是' : '否'}`)
              }}
            >
              是否连接
            </Button>
            <Button
              size="small"
              onClick={async () => {
                if (!Bridge.isNative) return
                const wifi = await Bridge.network.isWifi()
                emit('log', 'info', `是否 WiFi: ${wifi ? '是' : '否'}`)
              }}
            >
              是否 WiFi
            </Button>
            <Button
              size="small"
              onClick={async () => {
                if (!Bridge.isNative) return
                const cellular = await Bridge.network.isCellular()
                emit('log', 'info', `是否蜂窝: ${cellular ? '是' : '否'}`)
              }}
            >
              是否蜂窝
            </Button>
            <Button
              size="small"
              onClick={async () => {
                if (!Bridge.isNative) return
                const expensive = await Bridge.network.isExpensive()
                emit('log', 'info', `是否计量: ${expensive ? '是' : '否'}`)
              }}
            >
              是否计量
            </Button>
          </div>
        </div>
      </div>
    )
  },
})
