/**
 * Keyboard 模块 Demo 组件
 */

import { ref } from 'vue'
import { showToast } from 'vant'
import Bridge from '@aspect/webview-bridge'

export default {
  name: 'KeyboardDemo',
  setup() {
    const isLoading = ref(false)
    const keyboardInfo = ref<any>(null)

    const showKeyboard = async () => {
      try {
        isLoading.value = true
        await Bridge.keyboard.show()
        showToast('键盘显示请求已发送')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '显示键盘失败' })
      } finally {
        isLoading.value = false
      }
    }

    const hideKeyboard = async () => {
      try {
        isLoading.value = true
        await Bridge.keyboard.hide()
        showToast('键盘隐藏请求已发送')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '隐藏键盘失败' })
      } finally {
        isLoading.value = false
      }
    }

    const getKeyboardInfo = async () => {
      try {
        isLoading.value = true
        const info = await Bridge.keyboard.getInfo()
        keyboardInfo.value = info
        showToast(`键盘${info.isVisible ? '可见' : '隐藏'}`)
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '获取键盘信息失败' })
      } finally {
        isLoading.value = false
      }
    }

    // 监听键盘事件
    const setupListeners = () => {
      Bridge.keyboard.onWillShow((data) => {
        console.log('键盘即将显示:', data)
        showToast(`键盘即将显示 (高度: ${data.height}px)`)
      })

      Bridge.keyboard.onDidShow((data) => {
        console.log('键盘已显示:', data)
      })

      Bridge.keyboard.onWillHide(() => {
        console.log('键盘即将隐藏')
      })

      Bridge.keyboard.onDidHide(() => {
        console.log('键盘已隐藏')
        showToast('键盘已隐藏')
      })
    }

    // 初始化时设置监听器
    setupListeners()

    return {
      isLoading,
      keyboardInfo,
      showKeyboard,
      hideKeyboard,
      getKeyboardInfo,
    }
  },
  template: `
    <div class="demo-section">
      <h3>Keyboard 键盘控制</h3>
      
      <van-cell-group inset>
        <van-cell title="显示键盘" is-link @click="showKeyboard" :clickable="!isLoading" />
        <van-cell title="隐藏键盘" is-link @click="hideKeyboard" :clickable="!isLoading" />
        <van-cell title="获取键盘信息" is-link @click="getKeyboardInfo" :clickable="!isLoading" />
      </van-cell-group>

      <van-field
        v-model="inputValue"
        placeholder="点击这里显示键盘"
        style="margin-top: 16px;"
      />

      <div v-if="keyboardInfo" class="result-box">
        <pre>{{ JSON.stringify(keyboardInfo, null, 2) }}</pre>
      </div>
    </div>
  `,
  data() {
    return {
      inputValue: ''
    }
  }
}
