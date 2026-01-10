import { defineComponent, ref } from 'vue'
import { Button, Tag, Image as VanImage, ImagePreview, ActionSheet, Toast } from 'vant'
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
        const [camera, photos] = await Promise.all([
          Bridge.media.hasPermission('camera'),
          Bridge.media.hasPermission('photos'),
        ])
        hasPermission.value = {
          camera: camera.granted,
          photos: photos.granted,
        }
        emit('log', 'info', `相机: ${camera.granted ? '✓' : '✗'}, 相册: ${photos.granted ? '✓' : '✗'}`)
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
        let result: MediaResult | null = null

        switch (action.value) {
          case 'takePhoto':
            result = await Bridge.media.takePhoto({
              quality: 0.8,
              saveToAlbum: true,
            })
            break
          case 'recordVideo':
            result = await Bridge.media.recordVideo({
              maxDuration: 30,
              quality: 'high',
            })
            break
          case 'pickImage':
            const imageResult = await Bridge.media.pickImage()
            result = imageResult.media?.[0] || null
            break
          case 'pickVideo':
            const videoResult = await Bridge.media.pickVideo()
            result = videoResult.media?.[0] || null
            break
        }

        if (result && !result.cancelled) {
          photos.value = [result, ...photos.value]
          emit('log', 'success', `获取到媒体: ${result.fileName || result.uri}`)
        } else if (result?.cancelled) {
          emit('log', 'info', '操作已取消')
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
    function previewImage(uri: string) {
      ImagePreview({
        images: [uri],
        closeable: true,
      })
    }

    /**
     * 保存到相册
     */
    async function saveToAlbum(uri: string) {
      if (!Bridge.isNative) return

      try {
        await Bridge.media.saveToAlbum({ uri })
        Toast.success('保存成功')
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
                    src={photo.uri}
                    onClick={() => previewImage(photo.uri)}
                  />
                  {photo.type === 'video' && (
                    <Tag
                      type="primary"
                      style={{ position: 'absolute', top: '4px', left: '4px', fontSize: '10px' }}
                    >
                      视频
                    </Tag>
                  )}
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
              <div key={album.id} class="info-row">
                <span class="info-label">{album.name}</span>
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
