# 模块开发最佳实践

本文档总结了开发 WebView Bridge 模块时的最佳实践和常见问题解决方案。

## 设计原则

### 1. 保持接口一致性

确保所有平台（Web、iOS、Android）的 API 接口完全一致：

```typescript
// ✅ 好的设计 - 统一的接口
interface GetStatusResult {
  isConnected: boolean
  type: 'wifi' | 'cellular' | 'none'
}

// iOS、Android、Web 都返回相同的结构
```

```typescript
// ❌ 不好的设计 - 不一致的接口
// iOS: { connected: true, connectionType: 'WiFi' }
// Android: { isConnected: true, type: 'wifi' }
// 应该统一命名规范
```

### 2. 使用语义化命名

```typescript
// ✅ 好的命名
class BiometricsModule {
  authenticate(params: AuthParams): Promise<AuthResult>
  getBiometryType(): Promise<BiometryTypeResult>
  isAvailable(): Promise<AvailabilityResult>
}

// ❌ 避免的命名
class BiometricsModule {
  auth(): Promise<any>           // 太短
  getBioType(): Promise<any>     // 缩写不清晰
  check(): Promise<any>          // 语义不明确
}
```

### 3. 类型优先

始终定义完整的 TypeScript 类型：

```typescript
// ✅ 完整的类型定义
export interface Contact {
  /** 唯一标识符 */
  id: string
  /** 姓名 */
  name: string
  /** 电话号码列表 */
  phones: PhoneNumber[]
  /** 电子邮件列表 */
  emails: EmailAddress[]
}

export interface PhoneNumber {
  label: string
  number: string
}

// ❌ 避免使用 any
async getContacts(): Promise<any>
```

## 错误处理

### 统一错误格式

```typescript
// 定义标准错误类型
export interface BridgeError {
  code: number
  message: string
  details?: Record<string, unknown>
}

// 常用错误码
export enum ErrorCode {
  // 请求错误
  INVALID_PARAMS = -4,
  METHOD_NOT_FOUND = -3,
  
  // 权限错误
  PERMISSION_DENIED = -6,
  
  // 功能错误
  NOT_SUPPORTED = -3,
  NOT_AVAILABLE = -7,
  
  // 系统错误
  INTERNAL_ERROR = -8,
  TIMEOUT = -9,
}
```

### 提供有意义的错误信息

```swift
// ✅ 好的错误信息
throw BridgeError.invalidParams("参数 'contact.phones' 不能为空数组")

// ❌ 不好的错误信息
throw BridgeError.invalidParams("Invalid params")
```

### 处理所有边界情况

```kotlin
override suspend fun handle(method: String, params: JSONObject): Any {
    return when (method) {
        "MyMethod" -> handleMyMethod(params)
        else -> throw BridgeError.MethodNotFound(method) // 不要忘记 else
    }
}
```

## 异步操作

### 使用 async/await

```typescript
// ✅ 使用 async/await
async getLocation(): Promise<Location> {
  const result = await this.bridge.send<Location>('Location.GetCurrent')
  return result
}

// ❌ 避免 Promise 链
getLocation(): Promise<Location> {
  return this.bridge.send<Location>('Location.GetCurrent')
    .then(result => result)
    .catch(error => { throw error })
}
```

### 处理超时

```swift
// iOS - 使用 DispatchWorkItem 处理超时
func handleWithTimeout(params: [String: Any], 
                       completion: @escaping (Result<Any, Error>) -> Void) {
    let timeout = params["timeout"] as? TimeInterval ?? 30.0
    
    var didComplete = false
    let workItem = DispatchWorkItem {
        guard !didComplete else { return }
        completion(.failure(BridgeError.timeout))
    }
    
    DispatchQueue.main.asyncAfter(deadline: .now() + timeout, execute: workItem)
    
    performOperation { result in
        didComplete = true
        workItem.cancel()
        completion(.success(result))
    }
}
```

### 支持取消操作

```kotlin
// Android - 可取消的协程
private var currentJob: Job? = null

private suspend fun handleCancellable(params: JSONObject): JSONObject {
    currentJob?.cancel()
    
    currentJob = coroutineScope {
        launch {
            // 操作逻辑
        }
    }
    
    return JSONObject().put("started", true)
}

private fun handleCancel(): JSONObject {
    currentJob?.cancel()
    currentJob = null
    return JSONObject().put("cancelled", true)
}
```

## 权限处理

### 先检查后请求

```typescript
// 在 Web 端
async requestPermissionSafely(type: PermissionType): Promise<PermissionResult> {
  // 1. 先检查当前状态
  const current = await this.check({ type })
  
  // 2. 如果已授权，直接返回
  if (current.status === 'granted') {
    return current
  }
  
  // 3. 如果被永久拒绝，提示用户去设置
  if (current.status === 'denied' && !current.canAskAgain) {
    return {
      status: 'denied',
      canAskAgain: false,
      message: '请在系统设置中授权'
    }
  }
  
  // 4. 请求权限
  return this.request({ type })
}
```

### 优雅降级

```swift
// iOS - 检查功能可用性
func handleFeature(params: [String: Any], 
                   completion: @escaping (Result<Any, Error>) -> Void) {
    // 检查系统版本
    guard #available(iOS 14.0, *) else {
        completion(.failure(BridgeError.notSupported("需要 iOS 14.0 或更高版本")))
        return
    }
    
    // 检查硬件支持
    guard hasRequiredHardware() else {
        completion(.failure(BridgeError.notAvailable("设备不支持此功能")))
        return
    }
    
    // 执行操作
    performFeature(completion: completion)
}
```

## 内存管理

### iOS - 避免循环引用

