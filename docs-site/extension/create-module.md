# 创建模块

本文档介绍如何从头创建一个完整的自定义模块。我们将以创建一个 "Flashlight" (手电筒) 模块为例。

## 第一步：定义接口

首先，明确模块的功能和 API：

```
模块名: Flashlight
功能:
  - 检查手电筒是否可用
  - 打开/关闭手电筒
  - 设置亮度级别
  
方法:
  - IsAvailable() -> { isAvailable: boolean }
  - TurnOn(level?: number) -> { success: boolean }
  - TurnOff() -> { success: boolean }
  - GetStatus() -> { isOn: boolean, level: number }
```

## 第二步：创建 Web 模块

### 创建模块文件

```typescript
// packages/web-sdk/src/modules/flashlight.ts

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// ============================================================================
// 类型定义
// ============================================================================

export interface FlashlightAvailability {
  /** 是否可用 */
  isAvailable: boolean
}

export interface TurnOnParams {
  /** 亮度级别 (0-1) */
  level?: number
}

export interface FlashlightResult {
  /** 是否成功 */
  success: boolean
}

export interface FlashlightStatus {
  /** 是否已打开 */
  isOn: boolean
  /** 当前亮度级别 */
  level: number
}

// ============================================================================
// Flashlight 模块实现
// ============================================================================

export class FlashlightModule implements BridgeModule {
  readonly moduleName = 'Flashlight'
  readonly methods = [
    'IsAvailable',
    'TurnOn',
    'TurnOff',
    'GetStatus',
  ] as const

  constructor(private bridge: BridgeCore) {}

  /**
   * 检查手电筒是否可用
   */
  async isAvailable(): Promise<FlashlightAvailability> {
    return this.bridge.send<FlashlightAvailability>('Flashlight.IsAvailable')
  }

  /**
   * 打开手电筒
   * @param params 参数
   */
  async turnOn(params?: TurnOnParams): Promise<FlashlightResult> {
    return this.bridge.send<FlashlightResult>(
      'Flashlight.TurnOn', 
      params as Record<string, unknown>
    )
  }

  /**
   * 关闭手电筒
   */
  async turnOff(): Promise<FlashlightResult> {
    return this.bridge.send<FlashlightResult>('Flashlight.TurnOff')
  }

  /**
   * 获取手电筒状态
   */
  async getStatus(): Promise<FlashlightStatus> {
    return this.bridge.send<FlashlightStatus>('Flashlight.GetStatus')
  }

  // ============================================================================
  // 便捷方法
  // ============================================================================

  /**
   * 切换手电筒状态
   */
  async toggle(): Promise<FlashlightResult> {
    const status = await this.getStatus()
    return status.isOn ? this.turnOff() : this.turnOn()
  }
}

export default FlashlightModule
```

### 导出模块

在 `modules/index.ts` 中添加导出：

```typescript
// 添加到现有导出
export {
  FlashlightModule,
  type FlashlightAvailability,
  type TurnOnParams,
  type FlashlightResult,
  type FlashlightStatus,
} from './flashlight'
```

### 注册到 Bridge

在 `index.ts` 中注册模块：

```typescript
// 在 WebViewBridge 类中添加
class WebViewBridge {
  // ... 现有模块

  /** Flashlight 模块 - 手电筒控制 */
  public readonly flashlight: FlashlightModule

  constructor(config?: BridgeConfig) {
    this.core = BridgeCore.getInstance(config)
    
    // ... 现有模块初始化
    this.flashlight = new FlashlightModule(this.core)
  }
}
```

## 第三步：创建 iOS 模块

```swift
// ios/Sources/Modules/FlashlightModule.swift

import AVFoundation

class FlashlightModule: BridgeModuleProtocol {
    
    let moduleName = "Flashlight"
    
    private var device: AVCaptureDevice? {
        AVCaptureDevice.default(for: .video)
    }
    
    func handle(method: String, 
                params: [String: Any], 
                completion: @escaping (Result<Any, Error>) -> Void) {
        switch method {
        case "IsAvailable":
            handleIsAvailable(completion: completion)
        case "TurnOn":
            handleTurnOn(params: params, completion: completion)
        case "TurnOff":
            handleTurnOff(completion: completion)
        case "GetStatus":
            handleGetStatus(completion: completion)
        default:
            completion(.failure(BridgeError.methodNotFound(method)))
        }
    }
    
    // MARK: - 方法实现
    
    private func handleIsAvailable(completion: @escaping (Result<Any, Error>) -> Void) {
        let isAvailable = device?.hasTorch ?? false
        completion(.success(["isAvailable": isAvailable]))
    }
    
    private func handleTurnOn(params: [String: Any], 
                              completion: @escaping (Result<Any, Error>) -> Void) {
        guard let device = device, device.hasTorch else {
            completion(.success(["success": false]))
            return
        }
        
        let level = params["level"] as? Float ?? 1.0
        
        do {
            try device.lockForConfiguration()
            try device.setTorchModeOn(level: level)
            device.unlockForConfiguration()
            completion(.success(["success": true]))
        } catch {
            completion(.failure(error))
        }
    }
    
    private func handleTurnOff(completion: @escaping (Result<Any, Error>) -> Void) {
        guard let device = device, device.hasTorch else {
            completion(.success(["success": false]))
            return
        }
        
        do {
            try device.lockForConfiguration()
            device.torchMode = .off
            device.unlockForConfiguration()
            completion(.success(["success": true]))
        } catch {
            completion(.failure(error))
        }
    }
    
    private func handleGetStatus(completion: @escaping (Result<Any, Error>) -> Void) {
        guard let device = device, device.hasTorch else {
            completion(.success(["isOn": false, "level": 0]))
            return
        }
        
        let isOn = device.torchMode == .on
        let level = device.torchLevel
        
        completion(.success([
            "isOn": isOn,
            "level": level
        ]))
    }
}
```

