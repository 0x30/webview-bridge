import { defineComponent, ref } from 'vue'
import { Button, Tag, Image as VanImage, showToast, showImagePreview } from 'vant'
import { Bridge, type MediaResult, type Album } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'MediaDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const photos = ref<MediaResult[]>([])
    const albums = ref<Album[]>([])
    const hasPermission = ref({ camera: false, photos: false })

    /**
     * 检查权限
     */
    async function checkPermission() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const [camera, photosResult] = await Promise.all([
          Bridge.permission.getStatus('camera'),
          Bridge.permission.getStatus('photos'),
        ])
        hasPermission.value = {
          camera: camera.granted,
          photos: photosResult.granted,
        }
        emit('log', 'info', `相机: ${camera.granted ? '✓' : '✗'}, 相册: ${photosResult.granted ? '✓' : '✗'}`)
      } catch (error) {
        emit('log', 'error', `检查权限失败: ${error}`)
      }
    }

    /**
     * 请求权限
     */
    async function requestPermission(type: 'camera' | 'photos') {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      try {
        const result = await Bridge.permission.request(type)
        if (type === 'camera') {
          hasPermission.value.camera = result.granted
        } else {
          hasPermission.value.photos = result.granted
        }
        emit('log', result.granted ? 'success' : 'warning', 
          `${type === 'camera' ? '相机' : '相册'}权限${result.granted ? '已授权' : '被拒绝'}`)
      } catch (error) {
        emit('log', 'error', `请求权限失败: ${error}`)
      }
    }

    /**
     * 拍照
     */
    async function takePhoto() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.media.takePhoto({
          quality: 0.8,
        })
        if ('cancelled' in result && result.cancelled) {
          emit('log', 'info', '操作已取消')
          return
        }
        if ('base64' in result) {
          photos.value.unshift(result)
          emit('log', 'success', '拍照成功')
        }
      } catch (error) {
        emit('log', 'error', `拍照失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 录像
     */
    async function recordVideo() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.media.recordVideo({
          maxDuration: 30,
          quality: 'high',
        })
        if ('cancelled' in result && result.cancelled) {
          emit('log', 'info', '操作已取消')
          return
        }
        if ('base64' in result) {
          photos.value.unshift(result)
          emit('log', 'success', '录像成功')
        }
      } catch (error) {
        emit('log', 'error', `录像失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 从相册选择图片
     */
    async function pickImage() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.media.pickImage()
        if ('cancelled' in result && result.cancelled) {
          emit('log', 'info', '操作已取消')
          return
        }
        // pickImage 可能返回 MultiMediaResult (多个) 或 MediaResult (单个)
        if ('items' in result) {
          // 多个项目
          const items = (result as { items: MediaResult[] }).items
          if (items.length > 0) {
            // 添加所有项目
            photos.value = [...items, ...photos.value]
            emit('log', 'success', `获取到 ${items.length} 张图片`)
          }
        } else if ('base64' in result) {
          // 单个项目
          photos.value.unshift(result as MediaResult)
          emit('log', 'success', '获取到 1 张图片')
        }
      } catch (error) {
        emit('log', 'error', `选择图片失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 选择视频
     */
    async function pickVideo() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.media.pickVideo()
        if ('cancelled' in result && result.cancelled) {
          emit('log', 'info', '操作已取消')
          return
        }
        if ('base64' in result) {
          photos.value.unshift(result)
          emit('log', 'success', `获取到视频: ${result.mimeType}`)
        }
      } catch (error) {
        emit('log', 'error', `选择视频失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 获取相册列表
     */
    async function fetchAlbums() {
      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        const result = await Bridge.media.getAlbums()
        albums.value = result.albums
        emit('log', 'success', `获取到 ${result.albums.length} 个相册`)
      } catch (error) {
        emit('log', 'error', `获取相册失败: ${error}`)
      } finally {
        loading.value = false
      }
    }

    /**
     * 预览图片
     */
    function previewImage(base64: string) {
      showImagePreview({
        images: [`data:image/jpeg;base64,${base64}`],
        closeable: true,
      })
    }

    /**
     * 保存到相册
     */
    async function saveToAlbum(base64: string) {
      if (!Bridge.isNative) return

      try {
        await Bridge.media.saveToAlbum(base64)
        showToast('保存成功')
        emit('log', 'success', '图片已保存到相册')
      } catch (error) {
        emit('log', 'error', `保存失败: ${error}`)
      }
    }

    return () => (
      <div class="section">
        <div class="section-title">📷 相机与相册</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Button size="small" onClick={checkPermission}>
            检查权限
          </Button>
          <Button size="small" onClick={() => requestPermission('camera')}>
            请求相机
          </Button>
          <Button size="small" onClick={() => requestPermission('photos')}>
            请求相册
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <Tag type={hasPermission.value.camera ? 'success' : 'warning'}>
            相机: {hasPermission.value.camera ? '✓' : '✗'}
          </Tag>
          <Tag type={hasPermission.value.photos ? 'success' : 'warning'}>
            相册: {hasPermission.value.photos ? '✓' : '✗'}
          </Tag>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="primary"
            size="small"
            loading={loading.value}
            onClick={takePhoto}
          >
            拍照
          </Button>
          <Button
            size="small"
            loading={loading.value}
            onClick={recordVideo}
          >
            录像
          </Button>
          <Button
            size="small"
            loading={loading.value}
            onClick={pickImage}
          >
            选择图片
          </Button>
          <Button
            size="small"
            loading={loading.value}
            onClick={pickVideo}
          >
            选择视频
          </Button>
        </div>

        <Button
          block
          style={{ marginTop: '8px' }}
          loading={loading.value}
          onClick={fetchAlbums}
        >
          获取相册列表
        </Button>

        {/* 已选择的媒体 */}
        {photos.value.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', color: '#666' }}>
              已选择 ({photos.value.length})
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {photos.value.slice(0, 6).map((photo, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <VanImage
                    width="80"
                    height="80"
                    fit="cover"
                    radius={4}
                    src={photo.url || `data:${photo.mimeType};base64,${photo.base64}`}
                    onClick={() => previewImage(photo.base64)}
                  />
                  {photo.duration && (
                    <Tag
                      type="primary"
                      style={{ position: 'absolute', top: '4px', left: '4px', fontSize: '10px' }}
                    >
                      视频
                    </Tag>
                  )}
                  <Button
                    size="mini"
                    type="primary"
                    style={{ position: 'absolute', bottom: '4px', right: '4px' }}
                    onClick={(e: Event) => {
                      e.stopPropagation()
                      saveToAlbum(photo.base64)
                    }}
                  >
                    保存
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 相册列表 */}
        {albums.value.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', color: '#666' }}>
              相册列表 ({albums.value.length})
            </div>
            {albums.value.slice(0, 5).map((album) => (
              <div key={album.identifier} class="info-row">
                <span class="info-label">{album.title}</span>
                <span class="info-value">{album.count} 项</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
})
