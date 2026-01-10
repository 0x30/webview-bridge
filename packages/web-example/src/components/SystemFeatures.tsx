import { defineComponent, ref } from 'vue'
import { Button, Field, Dialog, Toast, showToast } from 'vant'
import { Bridge } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'SystemFeatures',
  emits: ['log'],
  setup(_, { emit }) {
    const urlDialogVisible = ref(false)
    const urlInput = ref('https://www.apple.com')

    /**
     * 触发震动 - 轻
     */
    async function hapticLight() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.haptics.impact('light')
        emit('log', 'success', '轻触反馈已触发')
      } catch (error) {
        emit('log', 'error', `震动失败: ${error}`)
      }
    }

    /**
     * 触发震动 - 中
     */
    async function hapticMedium() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.haptics.impact('medium')
        emit('log', 'success', '中等反馈已触发')
      } catch (error) {
        emit('log', 'error', `震动失败: ${error}`)
      }
    }

    /**
     * 触发震动 - 重
     */
    async function hapticHeavy() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.haptics.impact('heavy')
        emit('log', 'success', '重度反馈已触发')
      } catch (error) {
        emit('log', 'error', `震动失败: ${error}`)
      }
    }

    /**
     * 打开 URL
     */
    async function openUrl() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      const url = urlInput.value.trim()
      if (!url) {
        showToast('请输入 URL')
        return
      }

      try {
        await Bridge.system.openURL(url)
        emit('log', 'success', `已打开: ${url}`)
        urlDialogVisible.value = false
      } catch (error) {
        emit('log', 'error', `打开 URL 失败: ${error}`)
      }
    }

    /**
     * 分享内容
     */
    async function share() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.system.share({
          type: 'text',
          text: 'WebView Bridge SDK 示例分享',
          url: 'https://github.com',
        })
        emit('log', 'success', '分享成功')
      } catch (error) {
        emit('log', 'error', `分享失败: ${error}`)
      }
    }

    /**
     * 复制到剪贴板
     */
    async function copyText() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.clipboard.set({
          type: 'text',
          text: 'Hello from WebView Bridge!',
        })
        emit('log', 'success', '已复制到剪贴板')
        Toast.success('已复制')
      } catch (error) {
        emit('log', 'error', `复制失败: ${error}`)
      }
    }

    /**
     * 读取剪贴板
     */
    async function readClipboard() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.clipboard.get('text')
        emit('log', 'success', `剪贴板内容: ${result.text || '(空)'}`)
        showToast(`剪贴板: ${result.text || '(空)'}`)
      } catch (error) {
        emit('log', 'error', `读取失败: ${error}`)
      }
    }

    return () => (
      <div class="section">
        <div class="section-title">⚡ 系统功能</div>

        {/* 触觉反馈 */}
        <div style={{ marginBottom: '12px' }}>
          <div class="info-label" style={{ marginBottom: '8px' }}>
            触觉反馈
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="small" onClick={hapticLight}>
              轻
            </Button>
            <Button size="small" onClick={hapticMedium}>
              中
            </Button>
            <Button size="small" onClick={hapticHeavy}>
              重
            </Button>
          </div>
        </div>

        {/* 系统功能 */}
        <div style={{ marginBottom: '12px' }}>
          <div class="info-label" style={{ marginBottom: '8px' }}>
            系统操作
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={() => (urlDialogVisible.value = true)}
            >
              打开 URL
            </Button>
            <Button size="small" onClick={share}>
              分享
            </Button>
          </div>
        </div>

        {/* 剪贴板 */}
        <div>
          <div class="info-label" style={{ marginBottom: '8px' }}>
            剪贴板
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="small" onClick={copyText}>
              复制文本
            </Button>
            <Button size="small" onClick={readClipboard}>
              读取剪贴板
            </Button>
          </div>
        </div>

        {/* URL 输入对话框 */}
        <Dialog
          v-model:show={urlDialogVisible.value}
          title="打开 URL"
          show-cancel-button
          onConfirm={openUrl}
        >
          <Field
            v-model={urlInput.value}
            placeholder="请输入 URL"
            style={{ padding: '16px' }}
          />
        </Dialog>
      </div>
    )
  },
})
