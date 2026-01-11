/**
 * 自举测试页面
 * 
 * 用于测试 Navigator.Push 打开当前页面的功能
 * 这是小程序多页面栈的核心功能
 */

import { defineComponent, ref, onMounted, computed } from 'vue'
import { NavBar, Button, Tag, Cell, CellGroup, Field, Dialog, Toast, ConfigProvider, Divider, Badge } from 'vant'
import { Bridge } from '@aspect/webview-bridge'
import './styles/index.css'

interface PageInfo {
  id: string
  url: string
  title: string
  index: number
  createdAt: number
}

interface Message {
  from: PageInfo
  message: any
  receivedAt: number
}

export default defineComponent({
  name: 'BootstrapApp',
  setup() {
    // 状态
    const bridgeReady = ref(false)
    const isNative = ref(false)
    const isLoading = ref(false)
    const colorScheme = ref<'light' | 'dark'>('light')
    
    // 页面栈信息
    const pageStack = ref<PageInfo[]>([])
    const currentPage = ref<PageInfo | null>(null)
    const launchData = ref<any>(null)
    
    // 消息
    const messages = ref<Message[]>([])
    const messageInput = ref('')
    
    // 计算属性
    const pageIndex = computed(() => currentPage.value?.index ?? 0)
    const pageId = computed(() => currentPage.value?.id ?? 'unknown')
    const pageCount = computed(() => pageStack.value.length)
    
    /**
     * 初始化 Bridge
     */
    async function initBridge() {
      try {
        isNative.value = Bridge.isNative
        
        if (isNative.value) {
          await Bridge.whenReady()
          bridgeReady.value = true
          console.log('✅ Bridge 已就绪')
          
          // 监听页面事件
          Bridge.addEventListener('Navigator.PageCreated', handlePageCreated)
          Bridge.addEventListener('Navigator.LaunchData', handleLaunchData)
          Bridge.addEventListener('Navigator.Message', handleMessage)
          Bridge.addEventListener('Navigator.Result', handleResult)
          Bridge.addEventListener('Navigator.PageDestroyed', handlePageDestroyed)
          
          // 获取初始信息
          await fetchPageInfo()
          checkLaunchData()
          
          // 获取外观
          try {
            const scheme = await Bridge.system.getColorScheme()
            colorScheme.value = scheme.colorScheme
          } catch {
            // 忽略
          }
        } else {
          console.log('⚠️ 运行在浏览器环境')
        }
      } catch (error) {
        console.error('❌ Bridge 初始化失败:', error)
      }
    }
    
    /**
     * 获取页面信息
     */
    async function fetchPageInfo() {
      try {
        const [stackResult, currentResult] = await Promise.all([
          Bridge.navigator.getPages(),
          Bridge.navigator.getCurrentPage()
        ])
        pageStack.value = stackResult.pages
        currentPage.value = currentResult
        console.log('📄 页面栈:', pageStack.value)
        console.log('📍 当前页面:', currentPage.value)
      } catch (error) {
        console.error('获取页面信息失败:', error)
      }
    }
    
    /**
     * 检查启动数据
     */
    function checkLaunchData() {
      launchData.value = Bridge.navigator.launchData
      if (launchData.value) {
        console.log('🚀 启动数据:', launchData.value)
        Toast.success('收到启动数据')
      }
    }
    
    /**
     * 处理页面创建事件
     */
    function handlePageCreated(data: any) {
      console.log('📄 页面创建:', data)
      if (data.data) {
        launchData.value = data.data
      }
      fetchPageInfo()
    }
    
    /**
     * 处理启动数据事件
     */
    function handleLaunchData(data: any) {
      console.log('🚀 收到启动数据:', data)
      launchData.value = data
      Toast.success('收到启动数据')
    }
    
    /**
     * 处理消息事件
     */
    function handleMessage(data: { from: PageInfo; message: any }) {
      console.log('💬 收到消息:', data)
      messages.value.unshift({
        from: data.from,
        message: data.message,
        receivedAt: Date.now()
      })
      Toast.success(`收到来自页面 ${data.from.index} 的消息`)
    }
    
    /**
     * 处理返回结果事件
     */
    function handleResult(data: { from: PageInfo; result: any }) {
      console.log('📥 收到返回结果:', data)
      Dialog.alert({
        title: '收到返回结果',
        message: `来自页面 ${data.from.id}\n\n${JSON.stringify(data.result, null, 2)}`
      })
    }
    
    /**
     * 处理页面销毁事件
     */
    function handlePageDestroyed(data: any) {
      console.log('🗑️ 页面销毁:', data)
    }
    
    /**
     * 自举 - 打开当前页面
     */
    async function openSelf() {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.push({
          url: window.location.href,
          title: `自举页面 ${pageCount.value + 1}`,
          data: {
            fromPage: currentPage.value?.id,
            fromIndex: currentPage.value?.index,
            timestamp: Date.now(),
            greeting: `你好！这是从页面 ${currentPage.value?.index ?? 0} 传来的数据`
          }
        })
        console.log('✅ 打开新页面:', result)
        Toast.success(`打开了页面 ${result.id}`)
        await fetchPageInfo()
      } catch (error: any) {
        console.error('❌ 打开页面失败:', error)
        Toast.fail(error.message || '打开页面失败')
      } finally {
        isLoading.value = false
      }
    }
    
    /**
     * 返回上一页
     */
    async function goBack() {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.pop({
          result: {
            action: 'back',
            message: `来自页面 ${currentPage.value?.index} 的返回数据`,
            timestamp: Date.now()
          }
        })
        if (!result.popped) {
          Toast(result.reason || '无法返回')
        }
      } catch (error: any) {
        console.error('❌ 返回失败:', error)
        Toast.fail(error.message || '返回失败')
      } finally {
        isLoading.value = false
      }
    }
    
    /**
     * 返回到根页面
     */
    async function goToRoot() {
      if (pageCount.value <= 1) {
        Toast('已经是根页面')
        return
      }
      
      try {
        isLoading.value = true
        await Bridge.navigator.popToRoot()
        Toast.success('已返回根页面')
      } catch (error: any) {
        console.error('❌ 返回根页面失败:', error)
        Toast.fail(error.message || '返回失败')
      } finally {
        isLoading.value = false
      }
    }
    
    /**
     * 发送消息给其他页面
     */
    async function sendMessage() {
      if (!messageInput.value.trim()) {
        Toast('请输入消息内容')
        return
      }
      
      try {
        const result = await Bridge.navigator.postMessage({
          message: {
            text: messageInput.value,
            from: currentPage.value?.id,
            timestamp: Date.now()
          }
        })
        if (result.sent) {
          Toast.success('消息已发送')
          messageInput.value = ''
        } else {
          Toast.fail('发送失败')
        }
      } catch (error: any) {
        Toast.fail(error.message || '发送失败')
      }
    }
    
    /**
     * 修改页面标题
     */
    async function setPageTitle() {
      const title = await Dialog.prompt({
        title: '设置页面标题',
        placeholder: '请输入新标题'
      })
      
      if (title) {
        try {
          await Bridge.navigator.setTitle(title)
          Toast.success('标题已更新')
        } catch (error: any) {
          Toast.fail(error.message || '设置失败')
        }
      }
    }
    
    onMounted(() => {
      initBridge()
    })
    
    return () => (
      <ConfigProvider theme={colorScheme.value}>
        <div class="page-container" style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
          {/* 导航栏 */}
          <NavBar
            title={`自举测试 (页面 ${pageIndex.value})`}
            left-arrow={pageIndex.value > 0}
            onClickLeft={goBack}
          />
          
          {/* 页面状态 */}
          <div class="section">
            <div class="section-title">📄 页面状态</div>
            <CellGroup inset>
              <Cell title="Bridge 状态" value={
                <Tag type={bridgeReady.value ? 'success' : 'warning'}>
                  {bridgeReady.value ? '已就绪' : '未就绪'}
                </Tag>
              } />
              <Cell title="运行环境" value={
                <Tag type={isNative.value ? 'primary' : 'default'}>
                  {isNative.value ? 'Native' : 'Browser'}
                </Tag>
              } />
              <Cell title="当前页面索引" value={pageIndex.value} />
              <Cell title="页面 ID" value={pageId.value} label={pageId.value} />
              <Cell title="页面栈深度" value={
                <Badge content={pageCount.value} />
              } />
            </CellGroup>
          </div>
          
          {/* 自举操作 */}
          <div class="section">
            <div class="section-title">🚀 自举操作</div>
            <div class="button-group">
              <Button
                type="primary"
                size="large"
                block
                loading={isLoading.value}
                onClick={openSelf}
                disabled={!bridgeReady.value}
              >
                打开新页面 (自举)
              </Button>
              
              <Button
                type="default"
                size="large"
                block
                loading={isLoading.value}
                onClick={goBack}
                disabled={!bridgeReady.value || pageIndex.value === 0}
              >
                返回上一页
              </Button>
              
              <Button
                type="warning"
                size="large"
                block
                loading={isLoading.value}
                onClick={goToRoot}
                disabled={!bridgeReady.value || pageCount.value <= 1}
              >
                返回根页面
              </Button>
            </div>
          </div>
          
          {/* 启动数据 */}
          {launchData.value && (
            <div class="section">
              <div class="section-title">🚀 启动数据</div>
              <div class="code-block">
                {JSON.stringify(launchData.value, null, 2)}
              </div>
            </div>
          )}
          
          {/* 页面间通信 */}
          <div class="section">
            <div class="section-title">💬 页面间通信</div>
            <CellGroup inset>
              <Field
                v-model={messageInput.value}
                label="消息"
                placeholder="输入要发送的消息"
                clearable
              />
              <Cell>
                <Button
                  type="primary"
                  size="small"
                  onClick={sendMessage}
                  disabled={!bridgeReady.value}
                >
                  广播消息
                </Button>
              </Cell>
            </CellGroup>
            
            {messages.value.length > 0 && (
              <div class="message-list">
                <div class="message-title">收到的消息:</div>
                {messages.value.map((msg, index) => (
                  <div key={index} class="message-item">
                    <div class="message-from">来自页面 {msg.from.index}</div>
                    <div class="message-content">{JSON.stringify(msg.message)}</div>
                    <div class="message-time">
                      {new Date(msg.receivedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 其他操作 */}
          <div class="section">
            <div class="section-title">⚙️ 其他操作</div>
            <div class="button-group">
              <Button
                type="default"
                block
                onClick={setPageTitle}
                disabled={!bridgeReady.value}
              >
                修改页面标题
              </Button>
              
              <Button
                type="default"
                block
                onClick={fetchPageInfo}
                disabled={!bridgeReady.value}
              >
                刷新页面信息
              </Button>
            </div>
          </div>
          
          {/* 页面栈信息 */}
          <div class="section">
            <div class="section-title">📚 页面栈</div>
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
              {pageStack.value.length === 0 && (
                <div class="empty-hint">暂无页面信息</div>
              )}
            </div>
          </div>
          
          <Divider>WebView Bridge 自举测试</Divider>
        </div>
      </ConfigProvider>
    )
  }
})
