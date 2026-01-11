/**
 * ScreenOrientation 模块 Demo 组件
 */

import { ref } from 'vue'
import { showToast, showActionSheet } from 'vant'
import Bridge from '@aspect/webview-bridge'

export default {
  name: 'ScreenOrientationDemo',
  setup() {
    const isLoading = ref(false)
    const orientationInfo = ref<any>(null)

    const getOrientation = async () => {
      try {
        isLoading.value = true
        const info = await Bridge.screenOrientation.get()
        orientationInfo.value = info
        showToast(`当前方向: ${info.type}`)
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '获取方向失败' })
      } finally {
        isLoading.value = false
      }
    }

    const lockOrientation = async () => {
      const actions = [
        { name: '竖屏', value: 'portrait' },
        { name: '横屏', value: 'landscape' },
        { name: '竖屏正向', value: 'portrait-primary' },
        { name: '竖屏反向', value: 'portrait-secondary' },
        { name: '横屏正向', value: 'landscape-primary' },
        { name: '横屏反向', value: 'landscape-secondary' },
        { name: '任意方向', value: 'any' },
      ]

      try {
        const result = await showActionSheet({ actions })
        const orientation = actions[result.index as number]?.value
        
        if (orientation) {
          isLoading.value = true
          await Bridge.screenOrientation.lock(orientation as any)
          showToast(`已锁定为: ${orientation}`)
        }
      } catch (error: any) {
        if (error.message !== 'cancel') {
          showToast({ type: 'fail', message: error.message || '锁定方向失败' })
        }
      } finally {
        isLoading.value = false
      }
    }

    const unlockOrientation = async () => {
      try {
        isLoading.value = true
        await Bridge.screenOrientation.unlock()
        showToast('已解锁屏幕方向')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '解锁方向失败' })
      } finally {
        isLoading.value = false
      }
    }

    // 监听方向变化
    Bridge.screenOrientation.onChange((info) => {
      console.log('屏幕方向变化:', info)
      orientationInfo.value = info
      showToast(`方向变化: ${info.type}`)
    })

    return {
      isLoading,
      orientationInfo,
      getOrientation,
      lockOrientation,
      unlockOrientation,
    }
  },
  template: `
    <div class="demo-section">
      <h3>ScreenOrientation 屏幕方向</h3>
      
      <van-cell-group inset>
        <van-cell title="获取当前方向" is-link @click="getOrientation" :clickable="!isLoading" />
        <van-cell title="锁定方向" is-link @click="lockOrientation" :clickable="!isLoading" />
        <van-cell title="解锁方向" is-link @click="unlockOrientation" :clickable="!isLoading" />
      </van-cell-group>

      <div v-if="orientationInfo" class="result-box">
        <pre>{{ JSON.stringify(orientationInfo, null, 2) }}</pre>
      </div>
    </div>
  `
}
