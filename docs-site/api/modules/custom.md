# Custom 模块

Custom 模块是一个自定义模块示例，演示如何创建原生 UI 交互组件。该模块提供了常用的对话框、Toast、Loading 等 UI 组件。

::: tip 说明
Custom 模块是一个示例模块，需要在 Native 端实现对应的模块。你可以参考这个示例来创建自己的自定义模块。
:::

## 导入

```typescript
import { WebViewBridge } from 'webview-bridge-sdk'

const bridge = new WebViewBridge()
const custom = bridge.custom
```

## 方法

### alert

显示原生 Alert 对话框。

**签名**

```typescript
alert(options: AlertOptions): Promise<AlertResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | 否 | 标题 |
| message | string | 是 | 消息内容 |
| buttonText | string | 否 | 按钮文字，默认 "确定" |

**示例**

```typescript
await bridge.custom.alert({
  title: '提示',
  message: '操作已完成！',
  buttonText: '知道了'
})
```

### confirm

显示原生 Confirm 确认对话框。

**签名**

```typescript
confirm(options: ConfirmOptions): Promise<ConfirmResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | 否 | 标题 |
| message | string | 是 | 消息内容 |
| confirmText | string | 否 | 确认按钮文字，默认 "确定" |
| cancelText | string | 否 | 取消按钮文字，默认 "取消" |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| confirmed | boolean | 用户是否点击了确认 |

**示例**

```typescript
const result = await bridge.custom.confirm({
  title: '确认',
  message: '确定要删除吗？',
  confirmText: '删除',
  cancelText: '取消'
})

if (result.confirmed) {
  // 执行删除操作
}
```

### prompt

显示原生输入对话框。

**签名**

```typescript
prompt(options: PromptOptions): Promise<PromptResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | 否 | 标题 |
| message | string | 否 | 消息内容 |
| placeholder | string | 否 | 输入框占位文字 |
| defaultValue | string | 否 | 默认值 |
| confirmText | string | 否 | 确认按钮文字 |
| cancelText | string | 否 | 取消按钮文字 |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| confirmed | boolean | 用户是否点击了确认 |
| value | string | 用户输入的值 |

**示例**

```typescript
const result = await bridge.custom.prompt({
  title: '输入',
  message: '请输入您的昵称',
  placeholder: '请输入...',
  defaultValue: ''
})

if (result.confirmed && result.value) {
  console.log('用户输入:', result.value)
}
```

### toast

显示原生 Toast 提示。

**签名**

```typescript
toast(options: ToastOptions): Promise<void>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| message | string | 是 | 消息内容 |
| duration | 'short' \| 'long' | 否 | 显示时长，默认 'short' |

**示例**

```typescript
await bridge.custom.toast({
  message: '保存成功！',
  duration: 'short'
})
```

### showLoading

显示加载指示器。

**签名**

```typescript
showLoading(options?: LoadingOptions): Promise<void>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| message | string | 否 | 加载提示文字 |

**示例**

```typescript
// 显示 Loading
await bridge.custom.showLoading({ message: '加载中...' })

// 执行异步操作
await fetchData()

// 隐藏 Loading
await bridge.custom.hideLoading()
```

### hideLoading

隐藏加载指示器。

**签名**

```typescript
hideLoading(): Promise<void>
```

**示例**

```typescript
await bridge.custom.hideLoading()
```

### actionSheet

显示操作表（底部弹出的选择菜单）。

**签名**

```typescript
actionSheet(options: ActionSheetOptions): Promise<ActionSheetResult>
```

**参数**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | 否 | 标题 |
| options | string[] | 是 | 选项列表 |
| cancelText | string | 否 | 取消按钮文字 |

**返回值**

| 属性 | 类型 | 说明 |
|------|------|------|
| index | number | 选择的索引，-1 表示取消 |
| option | string | 选择的选项内容 |
| cancelled | boolean | 是否取消 |

**示例**

```typescript
const result = await bridge.custom.actionSheet({
  title: '请选择操作',
  options: ['拍照', '从相册选择', '取消'],
  cancelText: '取消'
})

if (!result.cancelled) {
  console.log('选择了:', result.option)
  
  switch (result.index) {
    case 0:
      // 拍照
      break
    case 1:
      // 从相册选择
      break
  }
}
```

## 类型定义

```typescript
interface AlertOptions {
  title?: string
  message: string
  buttonText?: string
}

interface AlertResult {
  action: 'confirm'
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

interface ConfirmResult {
  confirmed: boolean
}

interface PromptOptions {
  title?: string
  message?: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
}

interface PromptResult {
  confirmed: boolean
  value: string
}

interface ToastOptions {
  message: string
  duration?: 'short' | 'long'
}

interface LoadingOptions {
  message?: string
}

interface ActionSheetOptions {
  title?: string
  options: string[]
  cancelText?: string
}

interface ActionSheetResult {
  index: number
  option: string
  cancelled: boolean
}
```

## Native 端实现

要使用 Custom 模块，需要在 Native 端注册对应的模块。

### Android 实现

参考 `example/android/app/src/main/java/com/aspect/webviewbridgedemo/modules/CustomModule.kt`

### iOS 实现

参考 `ios/Sources/Modules/CustomModule.swift`（需要自行实现）

更多关于如何创建自定义模块的信息，请参阅 [创建模块](/extension/create-module) 指南。
