# Contacts 模块

联系人模块，提供读取、选择和创建联系人功能。

## 访问方式

```typescript
import { Bridge } from '@aspect/webview-bridge'

Bridge.contacts.getContacts()
```

## 方法

### hasPermission()

检查通讯录权限。

```typescript
const result = await Bridge.contacts.hasPermission()
```

**返回值** `Promise<PermissionResult>`

```typescript
interface PermissionResult {
  /** 是否已授权 */
  granted: boolean
  /** 权限状态 */
  status: 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unknown'
}
```

### requestPermission()

请求通讯录权限。

```typescript
const result = await Bridge.contacts.requestPermission()
```

**返回值** `Promise<PermissionResult>`

### getContacts()

获取联系人列表。

```typescript
const result = await Bridge.contacts.getContacts(params?)
```

**参数**

```typescript
interface GetContactsParams {
  /** 搜索关键词 */
  query?: string
  /** 偏移量 */
  offset?: number
  /** 限制数量 */
  limit?: number
}
```

**返回值** `Promise<GetContactsResult>`

```typescript
interface GetContactsResult {
  /** 联系人列表 */
  contacts: Contact[]
  /** 总数 */
  total: number
  /** 偏移量 */
  offset: number
  /** 限制数量 */
  limit: number
}

interface Contact {
  /** 唯一标识符 */
  identifier: string
  /** 显示名称 */
  displayName: string
  /** 名 */
  givenName?: string
  /** 姓 */
  familyName?: string
  /** 电话号码列表 */
  phones: PhoneNumber[]
  /** 邮箱列表 */
  emails: EmailAddress[]
  /** 是否有头像 */
  hasImage: boolean
  /** 头像 Base64 */
  imageBase64?: string
}

interface PhoneNumber {
  number: string
  label: string
}

interface EmailAddress {
  address: string
  label: string
}
```

**示例**

```typescript
// 获取前 20 个联系人
const result = await Bridge.contacts.getContacts({
  limit: 20
})

result.contacts.forEach(contact => {
  console.log(contact.displayName)
  if (contact.phones.length > 0) {
    console.log(`  电话: ${contact.phones[0].number}`)
  }
})

// 搜索联系人
const searchResult = await Bridge.contacts.getContacts({
  query: '张三',
  limit: 10
})
```

### pickContact()

打开系统联系人选择器。

```typescript
const result = await Bridge.contacts.pickContact()
```

**返回值** `Promise<Contact | { cancelled: boolean }>`

**示例**

```typescript
const result = await Bridge.contacts.pickContact()

if ('cancelled' in result && result.cancelled) {
  console.log('用户取消了选择')
} else {
  console.log('选择了:', result.displayName)
  console.log('电话:', result.phones[0]?.number)
}
```

### getContact()

获取单个联系人详情。

```typescript
const contact = await Bridge.contacts.getContact(identifier)
```

**参数**

| 参数 | 类型 | 描述 |
|------|------|------|
| identifier | string | 联系人唯一标识符 |

**返回值** `Promise<Contact>`

### createContact()

创建新联系人。

```typescript
const result = await Bridge.contacts.createContact(contact)
```

**参数**

```typescript
interface CreateContactParams {
  /** 名 */
  givenName?: string
  /** 姓 */
  familyName?: string
  /** 昵称 */
  nickname?: string
  /** 公司 */
  organization?: string
  /** 职位 */
  jobTitle?: string
  /** 电话列表 */
  phones?: PhoneNumber[]
  /** 邮箱列表 */
  emails?: EmailAddress[]
}
```

**返回值** `Promise<{ success: boolean; identifier: string }>`

**示例**

```typescript
const result = await Bridge.contacts.createContact({
  givenName: '三',
  familyName: '张',
  phones: [
    { number: '13800138000', label: 'mobile' }
  ],
  emails: [
    { address: 'zhangsan@example.com', label: 'work' }
  ]
})

if (result.success) {
  console.log('联系人已创建:', result.identifier)
}
```

## 完整示例

```typescript
async function contactsDemo() {
  // 1. 检查权限
  const permission = await Bridge.contacts.hasPermission()
  
  if (!permission.granted) {
    const request = await Bridge.contacts.requestPermission()
    if (!request.granted) {
      alert('需要通讯录权限才能继续')
      return
    }
  }

  // 2. 获取联系人列表
  const { contacts, total } = await Bridge.contacts.getContacts({
    limit: 50
  })
  
  console.log(`共有 ${total} 个联系人，获取了 ${contacts.length} 个`)

  // 3. 或者让用户选择
  const selected = await Bridge.contacts.pickContact()
  
  if (!('cancelled' in selected)) {
    console.log('选择了:', selected.displayName)
    
    // 发送短信
    await Bridge.system.openURL(`sms:${selected.phones[0]?.number}`)
  }
}
```

## 平台差异

| 功能 | iOS | Android | 备注 |
|------|-----|---------|------|
| 获取列表 | ✅ | ✅ | |
| 选择联系人 | ✅ | ✅ | |
| 创建联系人 | ✅ | ✅ | |
| 编辑联系人 | - | - | 暂不支持 |
| 删除联系人 | - | - | 暂不支持 |

## 权限配置

### iOS Info.plist

```xml
<key>NSContactsUsageDescription</key>
<string>需要访问您的通讯录以便选择联系人</string>
```

### Android AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
```