```swift
class NetworkModule: BridgeModuleProtocol {
    weak var bridge: WebViewBridge?  // 使用 weak 引用
    private var monitor: NWPathMonitor?
    
    deinit {
        monitor?.cancel()
    }
    
    private func startMonitoring() {
        monitor = NWPathMonitor()
        
        // 使用 [weak self] 避免循环引用
        monitor?.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            self.notifyStatusChange(path)
        }
        
        monitor?.start(queue: DispatchQueue.global(qos: .background))
    }
}
```

### Android - 正确管理生命周期

```kotlin
class LocationModule(
    private val context: Context
) : BridgeModule, LifecycleObserver {
    
    private var locationCallback: LocationCallback? = null
    
    @OnLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    fun onDestroy() {
        stopLocationUpdates()
    }
    
    private fun stopLocationUpdates() {
        locationCallback?.let {
            locationClient.removeLocationUpdates(it)
        }
        locationCallback = null
    }
}
```

### Web - 清理事件监听

```typescript
class MyModule {
  private cleanupFns: (() => void)[] = []
  
  constructor(private bridge: BridgeCore) {
    this.setupListeners()
  }
  
  private setupListeners(): void {
    const handler = (data: unknown) => this.handleEvent(data)
    this.bridge.addEventListener('MyModule.Event' as any, handler)
    
    // 记录清理函数
    this.cleanupFns.push(() => {
      this.bridge.removeEventListener('MyModule.Event' as any, handler)
    })
  }
  
  destroy(): void {
    this.cleanupFns.forEach(fn => fn())
    this.cleanupFns = []
  }
}
```

## 性能优化

### 批量操作

```typescript
// ✅ 批量获取
async getContacts(ids: string[]): Promise<Contact[]> {
  return this.bridge.send<Contact[]>('Contacts.GetByIds', { ids })
}

// ❌ 避免循环调用
async getContactsOneByOne(ids: string[]): Promise<Contact[]> {
  const contacts: Contact[] = []
  for (const id of ids) {
    const contact = await this.getContact(id)  // 多次跨桥调用
    contacts.push(contact)
  }
  return contacts
}
```

### 缓存结果

```typescript
class DeviceModule {
  private cachedInfo: DeviceInfo | null = null
  
  async getInfo(): Promise<DeviceInfo> {
    // 设备信息不会变化，可以缓存
    if (this.cachedInfo) {
      return this.cachedInfo
    }
    
    this.cachedInfo = await this.bridge.send<DeviceInfo>('Device.GetInfo')
    return this.cachedInfo
  }
}
```

### 限制数据大小

```swift
// iOS - 限制返回数据量
private func handleGetPhotos(params: [String: Any], 
                             completion: @escaping (Result<Any, Error>) -> Void) {
    let limit = min(params["limit"] as? Int ?? 20, 100)  // 最大 100 张
    let offset = params["offset"] as? Int ?? 0
    
    // 只返回必要的字段
    let photos = fetchPhotos(limit: limit, offset: offset).map { photo in
        [
            "id": photo.localIdentifier,
            "thumbnail": photo.thumbnailBase64  // 使用缩略图而非原图
        ]
    }
    
    completion(.success(["photos": photos]))
}
```

## 测试

### 单元测试

```typescript
// Web - 使用 Mock
describe('FlashlightModule', () => {
  let module: FlashlightModule
  let mockBridge: jest.Mocked<BridgeCore>
  
  beforeEach(() => {
    mockBridge = {
      send: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any
    
    module = new FlashlightModule(mockBridge)
  })
  
  it('should turn on flashlight', async () => {
    mockBridge.send.mockResolvedValue({ success: true })
    
    const result = await module.turnOn({ level: 0.5 })
    
    expect(result.success).toBe(true)
    expect(mockBridge.send).toHaveBeenCalledWith(
      'Flashlight.TurnOn',
      { level: 0.5 }
    )
  })
})
```

### 集成测试

```kotlin
// Android - 集成测试
@RunWith(AndroidJUnit4::class)
class FlashlightModuleTest {
    
    private lateinit var module: FlashlightModule
    
    @Before
    fun setup() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        module = FlashlightModule(context)
    }
    
    @Test
    fun testIsAvailable() = runBlocking {
        val result = module.handle("IsAvailable", JSONObject())
        val json = result as JSONObject
        
        // 结果应该是 boolean
        assertTrue(json.has("isAvailable"))
    }
}
```

## 文档

### 添加 JSDoc 注释

```typescript
/**
 * 手电筒模块
 * 
 * @example
 * ```typescript
 * // 检查可用性
 * const { isAvailable } = await bridge.flashlight.isAvailable()
 * 
 * // 打开手电筒
 * if (isAvailable) {
 *   await bridge.flashlight.turnOn({ level: 0.8 })
 * }
 * ```
 */
export class FlashlightModule {
  /**
   * 打开手电筒
   * @param params - 参数选项
   * @param params.level - 亮度级别 (0-1)，默认 1.0
   * @returns 操作结果
   * @throws {BridgeError} 设备不支持时抛出
   */
  async turnOn(params?: TurnOnParams): Promise<FlashlightResult>
}
```

### 提供使用示例

每个模块都应该包含：

1. 基本使用示例
2. 错误处理示例
3. 完整功能示例
4. 常见问题解答

## Checklist

开发新模块时，确保完成以下检查：

- [ ] 三端接口定义一致
- [ ] 所有参数和返回值都有类型定义
- [ ] 处理了所有错误情况
- [ ] 正确管理内存和资源
- [ ] 添加了完整的文档注释
- [ ] 编写了单元测试
- [ ] 在真实设备上测试过
- [ ] 更新了 modules/index.ts 导出
- [ ] 更新了 WebViewBridge 类
- [ ] 更新了文档
