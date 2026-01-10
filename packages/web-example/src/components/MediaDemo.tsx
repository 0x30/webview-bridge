import { defineComponent, ref } from 'vue'
import { Button, Tag, Image as VanImage, ActionSheet, showToast, showImagePreview } from 'vant'
import { Bridge, type MediaResult, type Album } from '@aspect/webview-bridge'

export default defineComponent({
  name: 'MediaDemo',
  emits: ['log'],
  setup(_, { emit }) {
    const loading = ref(false)
    const photos = ref<MediaResult[]>([])
    const albums = ref<Album[]>([])
    const hasPermission = ref({ camera: false, photos: false })

    const showActionSheet = ref(false)
    const actionSheetActions = [
      { name: '拍照', value: 'takePhoto' },
      { name: '录像', value: 'recordVideo' },
      { name: '从相册选择', value: 'pickImage' },
      { name: '选择视频', value: 'pickVideo' },
    ]

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
          Bridge.media.hasPermission('camera'),
          Bridge.media.hasPermission('photos'),
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
        const result = await Bridge.media.requestPermission(type)
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
     * 处理 ActionSheet 选择
     */
    async function handleAction(action: { value: string }) {
      showActionSheet.value = false

      if (!Bridge.isNative) {
        emit('log', 'error', '仅在 Native 环境可用')
        return
      }

      loading.value = true
      try {
        let mediaResult: MediaResult | null = null

        switch (action.value) {
          case 'takePhoto': {
            const takeResult = await Bridge.media.takePhoto({
              quality: 0.8,
            })
            if ('cancelled' in takeResult && takeResult.cancelled) {
              emit('log', 'info', '操作已取消')
              return
            }
            if ('base64' in takeResult) {
              mediaResult = takeResult
            }
            break
          }
          case 'recordVideo': {
            const recordResult = await Bridge.media.recordVideo({
              maxDuration: 30,
              quality: 'high',
            })
            if ('cancelled' in recordResult && recordResult.cancelled) {
              emit('log', 'info', '操作已取消')
              return
            }
            if ('base64' in recordResult) {
              mediaResult = recordResult
            }
            break
          }
          case 'pickImage': {
            const imageResult = await Bridge.media.pickImage()
            if ('cancelled' in imageResult && imageResult.cancelled) {
              emit('log', 'info', '操作已取消')
              return
            }
            if ('items' in imageResult && imageResult.items.length > 0) {
              mediaResult = imageResult.items[0] ?? null
            } else if ('base64' in imageResult) {
              mediaResult = imageResult
            }
            break
          }
          case 'pickVideo': {
            const videoResult = await Bridge.media.pickVideo()
            if ('cancelled' in videoResult && videoResult.cancelled) {
              emit('log', 'info', '操作已取消')
              return
            }
            if ('base64' in videoResult) {
              mediaResult = videoResult
            }
            break
          }
        }

        if (mediaResult) {
          photos.value = [mediaResult, ...photos.value]
          emit('log', 'success', `获取到媒体: ${mediaResult.mimeType}`)
        }
      } catch (error) {
        emit('log', 'error', `操作失败: ${error}`)
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
            style={{ flex: 1 }}
            loading={loading.value}
            onClick={() => (showActionSheet.value = true)}
          >
            拍照/选择
          </Button>
          <Button
            style={{ flex: 1 }}
            loading={loading.value}
            onClick={fetchAlbums}
          >
            获取相册
          </Button>
        </div>

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

        {/* ActionSheet */}
        <ActionSheet
          v-model:show={showActionSheet.value}
          actions={actionSheetActions}
          onSelect={handleAction}
          cancel-text="取消"
        />
      </div>
    )
  },
})
