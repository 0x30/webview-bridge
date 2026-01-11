/**
 * Navigator 模块 Demo 组件
 */

import { ref, onMounted } from 'vue'
import { showToast, showDialog } from 'vant'
import Bridge from '@aspect/webview-bridge'

export default {
  name: 'NavigatorDemo',
  setup() {
    const isLoading = ref(false)
    const pageStack = ref<any[]>([])
    const currentPage = ref<any>(null)
    const launchData = ref<any>(null)
    const messageInput = ref('')
    const messages = ref<any[]>([])

    // 获取页面栈
    const fetchPageStack = async () => {
      try {
        const result = await Bridge.navigator.getPages()
        pageStack.value = result.pages
      } catch (error) {
        console.log('获取页面栈失败:', error)
      }
    }

    // 获取当前页面
    const fetchCurrentPage = async () => {
      try {
        currentPage.value = await Bridge.navigator.getCurrentPage()
      } catch (error) {
        console.log('获取当前页面失败:', error)
      }
    }

    // 检查启动数据
    const checkLaunchData = () => {
      launchData.value = Bridge.navigator.launchData
    }

    // 打开新页面（自举）
    const openSelf = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.push({
          url: window.location.href,
          title: `页面 ${pageStack.value.length + 1}`,
          data: {
            fromPage: currentPage.value?.id,
            timestamp: Date.now(),
            greeting: '你好，这是从上一个页面传来的数据！'
          }
        })
        showToast(`打开了新页面: ${result.id}`)
        fetchPageStack()
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '打开页面失败' })
      } finally {
        isLoading.value = false
      }
    }

    // 打开指定 URL
    const openUrl = async (url: string, title: string) => {
      try {
        isLoading.value = true
        await Bridge.navigator.push({
          url,
          title,
          data: { source: 'demo' }
        })
        fetchPageStack()
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '打开页面失败' })
      } finally {
        isLoading.value = false
      }
    }

    // 返回上一页
    const goBack = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.pop({
          result: { action: 'back', message: '用户点击了返回' }
        })
        if (!result.popped) {
          showToast(result.reason || '无法返回')
        }
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '返回失败' })
      } finally {
        isLoading.value = false
      }
    }

    // 返回到根页面
    const goToRoot = async () => {
      try {
        isLoading.value = true
        const result = await Bridge.navigator.popToRoot()
        if (!result.popped) {
          showToast(result.reason || '已经是根页面')
        }
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '返回失败' })
      } finally {
        isLoading.value = false
      }
    }

    // 发送消息给上一页
    const sendMessageToPrevious = async () => {
      if (!messageInput.value.trim()) {
        showToast('请输入消息内容')
        return
      }

      try {
        const result = await Bridge.navigator.postMessageToPrevious({
          type: 'chat',
          content: messageInput.value,
          timestamp: Date.now()
        })
        if (result.sent) {
          showToast('消息已发送')
          messageInput.value = ''
        } else {
          showToast(result.reason || '发送失败')
        }
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '发送失败' })
      }
    }

    // 广播消息
    const broadcastMessage = async () => {
      try {
        await Bridge.navigator.broadcast({
          type: 'broadcast',
          content: '这是一条广播消息',
          from: currentPage.value?.id,
          timestamp: Date.now()
        })
        showToast('广播已发送')
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '广播失败' })
      }
    }

    // 设置页面标题
    const setPageTitle = async () => {
      showDialog({
        title: '设置标题',
        message: '请在控制台输入新标题',
      })
      // 简化处理
      const newTitle = `页面 ${Date.now() % 1000}`
      try {
        await Bridge.navigator.setTitle(newTitle)
        showToast(`标题已设置为: ${newTitle}`)
      } catch (error: any) {
        showToast({ type: 'fail', message: error.message || '设置失败' })
      }
    }

    // 设置事件监听
    onMounted(() => {
      fetchPageStack()
      fetchCurrentPage()
      checkLaunchData()

      // 监听来自其他页面的消息
      Bridge.navigator.onMessage((data) => {
        console.log('收到消息:', data)
        messages.value.unshift({
          id: Date.now(),
          from: data.from.id,
          message: data.message
        })
        showToast(`收到来自 ${data.from.id} 的消息`)
      })

      // 监听返回结果
      Bridge.navigator.onResult((data) => {
        console.log('收到返回结果:', data)
        showToast(`页面 ${data.from.id} 返回了数据`)
      })

      // 监听启动数据
      Bridge.navigator.onLaunchData((data) => {
        console.log('收到启动数据:', data)
        launchData.value = data
      })
    })

    return {
      isLoading,
      pageStack,
      currentPage,
      launchData,
      messageInput,
      messages,
      openSelf,
      openUrl,
      goBack,
      goToRoot,
      sendMessageToPrevious,
      broadcastMessage,
      setPageTitle,
      fetchPageStack,
    }
  },
  template: `
    <div class="demo-section">
      <h3>Navigator 页面栈管理</h3>
      
      <!-- 当前页面信息 -->
      <van-cell-group inset title="当前页面">
        <van-cell title="页面ID" :value="currentPage?.id || '未知'" />
        <van-cell title="页面索引" :value="currentPage?.index?.toString() || '0'" />
        <van-cell title="页面栈数量" :value="pageStack.length.toString()" />
      </van-cell-group>

      <!-- 启动数据 -->
      <van-cell-group inset title="启动数据" v-if="launchData">
        <div class="result-box">
          <pre>{{ JSON.stringify(launchData, null, 2) }}</pre>
        </div>
      </van-cell-group>

      <!-- 页面导航 -->
      <van-cell-group inset title="页面导航">
        <van-cell title="打开新页面（自举）" is-link @click="openSelf" :clickable="!isLoading">
          <template #label>在当前页面上打开自己的新实例</template>
        </van-cell>
        <van-cell title="返回上一页" is-link @click="goBack" :clickable="!isLoading" />
        <van-cell title="返回到根页面" is-link @click="goToRoot" :clickable="!isLoading" />
        <van-cell title="设置页面标题" is-link @click="setPageTitle" :clickable="!isLoading" />
      </van-cell-group>

      <!-- 页面间通信 -->
      <van-cell-group inset title="页面间通信">
        <van-field
          v-model="messageInput"
          label="消息"
          placeholder="输入要发送的消息"
          clearable
        />
        <van-cell title="发送给上一页" is-link @click="sendMessageToPrevious" :clickable="!isLoading" />
        <van-cell title="广播给所有页面" is-link @click="broadcastMessage" :clickable="!isLoading" />
      </van-cell-group>

      <!-- 收到的消息 -->
      <van-cell-group inset title="收到的消息" v-if="messages.length > 0">
        <van-cell 
          v-for="msg in messages" 
          :key="msg.id"
          :title="'来自: ' + msg.from"
          :label="JSON.stringify(msg.message)"
        />
      </van-cell-group>

      <!-- 页面栈 -->
      <van-cell-group inset title="页面栈">
        <van-cell 
          v-for="page in pageStack" 
          :key="page.id"
          :title="page.title || page.url"
          :value="'#' + page.index"
          :label="page.id"
        />
        <van-cell title="刷新页面栈" is-link @click="fetchPageStack" />
      </van-cell-group>

      <div class="tip-box">
        <p>💡 Navigator 模块功能：</p>
        <ul>
          <li><strong>自举</strong>：打开当前页面的新实例</li>
          <li><strong>数据传递</strong>：push 时传递 data，pop 时返回 result</li>
          <li><strong>页面通信</strong>：任意页面间发送消息</li>
          <li><strong>广播</strong>：向所有其他页面发送消息</li>
        </ul>
      </div>
    </div>
  `
}
