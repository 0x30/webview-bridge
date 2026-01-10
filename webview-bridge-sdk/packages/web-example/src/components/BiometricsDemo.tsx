import { defineComponent, ref } from 'vue'
import { Button, Tag, Dialog, Field, CellGroup } from 'vant'
import { Bridge, type BiometryType, type AuthenticateResult } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'BiometricsDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const biometryType = ref<BiometryType>('none')
    const biometryName = ref('')
    const isAvailable = ref(false)
    const isEnrolled = ref(false)
    const lastResult = ref<AuthenticateResult | null>(null)

    // 认证选项
    const showAuthDialog = ref(false)
    const authReason = ref('请验证您的身份以继续操作')

    /**
     * 检查可用性
     */
    async function checkAvailability() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const [availability, typeInfo] = await Promise.all([
          Bridge.biometrics.isAvailable(),
          Bridge.biometrics.getBiometryType(),
        ])

        isAvailable.value = availability.isAvailable
        biometryType.value = availability.biometryType
        biometryName.value = typeInfo.displayName

        emit('log', 'info', `生物识别: ${typeInfo.displayName} (${availability.isAvailable ? '可用' : '不可用'})`)
      } catch (error) {
        emit('log', 'error', `检查可用性失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 检查注册状态
     */
    async function checkEnrollment() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.biometrics.checkEnrollment()
        isEnrolled.value = result.isEnrolled
        
        let message = result.isEnrolled ? '已注册生物识别' : '未注册生物识别'
        if (result.reason) {
          message += ` (${result.reason})`
        }
        emit('log', result.isEnrolled ? 'success' : 'warning', message)
      } catch (error) {
        emit('log', 'error', `检查注册状态失败: ${error}`)
      }
    }

    /**
     * 进行认证
     */
    async function authenticate() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      showAuthDialog.value = false
      loading.value = true

      try {
        const result = await Bridge.biometrics.authenticate({
          reason: authReason.value,
          title: '身份验证',
          cancelTitle: '取消',
          allowDeviceCredential: false,
        })

        lastResult.value = result

        if (result.success) {
          emit('log', 'success', '认证成功 ✓')
        } else {
          emit('log', 'warning', `认证失败: ${result.reason || result.errorMessage}`)
        }
      } catch (error) {
        emit('log', 'error', `认证失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 快速认证
     */
    async function quickAuth() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        await Bridge.biometrics.verify('请验证您的身份')
        emit('log', 'success', '认证成功 ✓')
      } catch (error) {
        emit('log', 'error', `认证失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 获取生物识别图标
     */
    function getBiometryIcon(type: BiometryType): string {
      switch (type) {
        case 'faceId':
        case 'face':
          return '😊'
        case 'touchId':
        case 'fingerprint':
          return '👆'
        case 'iris':
          return '👁'
        case 'multiple':
          return '🔐'
        default:
          return '❌'
      }
    }

    return () => (
      <div class="section">
        <div class="section-title">🔐 生物识别</div>

        <Button
          type="primary"
          block
          loading={loading.value}
          onClick={checkAvailability}
          style={{ marginBottom: '8px' }}
        >
          检查可用性
        </Button>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Button style={{ flex: 1 }} onClick={checkEnrollment}>
            检查注册状态
          </Button>
          <Button style={{ flex: 1 }} onClick={() => (showAuthDialog.value = true)}>
            自定义认证
          </Button>
        </div>

        <Button
          type="success"
          block
          loading={loading.value}
          onClick={quickAuth}
          disabled={!isAvailable.value}
        >
          {getBiometryIcon(biometryType.value)} 快速认证
        </Button>

        {/* 状态信息 */}
        <div class="info-card" style={{ marginTop: '12px' }}>
          <div class="info-row">
            <span class="info-label">识别类型</span>
            <span class="info-value">
              {getBiometryIcon(biometryType.value)} {biometryName.value || biometryType.value}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">可用状态</span>
            <Tag type={isAvailable.value ? 'success' : 'danger'}>
              {isAvailable.value ? '可用' : '不可用'}
            </Tag>
          </div>
          <div class="info-row">
            <span class="info-label">注册状态</span>
            <Tag type={isEnrolled.value ? 'success' : 'warning'}>
              {isEnrolled.value ? '已注册' : '未注册'}
            </Tag>
          </div>
        </div>

        {/* 上次认证结果 */}
        {lastResult.value && (
          <div class="info-card" style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              上次认证结果
            </div>
            <div class="info-row">
              <span class="info-label">状态</span>
              <Tag type={lastResult.value.success ? 'success' : 'danger'}>
                {lastResult.value.success ? '成功' : '失败'}
              </Tag>
            </div>
            {!lastResult.value.success && lastResult.value.reason && (
              <div class="info-row">
                <span class="info-label">原因</span>
                <span class="info-value">{lastResult.value.reason}</span>
              </div>
            )}
          </div>
        )}

        {/* 自定义认证对话框 */}
        <Dialog
          v-model:show={showAuthDialog.value}
          title="自定义认证"
          showCancelButton
          onConfirm={authenticate}
        >
          <CellGroup inset>
            <Field
              v-model={authReason.value}
              label="认证原因"
              placeholder="请输入认证提示语"
              type="textarea"
              rows={2}
            />
          </CellGroup>
        </Dialog>
      </div>
    )
  },
})
