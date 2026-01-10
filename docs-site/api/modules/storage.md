# Storage 模块

Storage 模块提供了本地持久化存储能力，数据会安全地存储在设备上。

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const storage = bridge.storage
```

## 方法

### get

获取存储的数据。

**签名**

```typescript
get<T = unknown>(key: string): Promise<T | null>
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| key | string | 存储键名 |

**示例**

```typescript
const value = await bridge.storage.get<string>('username')
if (value) {
  console.log('用户名:', value)
}
```

### set

存储数据。

**签名**

```typescript
set(key: string, value: unknown): Promise<void>
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| key | string | 存储键名 |
| value | unknown | 要存储的值 |

**示例**

```typescript
// 存储字符串
await bridge.storage.set('username', 'john')

// 存储对象
await bridge.storage.set('user', {
  id: '123',
  name: 'John',
  age: 25
})

// 存储数组
await bridge.storage.set('favorites', ['item1', 'item2'])
```

### remove

删除存储的数据。

**签名**

```typescript
remove(key: string): Promise<void>
```

**示例**

```typescript
await bridge.storage.remove('username')
```

### clear

清除所有存储的数据。

**签名**

```typescript
clear(): Promise<void>
```

**示例**

```typescript
await bridge.storage.clear()
```

### keys

获取所有存储的键名。

**签名**

```typescript
keys(): Promise<string[]>
```

**示例**

```typescript
const allKeys = await bridge.storage.keys()
console.log('所有键:', allKeys)
```

### has

检查键是否存在。

**签名**

```typescript
has(key: string): Promise<boolean>
```

**示例**

```typescript
const exists = await bridge.storage.has('username')
if (exists) {
  console.log('用户名已设置')
}
```

## 类型定义

```typescript
interface StorageModule {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
  has(key: string): Promise<boolean>
}
```

## 存储限制

| 平台 | 存储方式 | 容量限制 |
|------|----------|----------|
| iOS | UserDefaults / Keychain | 无明确限制，建议 < 1MB |
| Android | SharedPreferences | 无明确限制，建议 < 1MB |

::: tip 建议
- 对于大量数据，考虑使用数据库
- 对于敏感数据，使用安全存储（Keychain/Keystore）
- 避免存储过大的对象
:::

## 完整示例

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()

// 用户设置管理
class UserSettings {
  private prefix = 'settings:'
  
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const value = await bridge.storage.get<T>(this.prefix + key)
    return value ?? defaultValue
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    await bridge.storage.set(this.prefix + key, value)
  }
  
  async getTheme(): Promise<'light' | 'dark'> {
    return this.get('theme', 'light')
  }
  
  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    await this.set('theme', theme)
  }
  
  async getNotificationsEnabled(): Promise<boolean> {
    return this.get('notifications', true)
  }
  
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await this.set('notifications', enabled)
  }
}

// 使用
const settings = new UserSettings()

async function loadSettings() {
  const theme = await settings.getTheme()
  const notifications = await settings.getNotificationsEnabled()
  
  applyTheme(theme)
  updateNotificationUI(notifications)
}

async function saveTheme(theme: 'light' | 'dark') {
  await settings.setTheme(theme)
  applyTheme(theme)
}
```
