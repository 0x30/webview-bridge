import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { NavBar, Tag, ConfigProvider, Tabs, Tab } from 'vant'
import { Bridge } from '@aspect/webview-bridge'
import DeviceInfo from './components/DeviceInfo'
import PermissionManager from './components/PermissionManager'
import SystemFeatures from './components/SystemFeatures'
import EventMonitor from './components/EventMonitor'
import ContactsDemo from './components/ContactsDemo'
import MediaDemo from './components/MediaDemo'
import LocationDemo from './components/LocationDemo'
import BiometricsDemo from './components/BiometricsDemo'
import NFCDemo from './components/NFCDemo'
import NetworkDemo from './components/NetworkDemo'
import CustomModuleDemo from './components/CustomModuleDemo'
import BrowserDemoTsx from './components/BrowserDemoTsx'
import NavigatorDemoTsx from './components/NavigatorDemoTsx'
import KeyboardDemoTsx from './components/KeyboardDemoTsx'
import MotionDemoTsx from './components/MotionDemoTsx'
import ScreenOrientationDemoTsx from './components/ScreenOrientationDemoTsx'
import InAppReviewDemo from './components/InAppReviewDemo'
import './styles/index.css'

export interface LogItem {
  time: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

export default defineComponent({
  name: 'App',
  setup() {
    // Bridge 状态
    const bridgeReady = ref(false)
    const isNative = ref(false)
    const colorScheme = ref<'light' | 'dark'>('light')
    const activeTab = ref(0)

    // 事件日志
    const eventLogs = ref<LogItem[]>([])

    /**
     * 添加日志
     */
    function addLog(type: 'success' | 'error' | 'info' | 'warning', message: string) {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      eventLogs.value.unshift({ time, type, message })
      if (eventLogs.value.length > 50) {
        eventLogs.value.pop()
      }
    }

    /**
     * 处理外观变化事件
     */
    function handleAppearanceChanged(data: { appearance: 'light' | 'dark' }) {
      colorScheme.value = data.appearance
      addLog('info', `外观模式变更: ${data.appearance}`)
    }

    /**
     * 处理字体缩放变化事件
     */
    function handleFontScaleChanged(data: { scale: number }) {
      addLog('info', `字体缩放变更: ${data.scale}`)
    }

    /**
     * 处理前台事件
     */
    function handleForeground() {
      addLog('info', '应用进入前台')
    }

    /**
     * 处理后台事件
     */
    function handleBackground() {
      addLog('info', '应用进入后台')
    }

    /**
     * 处理网络变化事件
     */
    function handleNetworkChanged(data: {
      type: string
      isConnected: boolean
    }) {
      addLog('info', `网络变更: ${data.type}, 已连接: ${data.isConnected}`)
    }

    /**
     * 初始化 Bridge
     */
    async function initBridge() {
      try {
        isNative.value = Bridge.isNative

        if (isNative.value) {
          await Bridge.whenReady()
          bridgeReady.value = true
          addLog('success', 'Bridge 已就绪')

          // 注册事件监听
          Bridge.addEventListener(
            'System.AppearanceChanged',
            handleAppearanceChanged
          )
          Bridge.addEventListener(
            'System.FontScaleChanged',
            handleFontScaleChanged
          )
          Bridge.addEventListener('App.Foreground', handleForeground)
          Bridge.addEventListener('App.Background', handleBackground)
          Bridge.addEventListener('Network.Changed', handleNetworkChanged)

          // 获取初始外观
          try {
            const scheme = await Bridge.system.getColorScheme()
            colorScheme.value = scheme.colorScheme
          } catch {
            // 忽略错误
          }
        } else {
          addLog('info', '运行在浏览器环境，部分功能不可用')
          colorScheme.value = window.matchMedia('(prefers-color-scheme: dark)')
            .matches
            ? 'dark'
            : 'light'
        }
      } catch (error) {
        addLog('error', `Bridge 初始化失败: ${error}`)
      }
    }

    onMounted(() => {
      initBridge()
    })

    onUnmounted(() => {
      Bridge.removeEventListener(
        'System.AppearanceChanged',
        handleAppearanceChanged
      )
      Bridge.removeEventListener(
        'System.FontScaleChanged',
        handleFontScaleChanged
      )
      Bridge.removeEventListener('App.Foreground', handleForeground)
      Bridge.removeEventListener('App.Background', handleBackground)
      Bridge.removeEventListener('Network.Changed', handleNetworkChanged)
    })

    return () => (
      <ConfigProvider theme={colorScheme.value}>
        <div class="page-container" style={{ 
          paddingTop: 'env(safe-area-inset-top)', 
          paddingBottom: 'env(safe-area-inset-bottom)' 
        }}>
          {/* 导航栏 */}
          <NavBar title="WebView Bridge 示例" />

          {/* Bridge 状态 */}
          <div class="section">
            <div class="section-title">🔗 Bridge 状态</div>
            <div class="info-row">
              <span class="info-label">就绪状态</span>
              <Tag type={bridgeReady.value ? 'success' : 'warning'}>
                {bridgeReady.value ? '已就绪' : '未就绪'}
              </Tag>
            </div>
            <div class="info-row">
              <span class="info-label">运行环境</span>
              <Tag type={isNative.value ? 'primary' : 'default'}>
                {isNative.value ? 'Native' : 'Browser'}
              </Tag>
            </div>
          </div>

          {/* 功能模块 Tabs */}
          <Tabs v-model:active={activeTab.value} sticky swipeable>
            <Tab title="基础">
              {/* 设备信息 */}
              <DeviceInfo onLog={addLog} />

              {/* 权限管理 */}
              <PermissionManager onLog={addLog} />

              {/* 系统功能 */}
              <SystemFeatures onLog={addLog} />
            </Tab>

            <Tab title="联系人">
              <ContactsDemo onLog={addLog} />
            </Tab>

            <Tab title="相机相册">
              <MediaDemo onLog={addLog} />
            </Tab>

            <Tab title="位置">
              <LocationDemo onLog={addLog} />
            </Tab>

            <Tab title="生物识别">
              <BiometricsDemo onLog={addLog} />
            </Tab>

            <Tab title="NFC">
              <NFCDemo onLog={addLog} />
            </Tab>

            <Tab title="网络">
              <NetworkDemo onLog={addLog} />
            </Tab>

            <Tab title="键盘">
              <KeyboardDemoTsx onLog={addLog} />
            </Tab>

            <Tab title="传感器">
              <MotionDemoTsx onLog={addLog} />
            </Tab>

            <Tab title="方向">
              <ScreenOrientationDemoTsx onLog={addLog} />
            </Tab>

            <Tab title="浏览器">
              <BrowserDemoTsx onLog={addLog} />
            </Tab>

            <Tab title="导航">
              <NavigatorDemoTsx onLog={addLog} />
            </Tab>

            <Tab title="评价">
              <InAppReviewDemo onLog={addLog} />
            </Tab>

            <Tab title="自定义">
              <CustomModuleDemo onLog={addLog} />
            </Tab>
          </Tabs>

          {/* 事件监听 */}
          <EventMonitor logs={eventLogs.value} />
        </div>
      </ConfigProvider>
    )
  },
})