## 第四步：创建 Android 模块

```kotlin
// android/src/main/java/com/aspect/webviewbridge/modules/FlashlightModule.kt

package com.aspect.webviewbridge.modules

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import org.json.JSONObject

class FlashlightModule(private val context: Context) : BridgeModule {
    
    override val moduleName = "Flashlight"
    
    private val cameraManager: CameraManager by lazy {
        context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    }
    
    private var cameraId: String? = null
    private var isOn = false
    
    init {
        // 找到有闪光灯的相机
        cameraId = cameraManager.cameraIdList.firstOrNull { id ->
            cameraManager.getCameraCharacteristics(id)
                .get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        }
    }
    
    override suspend fun handle(method: String, params: JSONObject): Any {
        return when (method) {
            "IsAvailable" -> handleIsAvailable()
            "TurnOn" -> handleTurnOn(params)
            "TurnOff" -> handleTurnOff()
            "GetStatus" -> handleGetStatus()
            else -> throw IllegalArgumentException("Unknown method: $method")
        }
    }
    
    // ==========================================================================
    // 方法实现
    // ==========================================================================
    
    private fun handleIsAvailable(): JSONObject {
        return JSONObject().apply {
            put("isAvailable", cameraId != null)
        }
    }
    
    private fun handleTurnOn(params: JSONObject): JSONObject {
        val cameraId = this.cameraId ?: return JSONObject().put("success", false)
        
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                cameraManager.setTorchMode(cameraId, true)
                isOn = true
            }
            JSONObject().put("success", true)
        } catch (e: Exception) {
            JSONObject().put("success", false)
        }
    }
    
    private fun handleTurnOff(): JSONObject {
        val cameraId = this.cameraId ?: return JSONObject().put("success", false)
        
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                cameraManager.setTorchMode(cameraId, false)
                isOn = false
            }
            JSONObject().put("success", true)
        } catch (e: Exception) {
            JSONObject().put("success", false)
        }
    }
    
    private fun handleGetStatus(): JSONObject {
        return JSONObject().apply {
            put("isOn", isOn)
            put("level", if (isOn) 1.0 else 0.0)
        }
    }
}
```

## 第五步：注册模块

### iOS

```swift
// 在 ViewController 中
bridge.registerModule(FlashlightModule())
```

### Android

```kotlin
// 在 MainActivity 中
bridge.registerModule(FlashlightModule(this))
```

## 第六步：使用模块

```typescript
import { Bridge } from '@aspect/webview-bridge'

async function flashlightDemo() {
  // 检查可用性
  const { isAvailable } = await Bridge.flashlight.isAvailable()
  
  if (!isAvailable) {
    alert('您的设备不支持手电筒')
    return
  }

  // 打开手电筒
  await Bridge.flashlight.turnOn({ level: 0.8 })

  // 获取状态
  const status = await Bridge.flashlight.getStatus()
  console.log(`手电筒: ${status.isOn ? '开' : '关'}`)

  // 3 秒后关闭
  setTimeout(async () => {
    await Bridge.flashlight.turnOff()
  }, 3000)
}
```

## 完整模块清单

创建一个完整模块需要以下文件：

```
packages/web-sdk/src/modules/
  └── flashlight.ts       # Web 模块实现

ios/Sources/Modules/
  └── FlashlightModule.swift   # iOS 模块实现

android/src/main/java/com/aspect/webviewbridge/modules/
  └── FlashlightModule.kt      # Android 模块实现
```

以及修改以下文件：

- `packages/web-sdk/src/modules/index.ts` - 添加导出
- `packages/web-sdk/src/index.ts` - 注册到 Bridge 类
- iOS/Android 的 Bridge 初始化代码 - 注册模块
