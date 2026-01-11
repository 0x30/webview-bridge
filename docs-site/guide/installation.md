# 安装

本文档详细介绍各平台的安装步骤。

## Web SDK

### 使用 Git 安装

::: code-group

```bash [pnpm]
pnpm add git+https://github.com/0x30/webview-bridge.git
```

```bash [npm]
npm install git+https://github.com/0x30/webview-bridge.git
```

```bash [yarn]
yarn add git+https://github.com/0x30/webview-bridge.git
```

:::

### 指定分支或标签

```bash
# 安装特定分支
pnpm add git+https://github.com/0x30/webview-bridge.git#branch-name

# 安装特定标签
pnpm add git+https://github.com/0x30/webview-bridge.git#v1.2.3
```

## iOS SDK

### Swift Package Manager

#### 通过 Xcode 添加

1. 在 Xcode 中打开你的项目
2. 选择 **File → Add Package Dependencies...**
3. 输入仓库地址：

```
https://github.com/0x30/webview-bridge
```

4. 选择版本规则（推荐使用 "Up to Next Major Version"）
5. 点击 **Add Package**

#### 通过 Package.swift 添加

在你的 `Package.swift` 文件中添加依赖：

```swift
let package = Package(
    name: "YourProject",
    dependencies: [
        .package(url: "https://github.com/0x30/webview-bridge", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "YourTarget",
            dependencies: [
                .product(name: "WebViewBridge", package: "webview-bridge")
            ]
        )
    ]
)
```

#### 本地开发

如果需要使用本地的 `ios` 目录进行开发：

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

#### 1. 添加 JitPack 仓库

在项目根目录的 `settings.gradle.kts` 中添加 JitPack 仓库：

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}
```

#### 2. 添加依赖

在 app 模块的 `build.gradle.kts` 中添加依赖：

```kotlin
dependencies {
    implementation("com.github.0x30:webview-bridge:v1.2.3")
}
```

#### 指定版本

```kotlin
// 使用特定版本
implementation("com.github.0x30:webview-bridge:v1.2.3")

// 使用最新版本（不推荐生产环境）
implementation("com.github.0x30:webview-bridge:main-SNAPSHOT")

// 使用特定 commit
implementation("com.github.0x30:webview-bridge:commit-hash")
```

#### 本地开发

如果需要使用本地的 `android` 目录进行开发，可以在 `settings.gradle.kts` 中添加：

```kotlin
include(":webview-bridge")
project(":webview-bridge").projectDir = file("../android")
```

然后在 app 的 `build.gradle.kts` 中使用：

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
