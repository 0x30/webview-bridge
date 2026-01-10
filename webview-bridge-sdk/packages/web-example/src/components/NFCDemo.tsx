import { defineComponent, ref, onUnmounted } from 'vue'
import { Button, Tag, Field, CellGroup, Cell, Loading } from 'vant'
import { Bridge, type NDEFRecord } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'NFCDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const isAvailable = ref(false)
    const isEnabled = ref(false)
    const isScanning = ref(false)
    const detectedRecords = ref<NDEFRecord[]>([])

    // 写入数据
    const writeText = ref('')
    const writeUri = ref('')

    // 事件监听取消函数
    let removeTagListener: (() => void) | null = null
    let removeWriteSuccessListener: (() => void) | null = null
    let removeWriteErrorListener: (() => void) | null = null

    /**
     * 检查可用性
     */
    async function checkAvailability() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const [availability, enabled] = await Promise.all([
          Bridge.nfc.isAvailable(),
          Bridge.nfc.isEnabled(),
        ])

        isAvailable.value = availability.isAvailable
        isEnabled.value = enabled.isEnabled

        emit('log', 'info', 
          `NFC: ${availability.isAvailable ? '可用' : '不可用'}, ${enabled.isEnabled ? '已开启' : '未开启'}`)
      } catch (error) {
        emit('log', 'error', `检查可用性失败: ${error}`)
      }
    }

    /**
     * 开始扫描
     */
    async function startScan() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      // 设置事件监听
      removeTagListener = Bridge.nfc.onTagDetected((data) => {
        detectedRecords.value = data.records
        emit('log', 'success', `检测到标签，包含 ${data.records.length} 条记录`)
      })

      loading.value = true
      try {
        await Bridge.nfc.startScan({
          alertMessage: '请将设备靠近 NFC 标签',
        })
        isScanning.value = true
        emit('log', 'info', 'NFC 扫描已启动')
      } catch (error) {
        emit('log', 'error', `启动扫描失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 停止扫描
     */
    async function stopScan() {
      if (!Bridge.isNative) return

      try {
        await Bridge.nfc.stopScan()
        isScanning.value = false
        removeTagListener?.()
        removeTagListener = null
        emit('log', 'info', 'NFC 扫描已停止')
      } catch (error) {
        emit('log', 'error', `停止扫描失败: ${error}`)
      }
    }

    /**
     * 写入文本
     */
    async function writeTextToTag() {
      if (!Bridge.isNative || !writeText.value) {
        return
      }

      // 设置事件监听
      removeWriteSuccessListener = Bridge.nfc.onWriteSuccess((data) => {
        emit('log', 'success', 'NFC 标签写入成功')
        removeWriteSuccessListener?.()
        removeWriteErrorListener?.()
      })

      removeWriteErrorListener = Bridge.nfc.onWriteError((data) => {
        emit('log', 'error', `写入失败: ${data.error}`)
        removeWriteSuccessListener?.()
        removeWriteErrorListener?.()
      })

      loading.value = true
      try {
        await Bridge.nfc.writeText(writeText.value, '请将设备靠近要写入的 NFC 标签')
        emit('log', 'info', '等待靠近 NFC 标签...')
      } catch (error) {
        emit('log', 'error', `写入失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 写入 URI
     */
    async function writeUriToTag() {
      if (!Bridge.isNative || !writeUri.value) {
        return
      }

      loading.value = true
      try {
        await Bridge.nfc.writeUri(writeUri.value, '请将设备靠近要写入的 NFC 标签')
        emit('log', 'info', '等待靠近 NFC 标签...')
      } catch (error) {
        emit('log', 'error', `写入失败: ${error}`)
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
        await Bridge.nfc.openSettings()
      } catch (error) {
        emit('log', 'error', `打开设置失败: ${error}`)
      }
    }

    /**
     * 格式化记录显示
     */
    function formatRecord(record: NDEFRecord): string {
      if (record.text) return `文本: ${record.text}`
      if (record.uri) return `URI: ${record.uri}`
      if (record.payloadText) return `内容: ${record.payloadText}`
      return `类型: ${record.tnf}/${record.type}`
    }

    // 清理
    onUnmounted(() => {
      removeTagListener?.()
      removeWriteSuccessListener?.()
      removeWriteErrorListener?.()
    })

    return () => (
      <div class="section">
        <div class="section-title">📡 NFC</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Button size="small" onClick={checkAvailability}>
            检查可用性
          </Button>
          <Button size="small" onClick={openSettings}>
            打开设置
          </Button>
          <Tag type={isAvailable.value ? 'success' : 'warning'}>
            {isAvailable.value ? 'NFC 可用' : 'NFC 不可用'}
          </Tag>
          <Tag type={isEnabled.value ? 'success' : 'warning'}>
            {isEnabled.value ? '已开启' : '未开启'}
          </Tag>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Button
            style={{ flex: 1 }}
            type={isScanning.value ? 'warning' : 'primary'}
            loading={loading.value}
            onClick={isScanning.value ? stopScan : startScan}
            disabled={!isAvailable.value || !isEnabled.value}
          >
            {isScanning.value ? '停止扫描' : '开始扫描'}
          </Button>
        </div>

        {isScanning.value && (
          <div style={{ textAlign: 'center', padding: '12px', color: '#1989fa' }}>
            <Loading size="20" /> 正在扫描 NFC 标签...
          </div>
        )}

        {/* 检测到的记录 */}
        {detectedRecords.value.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', color: '#666' }}>
              检测到的记录 ({detectedRecords.value.length})
            </div>
            <CellGroup inset>
              {detectedRecords.value.map((record, index) => (
                <Cell
                  key={index}
                  title={`记录 ${index + 1}`}
                  label={formatRecord(record)}
                  v-slots={{
                    value: () => (
                      <Tag size="small">{record.tnf}</Tag>
                    ),
                  }}
                />
              ))}
            </CellGroup>
          </div>
        )}

        {/* 写入功能 */}
        <div style={{ fontSize: '14px', marginBottom: '8px', color: '#666', marginTop: '12px' }}>
          写入 NFC 标签
        </div>

        <CellGroup inset>
          <Field
            v-model={writeText.value}
            label="文本"
            placeholder="输入要写入的文本"
            v-slots={{
              button: () => (
                <Button 
                  size="small" 
                  type="primary" 
                  onClick={writeTextToTag}
                  disabled={!writeText.value || !isAvailable.value}
                >
                  写入
                </Button>
              ),
            }}
          />
          <Field
            v-model={writeUri.value}
            label="URI"
            placeholder="输入要写入的 URI"
            v-slots={{
              button: () => (
                <Button 
                  size="small" 
                  type="primary" 
                  onClick={writeUriToTag}
                  disabled={!writeUri.value || !isAvailable.value}
                >
                  写入
                </Button>
              ),
            }}
          />
        </CellGroup>
      </div>
    )
  },
})
