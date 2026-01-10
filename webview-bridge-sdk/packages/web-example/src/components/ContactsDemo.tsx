import { defineComponent, ref } from 'vue'
import { Button, Tag, CellGroup, Cell, Field, Dialog, Toast } from 'vant'
import { Bridge, type Contact } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'ContactsDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const contacts = ref<Contact[]>([])
    const selectedContact = ref<Contact | null>(null)
    const hasPermission = ref(false)

    // 新建联系人表单
    const showCreateDialog = ref(false)
    const newContact = ref({
      givenName: '',
      familyName: '',
      phoneNumber: '',
      email: '',
    })

    /**
     * 检查权限
     */
    async function checkPermission() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.contacts.hasPermission()
        hasPermission.value = result.granted
        emit('log', 'info', `联系人权限: ${result.granted ? '已授权' : '未授权'}`)
      } catch (error) {
        emit('log', 'error', `检查权限失败: ${error}`)
      }
    }

    /**
     * 请求权限
     */
    async function requestPermission() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.contacts.requestPermission()
        hasPermission.value = result.granted
        emit('log', result.granted ? 'success' : 'warning', 
          `权限请求${result.granted ? '成功' : '被拒绝'}`)
      } catch (error) {
        emit('log', 'error', `请求权限失败: ${error}`)
      }
    }

    /**
     * 获取联系人列表
     */
    async function fetchContacts() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.contacts.getContacts({
          limit: 20,
          offset: 0,
        })
        contacts.value = result.contacts
        emit('log', 'success', `获取到 ${result.contacts.length} 个联系人`)
      } catch (error) {
        emit('log', 'error', `获取联系人失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 选择联系人
     */
    async function pickContact() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.contacts.pickContact()
        if (result.contact) {
          selectedContact.value = result.contact
          emit('log', 'success', `选择了: ${result.contact.displayName}`)
        } else {
          emit('log', 'info', '取消选择')
        }
      } catch (error) {
        emit('log', 'error', `选择联系人失败: ${error}`)
      }
    }

    /**
     * 创建联系人
     */
    async function createContact() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      if (!newContact.value.givenName) {
        Toast('请输入名字')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.contacts.createContact({
          givenName: newContact.value.givenName,
          familyName: newContact.value.familyName,
          phoneNumbers: newContact.value.phoneNumber
            ? [{ value: newContact.value.phoneNumber, label: 'mobile' }]
            : undefined,
          emailAddresses: newContact.value.email
            ? [{ value: newContact.value.email, label: 'home' }]
            : undefined,
        })

        showCreateDialog.value = false
        emit('log', 'success', `联系人创建成功, ID: ${result.contactId}`)

        // 清空表单
        newContact.value = { givenName: '', familyName: '', phoneNumber: '', email: '' }

        // 刷新列表
        fetchContacts()
      } catch (error) {
        emit('log', 'error', `创建联系人失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    return () => (
      <div class="section">
        <div class="section-title">📒 联系人</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Button size="small" onClick={checkPermission}>
            检查权限
          </Button>
          <Button size="small" type="primary" onClick={requestPermission}>
            请求权限
          </Button>
          <Tag type={hasPermission.value ? 'success' : 'warning'}>
            {hasPermission.value ? '已授权' : '未授权'}
          </Tag>
        </div>

        <Button
          type="primary"
          block
          loading={loading.value}
          onClick={fetchContacts}
          style={{ marginBottom: '8px' }}
        >
          获取联系人列表
        </Button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button style={{ flex: 1 }} onClick={pickContact}>
            选择联系人
          </Button>
          <Button style={{ flex: 1 }} onClick={() => (showCreateDialog.value = true)}>
            新建联系人
          </Button>
        </div>

        {selectedContact.value && (
          <div class="info-card" style={{ marginTop: '12px' }}>
            <div class="info-row">
              <span class="info-label">选中的联系人</span>
              <span class="info-value">{selectedContact.value.displayName}</span>
            </div>
            {selectedContact.value.phoneNumbers?.[0] && (
              <div class="info-row">
                <span class="info-label">电话</span>
                <span class="info-value">{selectedContact.value.phoneNumbers[0].value}</span>
              </div>
            )}
          </div>
        )}

        {contacts.value.length > 0 && (
          <CellGroup style={{ marginTop: '12px' }}>
            {contacts.value.slice(0, 5).map((contact) => (
              <Cell
                key={contact.id}
                title={contact.displayName}
                label={contact.phoneNumbers?.[0]?.value || contact.emailAddresses?.[0]?.value}
              />
            ))}
            {contacts.value.length > 5 && (
              <Cell title={`还有 ${contacts.value.length - 5} 个联系人...`} />
            )}
          </CellGroup>
        )}

        {/* 新建联系人对话框 */}
        <Dialog
          v-model:show={showCreateDialog.value}
          title="新建联系人"
          showCancelButton
          onConfirm={createContact}
        >
          <CellGroup inset>
            <Field
              v-model={newContact.value.givenName}
              label="名字"
              placeholder="请输入名字"
            />
            <Field
              v-model={newContact.value.familyName}
              label="姓氏"
              placeholder="请输入姓氏"
            />
            <Field
              v-model={newContact.value.phoneNumber}
              label="电话"
              type="tel"
              placeholder="请输入电话"
            />
            <Field
              v-model={newContact.value.email}
              label="邮箱"
              type="email"
              placeholder="请输入邮箱"
            />
          </CellGroup>
        </Dialog>
      </div>
    )
  },
})
