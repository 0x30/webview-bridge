/**
 * Browser 模块 Demo 组件 (TSX 版本)
 */

import { defineComponent, ref } from 'vue'
import { CellGroup, Cell, Field, Button, Toast, Divider } from 'vant'
import { Bridge } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'BrowserDemoTsx',
  props: {
    onLog: {
      type: Function,
      required: false
    }
  },
  setup(props) {
    const isLoading = ref(false)
    const urlInput = ref('https://www.baidu.com')
    const prefetchUrls = ref('https://www.apple.com,https://www.google.com')

    const log = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      console.log(`[${type}] ${message}`)
      props.onLog?.(type, message)
    }

    const openBrowser = async () => {
      if (!urlInput.value) {
        Toast('请输入 URL')
        return
      }

      try {
        isLoading.value = true
        log('info', `打开浏览器: ${urlInput.value}`)
        const result = await Bridge.browser.open({
          url: urlInput.value,
          toolbarColor: '#3880ff',
          showTitle: true,
          presentationStyle: 'fullScreen',
        })
        log('success', `浏览器打开成功: ${JSON.stringify(result)}`)
        if (result.fallback) {
          Toast('使用系统浏览器打开')
        }
      } catch (error: any) {
        log('error', `打开浏览器失败: ${error.message}`)
        Toast.fail(error.message || '打开浏览器失败')
      } finally {
        isLoading.value = false
      }
    }

    const closeBrowser = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.browser.close()
        if (result.closed) {
          log('success', '浏览器已关闭')
          Toast.success('浏览器已关闭')
        } else {
          log('info', result.reason || '无法关闭浏览器')
          Toast(result.reason || '无法关闭浏览器')
        }
      } catch (error: any) {
        log('error', `关闭浏览器失败: ${error.message}`)
        Toast.fail(error.message || '关闭浏览器失败')
      } finally {
        isLoading.value = false
      }
    }

    const prefetchBrowser = async () => {
      const urls = prefetchUrls.value.split(',').map(u => u.trim()).filter(Boolean)
      
      if (urls.length === 0) {
        Toast('请输入 URL 列表')
        return
      }

      try {
        isLoading.value = true
        const result = await Bridge.browser.prefetch(urls)
        log('success', `已预加载 ${result.count} 个 URL`)
        Toast.success(`已预加载 ${result.count} 个 URL`)
      } catch (error: any) {
        log('error', `预加载失败: ${error.message}`)
        Toast.fail(error.message || '预加载失败')
      } finally {
        isLoading.value = false
      }
    }

    // 注册事件监听
    Bridge.browser.onOpened((data) => {
      log('info', `浏览器已打开: ${JSON.stringify(data)}`)
    })

    Bridge.browser.onClosed(() => {
      log('info', '浏览器已关闭')
    })

    Bridge.browser.onPageLoaded((data) => {
      log('info', `页面已加载: ${JSON.stringify(data)}`)
    })

    return () => (
      <div class="section">
        <div class="section-title">🌐 应用内浏览器</div>
        
        <CellGroup inset>
          <Field
            v-model={urlInput.value}
            label="网址"
            placeholder="输入要打开的网址"
            clearable
          />
        </CellGroup>

        <div class="button-group" style={{ marginTop: '12px' }}>
          <Button
            type="primary"
            block
            loading={isLoading.value}
            onClick={openBrowser}
          >
            打开浏览器
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={closeBrowser}
          >
            关闭浏览器
          </Button>
        </div>

        <Divider>快捷打开</Divider>
        
        <div class="button-group">
          <Button size="small" onClick={() => { urlInput.value = 'https://www.apple.com'; openBrowser() }}>
            Apple
          </Button>
          <Button size="small" onClick={() => { urlInput.value = 'https://www.baidu.com'; openBrowser() }}>
            百度
          </Button>
          <Button size="small" onClick={() => { urlInput.value = 'https://github.com'; openBrowser() }}>
            GitHub
          </Button>
        </div>

        <Divider>预加载</Divider>
        
        <CellGroup inset>
          <Field
            v-model={prefetchUrls.value}
            label="URLs"
            placeholder="逗号分隔多个网址"
            type="textarea"
            rows={2}
          />
        </CellGroup>

        <Button
          type="default"
          block
          style={{ marginTop: '12px' }}
          loading={isLoading.value}
          onClick={prefetchBrowser}
        >
          预加载 URL
        </Button>

        <div class="tip-box" style={{ marginTop: '12px', padding: '12px', background: '#f8f8f8', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
          <p>💡 提示：</p>
          <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
            <li>iOS 使用 Safari View Controller</li>
            <li>Android 使用 Chrome Custom Tabs</li>
            <li>Android 上不支持程序化关闭</li>
          </ul>
        </div>
      </div>
    )
  }
})
