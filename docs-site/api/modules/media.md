# Media 模块

媒体模块，提供相机拍照、录像、相册选择等功能。

## 访问方式

```typescript
import { Bridge } from '@aspect/webview-bridge'

Bridge.media.takePhoto()
```

## 方法

### hasPermission()

检查媒体相关权限。

```typescript
const result = await Bridge.media.hasPermission(type)
```

**参数**

| 参数 | 类型 | 描述 |
|------|------|------|
| type | `MediaPermissionType` | 权限类型 |

```typescript
type MediaPermissionType = 'camera' | 'photos' | 'microphone' | 'storage'
```

### requestPermission()

请求媒体相关权限。

```typescript
const result = await Bridge.media.requestPermission(type)
```

### takePhoto()

拍照。

```typescript
const result = await Bridge.media.takePhoto(params?)
```

**参数**

```typescript
interface TakePhotoParams {
  /** 摄像头选择 */
  cameraDevice?: 'front' | 'rear'
  /** 是否允许编辑 */
  allowsEditing?: boolean
  /** 图片质量 (0-1) */
  quality?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
}
```

**返回值** `Promise<MediaResult | MediaCancelledResult>`

```typescript
interface MediaResult {
  /** Base64 数据 */
  base64: string
  /** 宽度 */
  width?: number
  /** 高度 */
  height?: number
  /** MIME 类型 */
  mimeType: string
  /** 文件 URL */
  url?: string
}

interface MediaCancelledResult {
  cancelled: true
}
```

**示例**

```typescript
const result = await Bridge.media.takePhoto({
  cameraDevice: 'rear',
  quality: 0.8,
  maxWidth: 1920
})

if ('cancelled' in result && result.cancelled) {
  console.log('用户取消了拍照')
} else {
  // 显示图片
  img.src = `data:${result.mimeType};base64,${result.base64}`
}
```

### recordVideo()

录制视频。

```typescript
const result = await Bridge.media.recordVideo(params?)
```

**参数**

```typescript
interface RecordVideoParams {
  /** 摄像头选择 */
  cameraDevice?: 'front' | 'rear'
  /** 视频质量 */
  quality?: 'low' | 'medium' | 'high'
  /** 最大时长 (秒) */
  maxDuration?: number
}
```

**返回值** `Promise<MediaResult | MediaCancelledResult>`

**示例**

```typescript
const result = await Bridge.media.recordVideo({
  quality: 'high',
  maxDuration: 60  // 最多录制 60 秒
})

if (!('cancelled' in result)) {
  console.log('视频时长:', result.duration, '秒')
}
```

### pickImage()

从相册选择图片。

```typescript
const result = await Bridge.media.pickImage(params?)
```

**参数**

```typescript
interface PickMediaParams {
  /** 媒体类型 */
  mediaType?: 'image' | 'video' | 'any'
  /** 最大选择数量 */
  maxCount?: number
  /** 图片质量 (0-1) */
  quality?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
}
```

**返回值** `Promise<MediaResult | MultiMediaResult | MediaCancelledResult>`

```typescript
interface MultiMediaResult {
  items: MediaResult[]
}
```

**示例**

```typescript
// 选择单张图片
const result = await Bridge.media.pickImage()

// 选择多张图片
const multiResult = await Bridge.media.pickImage({
  maxCount: 9
})

if ('items' in multiResult) {
  console.log(`选择了 ${multiResult.items.length} 张图片`)
}
```

### pickVideo()

从相册选择视频。

```typescript
const result = await Bridge.media.pickVideo(params?)
```

### pickMedia()

从相册选择媒体（图片或视频）。

```typescript
const result = await Bridge.media.pickMedia(params?)
```

### getAlbums()

获取相册列表。

```typescript
const result = await Bridge.media.getAlbums()
```

**返回值**

```typescript
interface Album {
  /** 相册标识符 */
  identifier: string
  /** 相册标题 */
  title: string
  /** 照片数量 */
  count: number
  /** 相册类型 */
  type: 'smart' | 'user'
}
```

### getPhotos()

获取相册中的照片。

```typescript
const result = await Bridge.media.getPhotos(params?)
```

**参数**

```typescript
interface GetPhotosParams {
  /** 相册 ID */
  albumId?: string
  /** 媒体类型 */
  mediaType?: 'image' | 'video' | 'any'
  /** 偏移量 */
  offset?: number
  /** 限制数量 */
  limit?: number
}
```

### saveToAlbum()

保存图片到相册。

```typescript
const result = await Bridge.media.saveToAlbum(base64Data)
```

**参数**

| 参数 | 类型 | 描述 |
|------|------|------|
| base64Data | string | Base64 编码的图片数据 |

**示例**

```typescript
// 保存图片到相册
const result = await Bridge.media.saveToAlbum(imageBase64)

if (result.success) {
  console.log('图片已保存到相册')
}
```

## 完整示例

```typescript
async function mediaDemo() {
  // 1. 检查权限
  const [cameraPermission, photosPermission] = await Promise.all([
    Bridge.media.hasPermission('camera'),
    Bridge.media.hasPermission('photos')
  ])

  if (!cameraPermission.granted) {
    await Bridge.media.requestPermission('camera')
  }

  if (!photosPermission.granted) {
    await Bridge.media.requestPermission('photos')
  }

  // 2. 拍照
  const photo = await Bridge.media.takePhoto({
    quality: 0.8,
    cameraDevice: 'rear'
  })

  if (!('cancelled' in photo)) {
    // 3. 显示预览
    const img = document.getElementById('preview') as HTMLImageElement
    img.src = `data:${photo.mimeType};base64,${photo.base64}`

    // 4. 保存到相册
    await Bridge.media.saveToAlbum(photo.base64)
    console.log('图片已保存')
  }
}
```

## 权限配置

### iOS Info.plist

```xml
<key>NSCameraUsageDescription</key>
<string>需要访问相机拍照</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册选择照片</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>需要保存照片到相册</string>

<key>NSMicrophoneUsageDescription</key>
<string>需要使用麦克风录制视频</string>
```

### Android AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```
