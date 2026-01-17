import { defineComponent, ref } from 'vue'
import { Button, Tag, CellGroup, Cell, Divider, Dialog } from 'vant'
import { Bridge, type ReviewAvailability, type RequestReviewResult } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'InAppReviewDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const availability = ref<ReviewAvailability | null>(null)
    const lastResult = ref<RequestReviewResult | null>(null)

    /**
     * 检查可用性
     */
    async function checkAvailability() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.inAppReview.isAvailable()
        availability.value = result
        
        if (result.isSupported) {
          emit('log', 'success', '应用内评价功能可用')
        } else {
          emit('log', 'warning', `应用内评价不可用: ${result.reason || '未知原因'}`)
        }
      } catch (error) {
        emit('log', 'error', `检查可用性失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 请求应用内评价
     */
    async function requestReview() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.inAppReview.requestReview()
        lastResult.value = result
        
        if (result.requested) {
          emit('log', 'success', `评价请求已发送: ${result.message || ''}`)
        } else {
          emit('log', 'warning', '评价请求未能发送')
        }
      } catch (error) {
        emit('log', 'error', `请求评价失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 打开应用商店评价页面
     */
    async function openStoreReview() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      // 提示用户
      try {
        await Dialog.confirm({
          title: '打开应用商店',
          message: '将打开应用商店的评价页面，确定继续吗？',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        })
      } catch {
        // 用户取消
        return
      }

      loading.value = true
      try {
        // 注意：这里使用示例 appId
        // iOS 需要真实的 App Store ID
        // Android 可以使用包名或不传参数（使用当前应用包名）
        const result = await Bridge.inAppReview.openStoreReview({
          appId: '123456789', // 请替换为真实的 App Store ID
          // packageName: 'com.aspect.webviewbridge.demo', // Android 可选
        })
        
        if (result.opened) {
          emit('log', 'success', '已打开应用商店评价页面')
        }
      } catch (error) {
        emit('log', 'error', `打开应用商店失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 获取可用性标签类型
     */
    function getAvailabilityTagType() {
      if (availability.value === null) return 'default'
      return availability.value.isSupported ? 'success' : 'warning'
    }

    /**
     * 获取可用性文本
     */
    function getAvailabilityText() {
      if (availability.value === null) return '未检查'
      return availability.value.isSupported ? '可用' : '不可用'
    }

    return () => (
      <div class="section">
        <div class="section-title">⭐ 应用内评价</div>
        
        {/* 状态显示 */}
        <CellGroup inset>
          <Cell
            title="评价功能"
            v-slots={{
              value: () => (
                <Tag type={getAvailabilityTagType()}>
                  {getAvailabilityText()}
                </Tag>
              )
            }}
          />
          {availability.value && !availability.value.isSupported && availability.value.reason && (
            <Cell
              title="不可用原因"
              value={availability.value.reason}
            />
          )}
          {lastResult.value && (
            <Cell
              title="上次请求"
              value={lastResult.value.requested ? '已发送' : '未发送'}
            />
          )}
        </CellGroup>

        <Divider />

        {/* 操作按钮 */}
        <div class="button-group">
          <Button 
            type="primary" 
            size="small" 
            loading={loading.value}
            onClick={checkAvailability}
          >
            检查可用性
          </Button>
          
          <Button 
            type="success" 
            size="small" 
            loading={loading.value}
            onClick={requestReview}
          >
            请求评价
          </Button>
          
          <Button 
            type="warning" 
            size="small" 
            loading={loading.value}
            onClick={openStoreReview}
          >
            打开应用商店
          </Button>
        </div>

        {/* 说明文字 */}
        <div class="tips">
          <p><strong>说明：</strong></p>
          <ul>
            <li>「请求评价」会触发系统原生评价弹窗</li>
            <li>系统会根据策略决定是否显示弹窗</li>
            <li>iOS：每年每个应用最多显示 3 次</li>
            <li>Android：由 Google Play 控制显示频率</li>
            <li>「打开应用商店」会跳转到商店评价页面</li>
          </ul>
        </div>
      </div>
    )
  }
})
