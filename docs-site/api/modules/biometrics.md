# Biometrics 模块

生物识别认证模块，提供 Touch ID / Face ID / 指纹认证功能。

## 访问方式

```typescript
import { Bridge } from '@aspect/webview-bridge'

Bridge.biometrics.authenticate()
```

## 方法

### isAvailable()

检查生物识别是否可用。

```typescript
const availability = await Bridge.biometrics.isAvailable()
```

**返回值** `Promise<BiometricsAvailability>`

```typescript
interface BiometricsAvailability {
  /** 是否可用 */
  isAvailable: boolean
  /** 生物识别类型 */
  biometryType: BiometryType
  /** 错误码 (如果不可用) */
  errorCode?: number
  /** 错误信息 (如果不可用) */
  errorMessage?: string
}

type BiometryType = 
  | 'none'        // 不支持
  | 'touchId'     // Touch ID (iOS)
  | 'faceId'      // Face ID (iOS)
  | 'fingerprint' // 指纹 (Android)
  | 'face'        // 人脸 (Android)
  | 'iris'        // 虹膜 (Android)
  | 'multiple'    // 多种 (Android)
  | 'unknown'     // 未知
```

**示例**

```typescript
const { isAvailable, biometryType } = await Bridge.biometrics.isAvailable()

if (isAvailable) {
  console.log(`支持 ${biometryType}`)
} else {
  console.log('不支持生物识别')
}
```

### getBiometryType()

获取生物识别类型。

```typescript
const typeInfo = await Bridge.biometrics.getBiometryType()
```

**返回值** `Promise<BiometryTypeInfo>`

```typescript
interface BiometryTypeInfo {
  /** 类型 */
  type: BiometryType
  /** 显示名称 */
  displayName: string
}
```

**示例**

```typescript
const { type, displayName } = await Bridge.biometrics.getBiometryType()
console.log(`生物识别类型: ${displayName}`) // "Face ID" 或 "指纹"
```

### authenticate()

执行生物识别认证。

```typescript
const result = await Bridge.biometrics.authenticate(params?)
```

**参数**

```typescript
interface AuthenticateParams {
  /** 认证原因 (显示给用户) */
  reason?: string
  /** 对话框标题 (Android) */
  title?: string
  /** 对话框副标题 (Android) */
  subtitle?: string
  /** 备用按钮标题 */
  fallbackTitle?: string
  /** 取消按钮标题 */
  cancelTitle?: string
  /** 是否允许设备密码作为备用 */
  allowDeviceCredential?: boolean
}
```

**返回值** `Promise<AuthenticateResult>`

```typescript
interface AuthenticateResult {
  /** 是否成功 */
  success: boolean
  /** 使用的生物识别类型 */
  biometryType?: BiometryType
  /** 认证方式 */
  authenticationType?: 'biometric' | 'deviceCredential' | 'unknown'
  /** 错误码 (如果失败) */
  errorCode?: number
  /** 错误信息 (如果失败) */
  errorMessage?: string
}
```

**示例**

```typescript
const result = await Bridge.biometrics.authenticate({
  reason: '请验证您的身份以继续操作',
  title: '身份验证',
  fallbackTitle: '使用密码',
  allowDeviceCredential: true
})

if (result.success) {
  console.log('认证成功!')
  // 继续执行敏感操作
} else {
  console.log('认证失败:', result.errorMessage)
}
```

### checkEnrollment()

检查是否已注册生物识别信息。

```typescript
const enrollment = await Bridge.biometrics.checkEnrollment()
```

**返回值** `Promise<EnrollmentResult>`

```typescript
interface EnrollmentResult {
  /** 是否已注册 */
  isEnrolled: boolean
  /** 生物识别类型 */
  biometryType: BiometryType
  /** 原因 (如未注册) */
  reason?: string
}
```

## 便捷方法

### hasTouchId()

检查是否支持 Touch ID / 指纹。

```typescript
const hasTouchId = await Bridge.biometrics.hasTouchId()
```

### hasFaceId()

检查是否支持 Face ID / 人脸识别。

```typescript
const hasFaceId = await Bridge.biometrics.hasFaceId()
```

### verify()

简化的验证方法，失败时抛出异常。

```typescript
await Bridge.biometrics.verify('请验证身份')
// 验证成功，继续执行
// 验证失败会抛出异常
```

## 完整示例

```typescript
async function secureAction() {
  // 1. 检查是否可用
  const { isAvailable, biometryType } = await Bridge.biometrics.isAvailable()
  
  if (!isAvailable) {
    alert('您的设备不支持生物识别')
    return false
  }

  // 2. 检查是否已设置
  const { isEnrolled } = await Bridge.biometrics.checkEnrollment()
  
  if (!isEnrolled) {
    alert(`请先在设置中启用 ${biometryType === 'faceId' ? 'Face ID' : '指纹'}`)
    return false
  }

  // 3. 执行认证
  try {
    const result = await Bridge.biometrics.authenticate({
      reason: '验证您的身份以访问敏感数据',
      allowDeviceCredential: true
    })

    if (result.success) {
      console.log('认证成功，认证类型:', result.authenticationType)
      return true
    } else {
      console.log('认证失败:', result.errorMessage)
      return false
    }
  } catch (error) {
    console.error('认证过程发生错误:', error)
    return false
  }
}
```

## 平台差异

| 功能 | iOS | Android | 备注 |
|------|-----|---------|------|
| Face ID | ✅ | - | iOS 专有 |
| Touch ID | ✅ | - | iOS 专有 |
| 指纹 | - | ✅ | Android |
| 人脸识别 | - | ✅ | Android 部分设备 |
| 设备密码备用 | ✅ | ✅ | `allowDeviceCredential` |

## 权限配置

### iOS Info.plist

```xml
<key>NSFaceIDUsageDescription</key>
<string>使用 Face ID 进行身份验证</string>
```

### Android AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

## 错误码

| 代码 | 描述 |
|------|------|
| -1 | 用户取消 |
| -2 | 认证失败 |
| -3 | 被锁定 (多次失败) |
| -4 | 不可用 |
| -5 | 未注册 |
| -6 | 密码未设置 |

## 最佳实践

1. **总是提供备用方案**：设置 `allowDeviceCredential: true`
2. **明确说明用途**：在 `reason` 中清楚解释为什么需要认证
3. **处理锁定状态**：多次失败后引导用户使用密码
4. **优雅降级**：如果生物识别不可用，提供其他验证方式
