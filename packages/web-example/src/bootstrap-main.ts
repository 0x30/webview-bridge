import { createApp } from 'vue'
import { Toast, ConfigProvider } from 'vant'
import 'vant/lib/index.css'
import BootstrapApp from './BootstrapApp'
import './styles/index.css'

const app = createApp(BootstrapApp)

// 全局注册 Vant 组件
app.use(Toast)
app.use(ConfigProvider)

app.mount('#app')
