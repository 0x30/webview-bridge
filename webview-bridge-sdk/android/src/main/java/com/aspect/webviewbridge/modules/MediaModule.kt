/**
 * Media 模块 - 相机相册功能
 *
 * 提供拍照、录像、选择相册图片/视频等功能
 */

package com.aspect.webviewbridge.modules

import android.Manifest
import android.app.Activity
import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.aspect.webviewbridge.protocol.*
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

/**
 * Media 模块
 */
class MediaModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext
) : BridgeModule {
    
    override val moduleName = "Media"
    
    override val methods = listOf(
        "TakePhoto",
        "RecordVideo",
        "PickImage",
        "PickVideo",
        "PickMedia",
        "GetAlbums",
        "GetPhotos",
        "SaveToAlbum",
        "HasPermission",
        "RequestPermission"
    )
    
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var pendingPhotoUri: Uri? = null
    private var pendingVideoUri: Uri? = null
    
    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "TakePhoto" -> takePhoto(request, callback)
            "RecordVideo" -> recordVideo(request, callback)
            "PickImage" -> pickImage(request, callback)
            "PickVideo" -> pickVideo(request, callback)
            "PickMedia" -> pickMedia(request, callback)
            "GetAlbums" -> getAlbums(callback)
            "GetPhotos" -> getPhotos(request, callback)
            "SaveToAlbum" -> saveToAlbum(request, callback)
            "HasPermission" -> hasPermission(request, callback)
            "RequestPermission" -> requestPermission(request, callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }
    
    // MARK: - HasPermission
    
    private fun hasPermission(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val type = request.getString("type") ?: "storage"
        
        val (granted, status) = when (type) {
            "camera" -> {
                val g = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                g to if (g) "authorized" else "denied"
            }
            "storage" -> {
                val g = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED
                } else {
                    ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
                }
                g to if (g) "authorized" else "denied"
            }
            "microphone" -> {
                val g = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                g to if (g) "authorized" else "denied"
            }
            else -> false to "unknown"
        }
        
        callback(Result.success(mapOf(
            "type" to type,
            "granted" to granted,
            "status" to status
        )))
    }
    
    // MARK: - RequestPermission
    
    private fun requestPermission(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val type = request.getString("type") ?: "storage"
        val activity = bridgeContext.activity
        
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        val permissions = when (type) {
            "camera" -> arrayOf(Manifest.permission.CAMERA)
            "storage" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    arrayOf(
                        Manifest.permission.READ_MEDIA_IMAGES,
                        Manifest.permission.READ_MEDIA_VIDEO
                    )
                } else {
                    arrayOf(
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                    )
                }
            }
            "microphone" -> arrayOf(Manifest.permission.RECORD_AUDIO)
            else -> {
                callback(Result.failure(BridgeError.invalidParams("type")))
                return
            }
        }
        
        ActivityCompat.requestPermissions(activity, permissions, REQUEST_MEDIA_PERMISSION)
        
        // 延迟检查权限状态
        scope.launch {
            delay(500)
            hasPermission(request, callback)
        }
    }
    
    // MARK: - TakePhoto
    
    private fun takePhoto(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val activity = bridgeContext.activity
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        try {
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            
            // 创建临时文件
            val photoFile = createImageFile()
            val photoUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                photoFile
            )
            
            pendingPhotoUri = photoUri
            intent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
            
            // 前后摄像头
            val cameraDevice = request.getString("cameraDevice")
            if (cameraDevice == "front") {
                intent.putExtra("android.intent.extras.CAMERA_FACING", 1)
                intent.putExtra("android.intent.extras.LENS_FACING_FRONT", 1)
                intent.putExtra("android.intent.extra.USE_FRONT_CAMERA", true)
            }
            
            activity.startActivityForResult(intent, REQUEST_TAKE_PHOTO)
            callback(Result.success(mapOf("pending" to true)))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError("启动相机失败: ${e.message}")))
        }
    }
    
    // MARK: - RecordVideo
    
    private fun recordVideo(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val activity = bridgeContext.activity
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        try {
            val intent = Intent(MediaStore.ACTION_VIDEO_CAPTURE)
            
            // 视频质量
            val quality = request.getString("quality") ?: "medium"
            intent.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, when (quality) {
                "low" -> 0
                "high" -> 1
                else -> 0
            })
            
            // 最大时长
            val maxDuration = request.getInt("maxDuration")
            if (maxDuration != null) {
                intent.putExtra(MediaStore.EXTRA_DURATION_LIMIT, maxDuration)
            }
            
            activity.startActivityForResult(intent, REQUEST_RECORD_VIDEO)
            callback(Result.success(mapOf("pending" to true)))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError("启动录像失败: ${e.message}")))
        }
    }
    
    // MARK: - PickImage
    
    private fun pickImage(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val activity = bridgeContext.activity
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        try {
            val maxCount = request.getInt("maxCount") ?: 1
            
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && maxCount > 1) {
                Intent(MediaStore.ACTION_PICK_IMAGES).apply {
                    putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, maxCount)
                }
            } else {
                Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI).apply {
                    type = "image/*"
                    if (maxCount > 1) {
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                }
            }
            
            activity.startActivityForResult(intent, REQUEST_PICK_IMAGE)
            callback(Result.success(mapOf("pending" to true)))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError("启动图库失败: ${e.message}")))
        }
    }
    
    // MARK: - PickVideo
    
    private fun pickVideo(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val activity = bridgeContext.activity
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }
        
        try {
            val intent = Intent(Intent.ACTION_PICK, MediaStore.Video.Media.EXTERNAL_CONTENT_URI).apply {
                type = "video/*"
            }
            
            activity.startActivityForResult(intent, REQUEST_PICK_VIDEO)
            callback(Result.success(mapOf("pending" to true)))
        } catch (e: Exception) {
            callback(Result.failure(BridgeError.internalError("启动视频选择失败: ${e.message}")))
        }
    }
    
    // MARK: - PickMedia
    
    private fun pickMedia(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val mediaType = request.getString("mediaType") ?: "any"
        
        when (mediaType) {
            "image" -> pickImage(request, callback)
            "video" -> pickVideo(request, callback)
            else -> {
                val activity = bridgeContext.activity
                if (activity == null) {
                    callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
                    return
                }
                
                try {
                    val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI).apply {
                        type = "*/*"
                        putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
                    }
                    
                    activity.startActivityForResult(intent, REQUEST_PICK_MEDIA)
                    callback(Result.success(mapOf("pending" to true)))
                } catch (e: Exception) {
                    callback(Result.failure(BridgeError.internalError("启动媒体选择失败: ${e.message}")))
                }
            }
        }
    }
    
    // MARK: - GetAlbums
    
    private fun getAlbums(callback: (Result<Any?>) -> Unit) {
        scope.launch(Dispatchers.IO) {
            try {
                val albums = mutableListOf<Map<String, Any>>()
                val albumMap = mutableMapOf<String, Int>()
                
                val projection = arrayOf(
                    MediaStore.Images.Media.BUCKET_ID,
                    MediaStore.Images.Media.BUCKET_DISPLAY_NAME
                )
                
                context.contentResolver.query(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    null,
                    null,
                    null
                )?.use { cursor ->
                    val bucketIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_ID)
                    val bucketNameColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_DISPLAY_NAME)
                    
                    while (cursor.moveToNext()) {
                        val bucketId = cursor.getString(bucketIdColumn)
                        val bucketName = cursor.getString(bucketNameColumn) ?: "Unknown"
                        
                        albumMap[bucketId] = (albumMap[bucketId] ?: 0) + 1
                    }
                }
                
                albumMap.forEach { (id, count) ->
                    albums.add(mapOf(
                        "identifier" to id,
                        "title" to id,
                        "count" to count,
                        "type" to "user"
                    ))
                }
                
                withContext(Dispatchers.Main) {
                    callback(Result.success(mapOf("albums" to albums)))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    callback(Result.failure(BridgeError.internalError("获取相册失败: ${e.message}")))
                }
            }
        }
    }
    
    // MARK: - GetPhotos
    
    private fun getPhotos(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        scope.launch(Dispatchers.IO) {
            try {
                val offset = request.getInt("offset") ?: 0
                val limit = request.getInt("limit") ?: 50
                val mediaType = request.getString("mediaType") ?: "image"
                
                val photos = mutableListOf<Map<String, Any?>>()
                
                val uri = when (mediaType) {
                    "video" -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    else -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                }
                
                val projection = arrayOf(
                    MediaStore.MediaColumns._ID,
                    MediaStore.MediaColumns.WIDTH,
                    MediaStore.MediaColumns.HEIGHT,
                    MediaStore.MediaColumns.DATE_ADDED,
                    MediaStore.MediaColumns.MIME_TYPE
                )
                
                context.contentResolver.query(
                    uri,
                    projection,
                    null,
                    null,
                    "${MediaStore.MediaColumns.DATE_ADDED} DESC"
                )?.use { cursor ->
                    var count = 0
                    var skipped = 0
                    
                    while (cursor.moveToNext() && count < limit) {
                        if (skipped < offset) {
                            skipped++
                            continue
                        }
                        
                        val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID))
                        val width = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.WIDTH))
                        val height = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.HEIGHT))
                        val dateAdded = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED))
                        val mimeType = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE))
                        
                        photos.add(mapOf(
                            "identifier" to id.toString(),
                            "width" to width,
                            "height" to height,
                            "creationDate" to dateAdded * 1000,
                            "mediaType" to if (mimeType?.startsWith("video") == true) "video" else "image",
                            "mimeType" to mimeType
                        ))
                        
                        count++
                    }
                }
                
                withContext(Dispatchers.Main) {
                    callback(Result.success(mapOf(
                        "photos" to photos,
                        "offset" to offset,
                        "limit" to limit
                    )))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    callback(Result.failure(BridgeError.internalError("获取照片失败: ${e.message}")))
                }
            }
        }
    }
    
    // MARK: - SaveToAlbum
    
    private fun saveToAlbum(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val base64Data = request.getString("data")
        if (base64Data == null) {
            callback(Result.failure(BridgeError.invalidParams("data")))
            return
        }
        
        scope.launch(Dispatchers.IO) {
            try {
                val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
                val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                
                val contentValues = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, "IMG_${System.currentTimeMillis()}.jpg")
                    put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES)
                        put(MediaStore.Images.Media.IS_PENDING, 1)
                    }
                }
                
                val uri = context.contentResolver.insert(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    contentValues
                )
                
                uri?.let {
                    context.contentResolver.openOutputStream(it)?.use { outputStream ->
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 100, outputStream)
                    }
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        contentValues.clear()
                        contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                        context.contentResolver.update(it, contentValues, null, null)
                    }
                }
                
                withContext(Dispatchers.Main) {
                    callback(Result.success(mapOf("success" to true)))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    callback(Result.failure(BridgeError.internalError("保存图片失败: ${e.message}")))
                }
            }
        }
    }
    
    // MARK: - 辅助方法
    
    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("JPEG_${timeStamp}_", ".jpg", storageDir)
    }
    
    fun onDestroy() {
        scope.cancel()
    }
    
    companion object {
        const val REQUEST_MEDIA_PERMISSION = 2001
        const val REQUEST_TAKE_PHOTO = 2002
        const val REQUEST_RECORD_VIDEO = 2003
        const val REQUEST_PICK_IMAGE = 2004
        const val REQUEST_PICK_VIDEO = 2005
        const val REQUEST_PICK_MEDIA = 2006
    }
}
