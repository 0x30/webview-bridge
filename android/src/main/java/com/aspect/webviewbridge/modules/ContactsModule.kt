/**
 * Contacts 模块 - 联系人功能
 *
 * 提供读取联系人列表、选择联系人等功能
 */

package com.aspect.webviewbridge.modules

import android.Manifest
import android.app.Activity
import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import android.util.Base64
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.aspect.webviewbridge.protocol.*
import kotlinx.coroutines.*

/**
 * Contacts 模块
 */
class ContactsModule(
    private val context: Context,
    private val bridgeContext: BridgeModuleContext,
    private val activityProvider: () -> Activity?
) : BridgeModule {

    override val moduleName = "Contacts"

    override val methods = listOf(
        "GetContacts",
        "PickContact",
        "GetContact",
        "CreateContact",
        "HasPermission",
        "RequestPermission"
    )

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun handleRequest(
        method: String,
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        when (method) {
            "GetContacts" -> getContacts(request, callback)
            "PickContact" -> pickContact(callback)
            "GetContact" -> getContact(request, callback)
            "CreateContact" -> createContact(request, callback)
            "HasPermission" -> hasPermission(callback)
            "RequestPermission" -> requestPermission(callback)
            else -> callback(Result.failure(BridgeError.methodNotFound("$moduleName.$method")))
        }
    }

    // MARK: - HasPermission

    private fun hasPermission(callback: (Result<Any?>) -> Unit) {
        val readGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        val writeGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.WRITE_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        callback(
            Result.success(
                mapOf(
                    "granted" to readGranted,
                    "readGranted" to readGranted,
                    "writeGranted" to writeGranted,
                    "status" to if (readGranted) "authorized" else "denied"
                )
            )
        )
    }

    // MARK: - RequestPermission

    private fun requestPermission(callback: (Result<Any?>) -> Unit) {
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }

        ActivityCompat.requestPermissions(
            activity,
            arrayOf(
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.WRITE_CONTACTS
            ),
            REQUEST_CONTACTS_PERMISSION
        )

        // 注意：实际实现需要通过 onRequestPermissionsResult 回调
        // 这里简化为检查当前状态
        scope.launch {
            delay(500)
            hasPermission(callback)
        }
    }

    // MARK: - GetContacts

    private fun getContacts(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            callback(Result.failure(BridgeError.permissionDenied("未获得通讯录权限")))
            return
        }

        scope.launch(Dispatchers.IO) {
            try {
                val query = request.getString("query")
                val offset = request.getInt("offset") ?: 0
                val limit = request.getInt("limit") ?: 100

                val contacts = mutableListOf<Map<String, Any?>>()

                val projection = arrayOf(
                    ContactsContract.Contacts._ID,
                    ContactsContract.Contacts.LOOKUP_KEY,
                    ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
                    ContactsContract.Contacts.HAS_PHONE_NUMBER,
                    ContactsContract.Contacts.PHOTO_THUMBNAIL_URI
                )

                val selection = if (!query.isNullOrEmpty()) {
                    "${ContactsContract.Contacts.DISPLAY_NAME_PRIMARY} LIKE ?"
                } else null

                val selectionArgs = if (!query.isNullOrEmpty()) {
                    arrayOf("%$query%")
                } else null

                val cursor = context.contentResolver.query(
                    ContactsContract.Contacts.CONTENT_URI,
                    projection,
                    selection,
                    selectionArgs,
                    "${ContactsContract.Contacts.DISPLAY_NAME_PRIMARY} ASC"
                )

                var totalCount = 0
                cursor?.use {
                    totalCount = it.count

                    // 跳到偏移位置
                    if (offset > 0 && it.count > offset) {
                        it.moveToPosition(offset - 1)
                    }

                    var count = 0
                    while (it.moveToNext() && count < limit) {
                        val contact = readContactFromCursor(it)
                        contacts.add(contact)
                        count++
                    }
                }

                withContext(Dispatchers.Main) {
                    callback(
                        Result.success(
                            mapOf(
                                "contacts" to contacts,
                                "total" to totalCount,
                                "offset" to offset,
                                "limit" to limit
                            )
                        )
                    )
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    callback(Result.failure(BridgeError.internalError("读取联系人失败: ${e.message}")))
                }
            }
        }
    }

    // MARK: - PickContact

    private fun pickContact(callback: (Result<Any?>) -> Unit) {
        val activity = activityProvider()
        if (activity == null) {
            callback(Result.failure(BridgeError.internalError("无法获取 Activity")))
            return
        }

        val intent = Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI)
        activity.startActivityForResult(intent, REQUEST_PICK_CONTACT)

        // 注意：实际结果需要通过 onActivityResult 处理
        callback(Result.success(mapOf("pending" to true)))
    }

    // MARK: - GetContact

    private fun getContact(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        val identifier = request.getString("identifier")
        if (identifier == null) {
            callback(Result.failure(BridgeError.invalidParams("identifier")))
            return
        }

        scope.launch(Dispatchers.IO) {
            try {
                val contact = getContactById(identifier)
                withContext(Dispatchers.Main) {
                    if (contact != null) {
                        callback(Result.success(contact))
                    } else {
                        callback(Result.failure(BridgeError.internalError("联系人不存在")))
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    callback(Result.failure(BridgeError.internalError("获取联系人失败: ${e.message}")))
                }
            }
        }
    }

    // MARK: - CreateContact

    private fun createContact(
        request: BridgeRequest,
        callback: (Result<Any?>) -> Unit
    ) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CONTACTS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            callback(Result.failure(BridgeError.permissionDenied("未获得写入通讯录权限")))
            return
        }

        scope.launch(Dispatchers.IO) {
            try {
                val operations = ArrayList<android.content.ContentProviderOperation>()
                val rawContactInsertIndex = operations.size

                // 插入 RawContact
                operations.add(
                    android.content.ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                        .build()
                )

                // 插入姓名
                val displayName = buildString {
                    request.getString("givenName")?.let { append(it).append(" ") }
                    request.getString("familyName")?.let { append(it) }
                }.trim()

                if (displayName.isNotEmpty()) {
                    operations.add(
                        android.content.ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                            .withValueBackReference(
                                ContactsContract.Data.RAW_CONTACT_ID,
                                rawContactInsertIndex
                            )
                            .withValue(
                                ContactsContract.Data.MIMETYPE,
                                ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE
                            )
                            .withValue(
                                ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME,
                                displayName
                            )
                            .withValue(
                                ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME,
                                request.getString("givenName")
                            )
                            .withValue(
                                ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME,
                                request.getString("familyName")
                            )
                            .build()
                    )
                }

                // 插入电话号码
                @Suppress("UNCHECKED_CAST")
                val phones = request.params?.get("phones") as? List<Map<String, Any?>>
                phones?.forEach { phone ->
                    val number = phone["number"] as? String ?: return@forEach
                    operations.add(
                        android.content.ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                            .withValueBackReference(
                                ContactsContract.Data.RAW_CONTACT_ID,
                                rawContactInsertIndex
                            )
                            .withValue(
                                ContactsContract.Data.MIMETYPE,
                                ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE
                            )
                            .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, number)
                            .withValue(
                                ContactsContract.CommonDataKinds.Phone.TYPE,
                                ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
                            )
                            .build()
                    )
                }

                // 插入邮箱
                @Suppress("UNCHECKED_CAST")
                val emails = request.params?.get("emails") as? List<Map<String, Any?>>
                emails?.forEach { email ->
                    val address = email["address"] as? String ?: return@forEach
                    operations.add(
                        android.content.ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                            .withValueBackReference(
                                ContactsContract.Data.RAW_CONTACT_ID,
                                rawContactInsertIndex
                            )
                            .withValue(
                                ContactsContract.Data.MIMETYPE,
                                ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE
                            )
                            .withValue(ContactsContract.CommonDataKinds.Email.ADDRESS, address)
                            .withValue(
                                ContactsContract.CommonDataKinds.Email.TYPE,
                                ContactsContract.CommonDataKinds.Email.TYPE_HOME
                            )
                            .build()
                    )
                }

                // 执行批量操作
                val results =
                    context.contentResolver.applyBatch(ContactsContract.AUTHORITY, operations)
                val rawContactUri = results[0].uri
                val rawContactId = rawContactUri?.lastPathSegment

                withContext(Dispatchers.Main) {
                    callback(
                        Result.success(
                            mapOf(
                                "success" to true,
                                "identifier" to rawContactId
                            )
                        )
                    )
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    callback(Result.failure(BridgeError.internalError("保存联系人失败: ${e.message}")))
                }
            }
        }
    }

    // MARK: - 辅助方法

    private fun readContactFromCursor(cursor: Cursor): Map<String, Any?> {
        val contactId =
            cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.Contacts._ID))
        val lookupKey =
            cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.Contacts.LOOKUP_KEY))
        val displayName =
            cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY))
        val hasPhoneNumber =
            cursor.getInt(cursor.getColumnIndexOrThrow(ContactsContract.Contacts.HAS_PHONE_NUMBER))
        val photoUri =
            cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.Contacts.PHOTO_THUMBNAIL_URI))

        val phones = mutableListOf<Map<String, String>>()
        val emails = mutableListOf<Map<String, String>>()

        // 获取电话号码
        if (hasPhoneNumber > 0) {
            val phoneCursor = context.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.NUMBER,
                    ContactsContract.CommonDataKinds.Phone.TYPE
                ),
                "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
                arrayOf(contactId),
                null
            )
            phoneCursor?.use {
                while (it.moveToNext()) {
                    val number = it.getString(0)
                    val type = it.getInt(1)
                    phones.add(
                        mapOf(
                            "number" to number,
                            "label" to ContactsContract.CommonDataKinds.Phone.getTypeLabel(
                                context.resources, type, ""
                            ).toString()
                        )
                    )
                }
            }
        }

        // 获取邮箱
        val emailCursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Email.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Email.ADDRESS,
                ContactsContract.CommonDataKinds.Email.TYPE
            ),
            "${ContactsContract.CommonDataKinds.Email.CONTACT_ID} = ?",
            arrayOf(contactId),
            null
        )
        emailCursor?.use {
            while (it.moveToNext()) {
                val address = it.getString(0)
                val type = it.getInt(1)
                emails.add(
                    mapOf(
                        "address" to address,
                        "label" to ContactsContract.CommonDataKinds.Email.getTypeLabel(
                            context.resources, type, ""
                        ).toString()
                    )
                )
            }
        }

        return mapOf(
            "identifier" to contactId,
            "lookupKey" to lookupKey,
            "displayName" to displayName,
            "phones" to phones,
            "emails" to emails,
            "hasImage" to (photoUri != null),
            "photoUri" to photoUri
        )
    }

    private fun getContactById(contactId: String): Map<String, Any?>? {
        val cursor = context.contentResolver.query(
            ContactsContract.Contacts.CONTENT_URI,
            null,
            "${ContactsContract.Contacts._ID} = ?",
            arrayOf(contactId),
            null
        )

        return cursor?.use {
            if (it.moveToFirst()) {
                readContactFromCursor(it)
            } else null
        }
    }

    fun onDestroy() {
        scope.cancel()
    }

    companion object {
        const val REQUEST_CONTACTS_PERMISSION = 1001
        const val REQUEST_PICK_CONTACT = 1002
    }
}
