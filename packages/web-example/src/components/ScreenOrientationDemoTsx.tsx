/**
 * ScreenOrientation 屏幕方向模块 Demo 组件 (TSX 版本)
 */

import { defineComponent, ref, onMounted } from 'vue'
import { CellGroup, Cell, Button, Toast, Divider, Tag, ActionSheet } from 'vant'
import { Bridge } from '@aspect/webview-bridge'

type OrientationType = 'portrait' | 'landscape' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary' | 'any'

export default defineComponent({
  name: 'ScreenOrientationDemoTsx',
  props: {
    onLog: {
      type: Function,
      required: false
    }
  },
  setup(props) {
    const isLoading = ref(false)
    const orientationInfo = ref<any>(null)
    const isLocked = ref(false)
    const showActionSheet = ref(false)

    const orientationOptions = [
      { name: '竖屏', value: 'portrait' },
      { name: '横屏', value: 'landscape' },
      { name: '竖屏正向', value: 'portrait-primary' },
      { name: '竖屏反向', value: 'portrait-secondary' },
      { name: '横屏正向', value: 'landscape-primary' },
      { name: '横屏反向', value: 'landscape-secondary' },
      { name: '任意方向', value: 'any' },
    ]

    const log = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      console.log(`[${type}] ${message}`)
      props.onLog?.(type, message)
    }

    const getOrientation = async () => {
      try {
        isLoading.value = true
        const info = await Bridge.screenOrientation.get()
        orientationInfo.value = info
        log('info', `当前方向: ${info.type}, 角度: ${info.angle}°`)
        Toast.success(`当前方向: ${info.type}`)
      } catch (error: any) {
        log('error', `获取方向失败: ${error.message}`)
        Toast.fail(error.message || '获取方向失败')
      } finally {
        isLoading.value = false
      }
    }

    const lockOrientation = async (orientation: OrientationType) => {
      try {
        isLoading.value = true
        await Bridge.screenOrientation.lock(orientation)
        isLocked.value = true
        log('success', `已锁定为: ${orientation}`)
        Toast.success(`已锁定为: ${orientation}`)
        await getOrientation()
      } catch (error: any) {
        log('error', `锁定方向失败: ${error.message}`)
        Toast.fail(error.message || '锁定方向失败')
      } finally {
        isLoading.value = false
      }
    }

    const unlockOrientation = async () => {
      try {
        isLoading.value = true
        await Bridge.screenOrientation.unlock()
        isLocked.value = false
        log('success', '已解锁屏幕方向')
        Toast.success('已解锁屏幕方向')
      } catch (error: any) {
        log('error', `解锁方向失败: ${error.message}`)
        Toast.fail(error.message || '解锁方向失败')
      } finally {
        isLoading.value = false
      }
    }

    const handleActionSelect = (action: { name: string; value: string }) => {
      lockOrientation(action.value as OrientationType)
      showActionSheet.value = false
    }

    // 监听方向变化
    Bridge.screenOrientation.onChange((info) => {
      log('info', `屏幕方向变化: ${info.type}, 角度: ${info.angle}°`)
      orientationInfo.value = info
    })

    // 初始化获取方向
    onMounted(() => {
      if (Bridge.isNative) {
        Bridge.whenReady().then(getOrientation)
      }
    })

    // 获取方向图标
    const getOrientationIcon = () => {
      if (!orientationInfo.value) return '📱'
      const type = orientationInfo.value.type
      if (type.includes('landscape')) return '📱↔️'
      return '📱'
    }

    return () => (
      <div class="section">
        <div class="section-title">🔄 屏幕方向</div>
        
        <CellGroup inset>
          <Cell
            title="当前方向"
            value={orientationInfo.value?.type || '未知'}
            label={orientationInfo.value ? `角度: ${orientationInfo.value.angle}°` : undefined}
          />
          <Cell
            title="锁定状态"
            value={
              <Tag type={isLocked.value ? 'warning' : 'default'}>
                {isLocked.value ? '已锁定' : '未锁定'}
              </Tag>
            }
          />
        </CellGroup>

        <div class="button-group" style={{ marginTop: '12px' }}>
          <Button
            type="primary"
            block
            loading={isLoading.value}
            onClick={getOrientation}
          >
            获取当前方向
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={() => showActionSheet.value = true}
          >
            锁定方向...
          </Button>
          
          <Button
            type="warning"
            block
            loading={isLoading.value}
            onClick={unlockOrientation}
            disabled={!isLocked.value}
          >
            解锁方向
          </Button>
        </div>

        <Divider>快捷操作</Divider>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => lockOrientation('portrait')}>
            竖屏
          </Button>
          <Button size="small" onClick={() => lockOrientation('landscape')}>
            横屏
          </Button>
          <Button size="small" onClick={() => lockOrientation('any')}>
            任意
          </Button>
        </div>

        <ActionSheet
          show={showActionSheet.value}
          onUpdate:show={(v: boolean) => showActionSheet.value = v}
          actions={orientationOptions}
          onSelect={handleActionSelect}
          cancel-text="取消"
        />

        <div class="tip-box" style={{ marginTop: '12px', padding: '12px', background: '#f8f8f8', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
          <p>💡 提示：</p>
          <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
            <li>portrait: 竖屏模式</li>
            <li>landscape: 横屏模式</li>
            <li>锁定方向后设备旋转不会改变界面</li>
          </ul>
        </div>
      </div>
    )
  }
})
