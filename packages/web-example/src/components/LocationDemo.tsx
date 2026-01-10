import { defineComponent, ref, onUnmounted } from 'vue'
import { Button, Tag, Loading, Field, CellGroup } from 'vant'
import { Bridge, type LocationResult, type Address } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'LocationDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const location = ref<LocationResult | null>(null)
    const address = ref<Address | null>(null)
    const hasPermission = ref(false)
    const watchId = ref<string | null>(null)
    const isWatching = ref(false)

    // 地理编码输入
    const geocodeAddress = ref('')
    const geocodeResult = ref<{ lat: number; lng: number } | null>(null)

    /**
     * 检查权限
     */
    async function checkPermission() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.permission.getStatus('locationWhenInUse')
        hasPermission.value = result.granted
        emit('log', 'info', `位置权限: ${result.status}`)
      } catch (error) {
        emit('log', 'error', `检查权限失败: ${error}`)
      }
    }

    /**
     * 请求权限
     */
    async function requestPermission() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.permission.request('locationWhenInUse')
        hasPermission.value = result.granted
        emit('log', result.granted ? 'success' : 'warning', 
          `权限状态: ${result.status}`)
      } catch (error) {
        emit('log', 'error', `请求权限失败: ${error}`)
      }
    }

    /**
     * 获取当前位置
     */
    async function getCurrentPosition() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.location.getCurrentPosition({
          accuracy: 'high',
          timeout: 30000,
        })
        location.value = result
        emit('log', 'success', `位置: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`)

        // 自动获取地址
        try {
          const addr = await Bridge.location.reverseGeocode(result.latitude, result.longitude)
          address.value = addr
        } catch (e) {
          // 忽略地址获取失败
        }
      } catch (error) {
        emit('log', 'error', `获取位置失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 开始监听位置
     */
    async function startWatching() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const id = await Bridge.location.watchPosition(
          (pos: { latitude: number; longitude: number }) => {
            location.value = pos as typeof location.value
            emit('log', 'info', `位置更新: ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`)
          },
          {
            accuracy: 'high',
            distanceFilter: 10,
          }
        )
        watchId.value = id
        isWatching.value = true
        emit('log', 'success', '开始监听位置变化')
      } catch (error) {
        emit('log', 'error', `开始监听失败: ${error}`)
      }
    }

    /**
     * 停止监听位置
     */
    async function stopWatching() {
      if (watchId.value) {
        try {
          await Bridge.location.clearWatch(watchId.value)
          watchId.value = null
          isWatching.value = false
          emit('log', 'info', '停止监听位置')
        } catch (error) {
          emit('log', 'error', `停止监听失败: ${error}`)
        }
      }
    }

    /**
     * 地理编码
     */
    async function doGeocode() {
      if (!Bridge.isNative || !geocodeAddress.value) {
        return
      }

      loading.value = true
      try {
        const result = await Bridge.location.geocode(geocodeAddress.value)
        geocodeResult.value = {
          lat: result.latitude,
          lng: result.longitude,
        }
        emit('log', 'success', `${geocodeAddress.value} => ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`)
      } catch (error) {
        emit('log', 'error', `地理编码失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 打开设置
     */
    async function openSettings() {
      if (!Bridge.isNative) return

      try {
        await Bridge.location.openSettings()
      } catch (error) {
        emit('log', 'error', `打开设置失败: ${error}`)
      }
    }

    /**
     * 计算距离示例
     */
    function calculateDistanceExample() {
      // 北京天安门到上海东方明珠
      const distance = Bridge.location.calculateDistance(
        39.9042, 116.4074, // 北京
        31.2397, 121.4998  // 上海
      )
      emit('log', 'info', `北京到上海距离: ${(distance / 1000).toFixed(2)} 公里`)
    }

    // 清理
    onUnmounted(() => {
      if (watchId.value) {
        Bridge.location.clearWatch(watchId.value)
      }
    })

    return () => (
      <div class="section">
        <div class="section-title">📍 位置服务</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Button size="small" onClick={checkPermission}>
            检查权限
          </Button>
          <Button size="small" type="primary" onClick={requestPermission}>
            请求权限
          </Button>
          <Button size="small" onClick={openSettings}>
            打开设置
          </Button>
          <Tag type={hasPermission.value ? 'success' : 'warning'}>
            {hasPermission.value ? '已授权' : '未授权'}
          </Tag>
        </div>

        <Button
          type="primary"
          block
          loading={loading.value}
          onClick={getCurrentPosition}
          style={{ marginBottom: '8px' }}
        >
          获取当前位置
        </Button>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Button
            style={{ flex: 1 }}
            type={isWatching.value ? 'warning' : 'default'}
            onClick={isWatching.value ? stopWatching : startWatching}
          >
            {isWatching.value ? '停止监听' : '开始监听'}
          </Button>
          <Button style={{ flex: 1 }} onClick={calculateDistanceExample}>
            计算距离示例
          </Button>
        </div>

        {/* 当前位置 */}
        {location.value && (
          <div class="info-card" style={{ marginBottom: '12px' }}>
            <div class="info-row">
              <span class="info-label">纬度</span>
              <span class="info-value">{location.value.latitude.toFixed(6)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">经度</span>
              <span class="info-value">{location.value.longitude.toFixed(6)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">精度</span>
              <span class="info-value">{location.value.accuracy.toFixed(1)} 米</span>
            </div>
            {address.value && (
              <div class="info-row">
                <span class="info-label">地址</span>
                <span class="info-value" style={{ fontSize: '12px' }}>
                  {address.value.formattedAddress || address.value.locality}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 地理编码 */}
        <CellGroup inset style={{ marginTop: '12px' }}>
          <Field
            v-model={geocodeAddress.value}
            label="地址"
            placeholder="输入地址进行地理编码"
            v-slots={{
              button: () => (
                <Button size="small" type="primary" onClick={doGeocode}>
                  编码
                </Button>
              ),
            }}
          />
        </CellGroup>

        {geocodeResult.value && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
            结果: {geocodeResult.value.lat.toFixed(6)}, {geocodeResult.value.lng.toFixed(6)}
          </div>
        )}

        {isWatching.value && (
          <div style={{ marginTop: '12px', textAlign: 'center', color: '#1989fa' }}>
            <Loading size="16" /> 正在监听位置变化...
          </div>
        )}
      </div>
    )
  },
})
