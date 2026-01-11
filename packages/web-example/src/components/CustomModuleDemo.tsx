import { defineComponent, ref } from 'vue'
import { Button, CellGroup, Cell, Field, showToast, Divider, Tag } from 'vant'
import { Bridge } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'CustomModuleDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    
    // 输入框状态
    const alertMessage = ref('这是一个原生 Alert 弹窗！')
    const confirmMessage = ref('你确定要执行这个操作吗？')
    const promptDefaultValue = ref('')
    const toastMessage = ref('Hello from Native!')
    const actionSheetOptions = ref('选项一,选项二,选项三')

    /**
     * 显示 Alert
     */
    async function showAlert() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.custom.alert({
          title: '提示',
          message: alertMessage.value,
          buttonText: '知道了'
        })
        emit('log', 'success', `Alert 已关闭: ${JSON.stringify(result)}`)
      } catch (error) {
        emit('log', 'error', `Alert 失败: ${error}`)
      }
    }

    /**
     * 显示 Confirm
     */
    async function showConfirm() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.custom.confirm({
          title: '确认',
          message: confirmMessage.value,
          confirmText: '确定',
          cancelText: '取消'
        })
        emit('log', result.confirmed ? 'success' : 'info', 
          `用户${result.confirmed ? '确认' : '取消'}了操作`)
      } catch (error) {
        emit('log', 'error', `Confirm 失败: ${error}`)
      }
    }

    /**
     * 显示 Prompt
     */
    async function showPrompt() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.custom.prompt({
          title: '输入',
          message: '请输入你的名字',
          placeholder: '请输入...',
          defaultValue: promptDefaultValue.value,
          confirmText: '确定',
          cancelText: '取消'
        })
        
        if (result.confirmed) {
          emit('log', 'success', `用户输入: ${result.value}`)
        } else {
          emit('log', 'info', '用户取消了输入')
        }
      } catch (error) {
        emit('log', 'error', `Prompt 失败: ${error}`)
      }
    }

    /**
     * 显示 Toast
     */
    async function showNativeToast() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.custom.toast({
          message: toastMessage.value,
          duration: 'short'
        })
        emit('log', 'success', 'Toast 已显示')
      } catch (error) {
        emit('log', 'error', `Toast 失败: ${error}`)
      }
    }

    /**
     * 显示 Loading
     */
    async function showLoading() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.custom.showLoading({ message: '加载中...' })
        emit('log', 'info', 'Loading 已显示，3秒后自动关闭')
        
        // 3秒后自动隐藏
        setTimeout(async () => {
          await Bridge.custom.hideLoading()
          emit('log', 'success', 'Loading 已隐藏')
        }, 3000)
      } catch (error) {
        emit('log', 'error', `Loading 失败: ${error}`)
      }
    }

    /**
     * 隐藏 Loading
     */
    async function hideLoading() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.custom.hideLoading()
        emit('log', 'success', 'Loading 已隐藏')
      } catch (error) {
        emit('log', 'error', `隐藏 Loading 失败: ${error}`)
      }
    }

    /**
     * 显示 ActionSheet
     */
    async function showActionSheet() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const options = actionSheetOptions.value.split(',').map(s => s.trim())
        const result = await Bridge.custom.actionSheet({
          title: '请选择操作',
          options,
          cancelText: '取消'
        })
        
        if (result.cancelled) {
          emit('log', 'info', '用户取消了选择')
        } else {
          emit('log', 'success', `用户选择了: ${result.option} (索引: ${result.index})`)
        }
      } catch (error) {
        emit('log', 'error', `ActionSheet 失败: ${error}`)
      }
    }

    /**
     * 获取已安装应用
     */
    async function getInstalledApps() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.app.getInstalledApps({
          includeSystemApps: false,
          includeIcons: false,
          limit: 10
        })
        emit('log', 'success', `获取到 ${result.count} 个应用`)
        console.log('已安装应用:', result.apps)
      } catch (error) {
        emit('log', 'error', `获取应用列表失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 获取应用详情
     */
    async function getAppDetails() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        // 获取当前应用的详情
        const appInfo = await Bridge.app.getAppInfo()
        const details = await Bridge.app.getAppDetails(appInfo.bundleId || (appInfo as any).packageName)
        emit('log', 'success', `应用详情: ${details.name} v${details.version}`)
        console.log('应用详情:', details)
      } catch (error) {
        emit('log', 'error', `获取应用详情失败: ${error}`)
      }
    }

    /**
     * 检查 URL 能否打开
     */
    async function checkCanOpenURL() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.app.canOpenURL('https://www.google.com')
        emit('log', 'info', `HTTPS URL 可打开: ${result.canOpen}`)
        
        const result2 = await Bridge.app.canOpenURL('tel:10086')
        emit('log', 'info', `电话 URL 可打开: ${result2.canOpen}`)
      } catch (error) {
        emit('log', 'error', `检查 URL 失败: ${error}`)
      }
    }

    return () => (
      <div class="custom-demo">
        <Divider contentPosition="left">
          <Tag type="primary">自定义模块 - UI 交互</Tag>
        </Divider>
        
        <CellGroup inset>
          <Field
            v-model={alertMessage.value}
            label="Alert 消息"
            placeholder="输入 Alert 消息"
          />
          <Cell 
            title="显示 Alert" 
            isLink 
            onClick={showAlert}
            v-slots={{
              label: () => <span style="color: #969799">调用原生 Alert 弹窗</span>
            }}
          />
        </CellGroup>

        <CellGroup inset style="margin-top: 12px">
          <Field
            v-model={confirmMessage.value}
            label="Confirm 消息"
            placeholder="输入 Confirm 消息"
          />
          <Cell 
            title="显示 Confirm" 
            isLink 
            onClick={showConfirm}
            v-slots={{
              label: () => <span style="color: #969799">调用原生确认对话框</span>
            }}
          />
        </CellGroup>

        <CellGroup inset style="margin-top: 12px">
          <Field
            v-model={promptDefaultValue.value}
            label="默认值"
            placeholder="Prompt 默认值（可选）"
          />
          <Cell 
            title="显示 Prompt" 
            isLink 
            onClick={showPrompt}
            v-slots={{
              label: () => <span style="color: #969799">调用原生输入对话框</span>
            }}
          />
        </CellGroup>

        <CellGroup inset style="margin-top: 12px">
          <Field
            v-model={toastMessage.value}
            label="Toast 消息"
            placeholder="输入 Toast 消息"
          />
          <Cell 
            title="显示 Toast" 
            isLink 
            onClick={showNativeToast}
            v-slots={{
              label: () => <span style="color: #969799">调用原生 Toast</span>
            }}
          />
        </CellGroup>

        <CellGroup inset style="margin-top: 12px">
          <Cell 
            title="显示 Loading" 
            isLink 
            onClick={showLoading}
            v-slots={{
              label: () => <span style="color: #969799">显示加载指示器（3秒后自动隐藏）</span>
            }}
          />
          <Cell 
            title="隐藏 Loading" 
            isLink 
            onClick={hideLoading}
            v-slots={{
              label: () => <span style="color: #969799">手动隐藏加载指示器</span>
            }}
          />
        </CellGroup>

        <CellGroup inset style="margin-top: 12px">
          <Field
            v-model={actionSheetOptions.value}
            label="选项列表"
            placeholder="逗号分隔的选项"
          />
          <Cell 
            title="显示 ActionSheet" 
            isLink 
            onClick={showActionSheet}
            v-slots={{
              label: () => <span style="color: #969799">调用原生操作表</span>
            }}
          />
        </CellGroup>

        <Divider contentPosition="left">
          <Tag type="success">App 模块扩展</Tag>
        </Divider>

        <CellGroup inset>
          <Cell 
            title="获取已安装应用" 
            isLink 
            onClick={getInstalledApps}
            v-slots={{
              label: () => <span style="color: #969799">获取设备上已安装的应用列表</span>
            }}
          />
          <Cell 
            title="获取当前应用详情" 
            isLink 
            onClick={getAppDetails}
            v-slots={{
              label: () => <span style="color: #969799">获取当前应用的详细信息</span>
            }}
          />
          <Cell 
            title="检查 URL 可打开性" 
            isLink 
            onClick={checkCanOpenURL}
            v-slots={{
              label: () => <span style="color: #969799">检查特定 URL 是否可以打开</span>
            }}
          />
        </CellGroup>
      </div>
    )
  },
})
