/**
 * Browser 模块 Demo 组件
 */

import { ref } from 'vue'
import { showToast, showDialog } from 'vant'
import Bridge from '@aspect/webview-bridge'

export default {
  name: 'BrowserDemo',
  setup() {
    const isLoading = ref(false)
    const urlInput = ref('https://www.baidu.com')
    const prefetchUrls = ref('https://www.apple.com,https://www.google.com')

    const openBrowser = async () => {
      if (!urlInput.value) {
        showToast('请输入 URL')
        return
      }

      try {
        isLoading.value = true
        const result = await Bridge.browser.open({
          url: urlInput.value,
          toolbarColor: '#3880ff',
          showTitle: true,
          presentationStyle: 'fullScreen',
        })
        console.log('浏览器打开结果:', result)
        if (result.fallback) {
          showToast('使用系统浏览器打开')
        }
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '打开浏览器失败' })
      } finally {
        isLoading.value = false
      }
    }

    const closeBrowser = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.browser.close()
        if (result.closed) {
          showToast('浏览器已关闭')
        } else {
          showToast(result.reason || '无法关闭浏览器')
        }
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '关闭浏览器失败' })
      } finally {
        isLoading.value = false
      }
    }

    const prefetchBrowser = async () => {
      const urls = prefetchUrls.value.split(',').map(u => u.trim()).filter(Boolean)
      
      if (urls.length === 0) {
        showToast('请输入 URL 列表')
        return
      }

      try {
        isLoading.value = true
        const result = await Bridge.browser.prefetch(urls)
        showToast(`已预加载 ${result.count} 个 URL`)
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '预加载失败' })
      } finally {
        isLoading.value = false
      }
    }

    const openApple = () => {
      urlInput.value = 'https://www.apple.com'
      openBrowser()
    }

    const openGoogle = () => {
      urlInput.value = 'https://www.google.com'
      openBrowser()
    }

    const openGithub = () => {
      urlInput.value = 'https://github.com'
      openBrowser()
    }

    // 监听浏览器事件
    Bridge.browser.onOpened((data) => {
      console.log('浏览器已打开:', data)
    })

    Bridge.browser.onClosed(() => {
      console.log('浏览器已关闭')
      showToast('浏览器已关闭')
    })

    Bridge.browser.onPageLoaded((data) => {
      console.log('页面已加载:', data)
    })

    return {
      isLoading,
      urlInput,
      prefetchUrls,
      openBrowser,
      closeBrowser,
      prefetchBrowser,
      openApple,
      openGoogle,
      openGithub,
    }
  },
  template: `
    <div class="demo-section">
      <h3>Browser 应用内浏览器</h3>
      
      <van-cell-group inset title="打开网页">
        <van-field
          v-model="urlInput"
          label="URL"
          placeholder="输入网址"
          clearable
        />
        <van-cell title="打开浏览器" is-link @click="openBrowser" :clickable="!isLoading" />
        <van-cell title="关闭浏览器" is-link @click="closeBrowser" :clickable="!isLoading" />
      </van-cell-group>

      <van-cell-group inset title="快捷打开">
        <van-cell title="Apple 官网" is-link @click="openApple" :clickable="!isLoading" />
        <van-cell title="Google" is-link @click="openGoogle" :clickable="!isLoading" />
        <van-cell title="GitHub" is-link @click="openGithub" :clickable="!isLoading" />
      </van-cell-group>

      <van-cell-group inset title="预加载">
        <van-field
          v-model="prefetchUrls"
          label="URLs"
          placeholder="逗号分隔多个网址"
          type="textarea"
          rows="2"
        />
        <van-cell title="预加载 URL" is-link @click="prefetchBrowser" :clickable="!isLoading" />
      </van-cell-group>

      <div class="tip-box">
        <p>💡 提示：</p>
        <ul>
          <li>iOS 使用 Safari View Controller</li>
          <li>Android 使用 Chrome Custom Tabs</li>
          <li>Android 上不支持程序化关闭</li>
        </ul>
      </div>
    </div>
  `
}
