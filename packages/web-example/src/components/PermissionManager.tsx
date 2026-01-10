import { defineComponent, ref } from 'vue'
import { Button, Tag, ActionSheet, type ActionSheetAction } from 'vant'
import {
  Bridge,
  type PermissionType,
  type PermissionStatus,
} from '@aspect/webview-bridge'

// 常用权限列表
const PERMISSIONS: Array<{ name: PermissionType; label: string }> = [
  { name: 'camera', label: '相机' },
  { name: 'microphone', label: '麦克风' },
  { name: 'photos', label: '相册' },
  { name: 'locationWhenInUse', label: '位置(使用时)' },
  { name: 'notifications', label: '通知' },
  { name: 'contacts', label: '通讯录' },
]

export default defineComponent({
  name: 'PermissionManager',
  emits: ['log'],
  setup(_, { emit }) {
    const showSheet = ref(false)
    const permissionStatus = ref<Record<string, PermissionStatus>>({})

    const actions: ActionSheetAction[] = PERMISSIONS.map((p) => ({
      name: p.label,
      callback: () => requestPermission(p.name, p.label),
    }))

    /**
     * 查询权限状态
     */
    async function queryPermissions() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const results: Record<string, PermissionStatus> = {}
        for (const p of PERMISSIONS) {
          const status = await Bridge.permission.getStatus(p.name)
          results[p.name] = status.status
        }
        permissionStatus.value = results
        emit('log', 'success', '权限状态查询成功')
      } catch (error) {
        emit('log', 'error', `查询权限失败: ${error}`)
      }
    }

    /**
     * 请求权限
     */
    async function requestPermission(name: PermissionType, label: string) {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.permission.request(name)
        permissionStatus.value[name] = result.status
        emit(
          'log',
          result.status === 'granted' ? 'success' : 'info',
          `${label}: ${result.status}`
        )
      } catch (error) {
        emit('log', 'error', `请求权限失败: ${error}`)
      }
    }

    /**
     * 打开设置
     */
    async function openSettings() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        await Bridge.permission.openSettings()
        emit('log', 'success', '已打开系统设置')
      } catch (error) {
        emit('log', 'error', `打开设置失败: ${error}`)
      }
    }

    /**
     * 获取状态标签类型
     */
    function getStatusTagType(
      status?: PermissionStatus
    ): 'success' | 'warning' | 'danger' | 'default' {
      switch (status) {
        case 'granted':
          return 'success'
        case 'denied':
          return 'danger'
        case 'limited':
          return 'warning'
        default:
          return 'default'
      }
    }

    return () => (
      <div class="section">
        <div class="section-title">🔐 权限管理</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Button type="primary" size="small" onClick={queryPermissions}>
            查询权限
          </Button>
          <Button
            type="default"
            size="small"
            onClick={() => (showSheet.value = true)}
          >
            请求权限
          </Button>
          <Button type="default" size="small" onClick={openSettings}>
            打开设置
          </Button>
        </div>

        {Object.keys(permissionStatus.value).length > 0 && (
          <div>
            {PERMISSIONS.map((p) => (
              <div class="info-row" key={p.name}>
                <span class="info-label">{p.label}</span>
                <Tag type={getStatusTagType(permissionStatus.value[p.name])}>
                  {permissionStatus.value[p.name] || '未知'}
                </Tag>
              </div>
            ))}
          </div>
        )}

        <ActionSheet
          v-model:show={showSheet.value}
          title="选择权限"
          actions={actions}
          cancel-text="取消"
        />
      </div>
    )
  },
})
