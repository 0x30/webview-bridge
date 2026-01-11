/**
 * Keyboard 模块 Demo 组件 (TSX 版本)
 */

import { defineComponent, ref } from 'vue'
import { CellGroup, Cell, Field, Button, Toast, Divider, Switch } from 'vant'
import { Bridge } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'KeyboardDemoTsx',
  props: {
    onLog: {
      type: Function,
      required: false
    }
  },
  setup(props) {
    const isLoading = ref(false)
    const keyboardInfo = ref<any>(null)
    const inputValue = ref('')
    const hideAccessoryBar = ref(false)

    const log = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      console.log(`[${type}] ${message}`)
      props.onLog?.(type, message)
    }

    const showKeyboard = async () => {
      try {
        isLoading.value = true
        await Bridge.keyboard.show()
        log('success', '键盘显示请求已发送')
        Toast.success('键盘显示请求已发送')
      } catch (error: any) {
        log('error', `显示键盘失败: ${error.message}`)
        Toast.fail(error.message || '显示键盘失败')
      } finally {
        isLoading.value = false
      }
    }

    const hideKeyboard = async () => {
      try {
        isLoading.value = true
        await Bridge.keyboard.hide()
        log('success', '键盘已隐藏')
        Toast.success('键盘已隐藏')
      } catch (error: any) {
        log('error', `隐藏键盘失败: ${error.message}`)
        Toast.fail(error.message || '隐藏键盘失败')
      } finally {
        isLoading.value = false
      }
    }

    const getKeyboardInfo = async () => {
      try {
        isLoading.value = true
        const info = await Bridge.keyboard.getInfo()
        keyboardInfo.value = info
        log('info', `键盘信息: ${JSON.stringify(info)}`)
        Toast.success(`键盘${info.isVisible ? '可见' : '隐藏'}`)
      } catch (error: any) {
        log('error', `获取键盘信息失败: ${error.message}`)
        Toast.fail(error.message || '获取键盘信息失败')
      } finally {
        isLoading.value = false
      }
    }

    const toggleAccessoryBar = async (value: boolean) => {
      try {
        hideAccessoryBar.value = value
        await Bridge.keyboard.setAccessoryBarVisible(!value)
        log('success', `键盘工具栏: ${value ? '已隐藏' : '已显示'}`)
        Toast.success(`工具栏${value ? '已隐藏' : '已显示'}`)
      } catch (error: any) {
        log('error', `设置工具栏失败: ${error.message}`)
        Toast.fail(error.message || '设置失败')
      }
    }

    // 监听键盘事件
    Bridge.keyboard.onWillShow((data) => {
      log('info', `键盘即将显示 (高度: ${data.height}px)`)
    })

    Bridge.keyboard.onDidShow((data) => {
      log('info', `键盘已显示 (高度: ${data.height}px)`)
      keyboardInfo.value = { isVisible: true, height: data.height }
    })

    Bridge.keyboard.onWillHide(() => {
      log('info', '键盘即将隐藏')
    })

    Bridge.keyboard.onDidHide(() => {
      log('info', '键盘已隐藏')
      keyboardInfo.value = { isVisible: false, height: 0 }
    })

    return () => (
      <div class="section">
        <div class="section-title">⌨️ 键盘控制</div>
        
        <CellGroup inset>
          <Field
            v-model={inputValue.value}
            label="输入框"
            placeholder="点击这里显示键盘"
            clearable
          />
          <Cell
            title="隐藏键盘工具栏"
            v-slots={{
              'right-icon': () => (
                <Switch
                  modelValue={hideAccessoryBar.value}
                  onChange={toggleAccessoryBar}
                  size="20px"
                />
              )
            }}
          />
        </CellGroup>

        <div class="button-group" style={{ marginTop: '12px' }}>
          <Button
            type="primary"
            block
            loading={isLoading.value}
            onClick={showKeyboard}
          >
            显示键盘
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={hideKeyboard}
          >
            隐藏键盘
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={getKeyboardInfo}
          >
            获取键盘信息
          </Button>
        </div>

        {keyboardInfo.value && (
          <>
            <Divider>键盘状态</Divider>
            <div class="code-block">
              {JSON.stringify(keyboardInfo.value, null, 2)}
            </div>
          </>
        )}

        <div class="tip-box" style={{ marginTop: '12px', padding: '12px', background: '#f8f8f8', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
          <p>💡 提示：</p>
          <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
            <li>iOS 支持隐藏键盘上方的工具栏</li>
            <li>可监听键盘显示/隐藏事件</li>
            <li>获取键盘高度用于调整布局</li>
          </ul>
        </div>
      </div>
    )
  }
})
