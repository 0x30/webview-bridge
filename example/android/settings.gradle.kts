pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "WebViewBridgeDemo"

// 包含示例应用
include(":app")

// 包含 WebViewBridge SDK
include(":webview-bridge")
project(":webview-bridge").projectDir = file("../../android")
