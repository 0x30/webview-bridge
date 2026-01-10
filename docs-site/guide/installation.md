# 安装

本文档详细介绍各平台的安装步骤。

## Web SDK

### 使用包管理器

::: code-group

```bash [pnpm]
pnpm add @aspect/webview-bridge
```

```bash [npm]
npm install @aspect/webview-bridge
```

```bash [yarn]
yarn add @aspect/webview-bridge
```

:::

### 使用 CDN

```html
<script src="https://unpkg.com/@aspect/webview-bridge/dist/index.umd.js"></script>
<script>
  const { Bridge } = WebViewBridge
</script>
```

## iOS SDK

### Swift Package Manager

在 Xcode 中选择 File → Add Package Dependencies...，输入仓库地址：

```
https://github.com/aspect/webview-bridge-ios
```

或者在 `Package.swift` 中添加：

```swift
dependencies: [
    .package(url: "https://github.com/aspect/webview-bridge-ios", from: "1.0.0")
]
```

### 本地集成

1. 将 `ios` 目录拷贝到你的项目中
2. 在 Xcode 中添加 package 依赖指向本地路径

```swift
dependencies: [
    .package(path: "../ios")
]
```

### 要求

- iOS 13.0+
- Swift 5.9+
- Xcode 15.0+

## Android SDK

### Gradle

在项目的 `settings.gradle.kts` 中添加模块：

```kotlin
include(":webview-bridge")
project(":webview-bridge").projectDir = file("../android")
```

在 app 的 `build.gradle.kts` 中添加依赖：

```kotlin
dependencies {
    implementation(project(":webview-bridge"))
}
```

### 要求

- Android API 24+ (Android 7.0)
- Kotlin 1.9+
- Android Gradle Plugin 8.0+

## 权限配置

### iOS Info.plist

根据使用的功能，添加相应权限描述：

```xml
<!-- 相机 -->
<key>NSCameraUsageDescription</key>
<string>需要访问相机拍照</string>

<!-- 相册 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册选择照片</string>

<!-- 位置 -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>需要获取您的位置信息</string>

<!-- 联系人 -->
<key>NSContactsUsageDescription</key>
<string>需要访问您的通讯录</string>

<!-- 生物识别 -->
<key>NSFaceIDUsageDescription</key>
<string>使用 Face ID 进行身份验证</string>

<!-- NFC -->
<key>NFCReaderUsageDescription</key>
<string>需要使用 NFC 读取标签</string>
```

### Android AndroidManifest.xml

```xml
<!-- 网络 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- 相机 -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- 存储 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- 位置 -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- 联系人 -->
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />

<!-- 震动 -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- NFC -->
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />

<!-- 生物识别 -->
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```
