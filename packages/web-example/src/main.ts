import { createApp } from 'vue'
import { Toast, ConfigProvider } from 'vant'
import 'vant/lib/index.css'
import App from './App'
import './styles/index.css'

const app = createApp(App)

// 全局注册 Vant 组件
app.use(Toast)
app.use(ConfigProvider)

app.mount('#app')
