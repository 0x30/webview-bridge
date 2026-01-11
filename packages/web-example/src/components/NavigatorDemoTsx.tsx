/**
 * Navigator 模块 Demo 组件 (TSX 版本)
 */

import { defineComponent, ref, onMounted } from 'vue'
import { CellGroup, Cell, Field, Button, Toast, Tag, Divider, Badge } from 'vant'
import { Bridge } from '@aspect/webview-bridge'

interface PageInfo {
  id: string
  url: string
  title: string
  index: number
}

export default defineComponent({
  name: 'NavigatorDemoTsx',
  props: {
    onLog: {
      type: Function,
      required: false
    }
  },
  setup(props) {
    const isLoading = ref(false)
    const pageStack = ref<PageInfo[]>([])
    const currentPage = ref<PageInfo | null>(null)

    const log = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      console.log(`[${type}] ${message}`)
      props.onLog?.(type, message)
    }

    const fetchPageInfo = async () => {
      try {
        const [stackResult, currentResult] = await Promise.all([
          Bridge.navigator.getPages(),
          Bridge.navigator.getCurrentPage()
        ])
        pageStack.value = stackResult.pages
        currentPage.value = currentResult
        log('info', `页面栈: ${pageStack.value.length} 页, 当前: ${currentPage.value?.id}`)
      } catch (error: any) {
        log('error', `获取页面信息失败: ${error.message}`)
      }
    }

    const openBootstrapPage = async () => {
      try {
        isLoading.value = true
        // 打开自举测试页面
        const bootstrapUrl = window.location.origin + '/bootstrap.html'
        const result = await Bridge.navigator.push({
          url: bootstrapUrl,
          title: '自举测试',
          data: {
            source: 'NavigatorDemo',
            timestamp: Date.now()
          }
        })
        log('success', `打开自举页面: ${result.id}`)
        Toast.success('已打开自举页面')
        await fetchPageInfo()
      } catch (error: any) {
        log('error', `打开页面失败: ${error.message}`)
        Toast.fail(error.message || '打开页面失败')
      } finally {
        isLoading.value = false
      }
    }

    const openCurrentPage = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.push({
          url: window.location.href,
          title: `页面 ${pageStack.value.length + 1}`,
          data: {
            fromPage: currentPage.value?.id,
            timestamp: Date.now()
          }
        })
        log('success', `打开新页面: ${result.id}`)
        Toast.success('已打开新页面')
        await fetchPageInfo()
      } catch (error: any) {
        log('error', `打开页面失败: ${error.message}`)
        Toast.fail(error.message || '打开页面失败')
      } finally {
        isLoading.value = false
      }
    }

    const goBack = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.pop({
          result: { action: 'back' }
        })
        if (result.popped) {
          log('success', '已返回上一页')
        } else {
          log('info', result.reason || '无法返回')
          Toast(result.reason || '无法返回')
        }
      } catch (error: any) {
        log('error', `返回失败: ${error.message}`)
        Toast.fail(error.message || '返回失败')
      } finally {
        isLoading.value = false
      }
    }

    const closePage = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.close({
          result: { action: 'closed', timestamp: Date.now() }
        })
        if (result.closed) {
          log('success', '已关闭当前页面')
          Toast.success('已关闭')
        }
      } catch (error: any) {
        log('error', `关闭失败: ${error.message}`)
        Toast.fail(error.message || '关闭失败')
      } finally {
        isLoading.value = false
      }
    }

    const openPageWithoutNavBar = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.push({
          url: window.location.href,
          title: '无导航栏页面',
          navigationBarHidden: true,
          data: {
            hideNavBar: true,
            timestamp: Date.now()
          }
        })
        log('success', `打开无导航栏页面: ${result.id}`)
        Toast.success('已打开（隐藏导航栏）')
        await fetchPageInfo()
      } catch (error: any) {
        log('error', `打开页面失败: ${error.message}`)
        Toast.fail(error.message || '打开页面失败')
      } finally {
        isLoading.value = false
      }
    }

    const goToRoot = async () => {
      try {
        isLoading.value = true
        await Bridge.navigator.popToRoot()
        log('success', '已返回根页面')
        Toast.success('已返回根页面')
      } catch (error: any) {
        log('error', `返回根页面失败: ${error.message}`)
        Toast.fail(error.message || '返回失败')
      } finally {
        isLoading.value = false
      }
    }

    onMounted(() => {
      if (Bridge.isNative) {
        Bridge.whenReady().then(fetchPageInfo)
      }
    })

    return () => (
      <div class="section">
        <div class="section-title">📚 页面栈导航</div>
        
        <CellGroup inset>
          <Cell
            title="页面栈深度"
            value={
              <Badge content={pageStack.value.length || 0} />
            }
          />
          <Cell
            title="当前页面"
            value={currentPage.value?.title || currentPage.value?.id || '未知'}
            label={currentPage.value?.id}
          />
        </CellGroup>

        <div class="button-group" style={{ marginTop: '12px' }}>
          <Button
            type="primary"
            block
            loading={isLoading.value}
            onClick={openBootstrapPage}
          >
            打开自举测试页面
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={openCurrentPage}
          >
            打开当前页面副本
          </Button>
          
          <Button
            type="success"
            block
            loading={isLoading.value}
            onClick={openPageWithoutNavBar}
          >
            打开无导航栏页面 (iOS)
          </Button>
          
          <Button
            type="default"
            block
            loading={isLoading.value}
            onClick={goBack}
            disabled={pageStack.value.length <= 1}
          >
            返回上一页 (Pop)
          </Button>
          
          <Button
            type="primary"
            block
            loading={isLoading.value}
            onClick={closePage}
            disabled={pageStack.value.length <= 1}
          >
            关闭当前页面 (Close)
          </Button>
          
          <Button
            type="warning"
            block
            loading={isLoading.value}
            onClick={goToRoot}
            disabled={pageStack.value.length <= 1}
          >
            返回根页面
          </Button>
          
          <Button
            type="default"
            block
            onClick={fetchPageInfo}
          >
            刷新页面信息
          </Button>
        </div>

        {pageStack.value.length > 0 && (
          <>
            <Divider>页面栈</Divider>
            <div class="page-stack">
              {pageStack.value.map((page, index) => (
                <div
                  key={page.id}
                  class={`page-stack-item ${page.id === currentPage.value?.id ? 'current' : ''}`}
                >
                  <div class="page-index">{index}</div>
                  <div class="page-info">
                    <div class="page-title">{page.title || '未命名'}</div>
                    <div class="page-id">{page.id}</div>
                  </div>
                  {page.id === currentPage.value?.id && (
                    <Tag type="primary" size="small">当前</Tag>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div class="tip-box" style={{ marginTop: '12px', padding: '12px', background: '#f8f8f8', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
          <p>💡 提示：</p>
          <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
            <li>自举：打开当前页面创建新的 WebView 实例</li>
            <li>支持页面间数据传递和消息通信</li>
            <li>类似小程序的多页面栈管理</li>
            <li><strong>Close</strong>: 关闭当前页面（语义更明确）</li>
            <li><strong>navigationBarHidden</strong>: iOS 可隐藏导航栏</li>
          </ul>
        </div>
      </div>
    )
  }
})
