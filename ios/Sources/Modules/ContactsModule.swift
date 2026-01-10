/**
 * Contacts 模块 - 联系人功能
 *
 * 提供读取联系人列表、选择联系人等功能
 */

import Contacts
import ContactsUI
import Foundation
import UIKit

// MARK: - Contacts 模块

public class ContactsModule: NSObject, BridgeModule {

    public let moduleName = "Contacts"
    public let methods = [
        "GetContacts",
        "PickContact",
        "GetContact",
        "CreateContact",
        "HasPermission",
        "RequestPermission",
    ]

    private weak var bridge: WebViewBridge?
    private var contactPickerCallback: ((Result<Any?, BridgeError>) -> Void)?

    public init(bridge: WebViewBridge) {
        self.bridge = bridge
        super.init()
    }

    public func handleRequest(
        method: String,
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        switch method {
        case "GetContacts":
            getContacts(params: params, callback: callback)
        case "PickContact":
            pickContact(callback: callback)
        case "GetContact":
            getContact(params: params, callback: callback)
        case "CreateContact":
            createContact(params: params, callback: callback)
        case "HasPermission":
            hasPermission(callback: callback)
        case "RequestPermission":
            requestPermission(callback: callback)
        default:
            callback(
                .failure(BridgeError.methodNotFound("\(moduleName).\(method)"))
            )
        }
    }

    // MARK: - HasPermission

    private func hasPermission(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        let result: [String: Any] = [
            "granted": status == .authorized,
            "status": permissionStatusString(status),
        ]
        callback(.success(result))
    }

    // MARK: - RequestPermission

    private func requestPermission(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let store = CNContactStore()
        store.requestAccess(for: .contacts) { granted, error in
            if let error = error {
                callback(
                    .failure(
                        BridgeError(
                            code: .internalError,
                            message: error.localizedDescription
                        )
                    )
                )
                return
            }

            let status = CNContactStore.authorizationStatus(for: .contacts)
            let result: [String: Any] = [
                "granted": granted,
                "status": self.permissionStatusString(status),
            ]
            callback(.success(result))
        }
    }

    // MARK: - GetContacts

    private func getContacts(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let store = CNContactStore()

        // 检查权限
        let status = CNContactStore.authorizationStatus(for: .contacts)
        guard status == .authorized else {
            callback(
                .failure(
                    BridgeError(code: .permissionDenied, message: "未获得通讯录权限")
                )
            )
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let keysToFetch: [CNKeyDescriptor] = [
                    CNContactIdentifierKey as CNKeyDescriptor,
                    CNContactGivenNameKey as CNKeyDescriptor,
                    CNContactFamilyNameKey as CNKeyDescriptor,
                    CNContactMiddleNameKey as CNKeyDescriptor,
                    CNContactNamePrefixKey as CNKeyDescriptor,
                    CNContactNameSuffixKey as CNKeyDescriptor,
                    CNContactNicknameKey as CNKeyDescriptor,
                    CNContactOrganizationNameKey as CNKeyDescriptor,
                    CNContactJobTitleKey as CNKeyDescriptor,
                    CNContactDepartmentNameKey as CNKeyDescriptor,
                    CNContactPhoneNumbersKey as CNKeyDescriptor,
                    CNContactEmailAddressesKey as CNKeyDescriptor,
                    CNContactPostalAddressesKey as CNKeyDescriptor,
                    CNContactBirthdayKey as CNKeyDescriptor,
                    CNContactNoteKey as CNKeyDescriptor,
                    CNContactImageDataAvailableKey as CNKeyDescriptor,
                    CNContactThumbnailImageDataKey as CNKeyDescriptor,
                    CNContactImageDataKey as CNKeyDescriptor,
                ]

                var contacts: [[String: Any]] = []
                let request = CNContactFetchRequest(keysToFetch: keysToFetch)

                // 可选过滤
                if let query = params["query"]?.stringValue, !query.isEmpty {
                    request.predicate = CNContact.predicateForContacts(
                        matchingName: query
                    )
                }

                // 分页参数
                let offset = params["offset"]?.intValue ?? 0
                let limit = params["limit"]?.intValue ?? 100
                var currentIndex = 0

                try store.enumerateContacts(with: request) { contact, stop in
                    if currentIndex >= offset && contacts.count < limit {
                        contacts.append(self.contactToDictionary(contact))
                    }
                    currentIndex += 1

                    if contacts.count >= limit {
                        stop.pointee = true
                    }
                }

                callback(
                    .success([
                        "contacts": contacts,
                        "total": currentIndex,
                        "offset": offset,
                        "limit": limit,
                    ])
                )
            } catch {
                callback(
                    .failure(
                        BridgeError(
                            code: .internalError,
                            message: "读取联系人失败: \(error.localizedDescription)"
                        )
                    )
                )
            }
        }
    }

    // MARK: - PickContact

    private func pickContact(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.main.async {
            guard let topVC = UIApplication.shared.topViewController else {
                callback(
                    .failure(
                        BridgeError(
                            code: .internalError,
                            message: "无法获取当前视图控制器"
                        )
                    )
                )
                return
            }

            self.contactPickerCallback = callback

            let picker = CNContactPickerViewController()
            picker.delegate = self
            topVC.present(picker, animated: true)
        }
    }

    // MARK: - GetContact

    private func getContact(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        guard let identifier = params["identifier"]?.stringValue else {
            callback(.failure(BridgeError.invalidParams("identifier")))
            return
        }

        let store = CNContactStore()

        do {
            let keysToFetch: [CNKeyDescriptor] = [
                CNContactIdentifierKey as CNKeyDescriptor,
                CNContactGivenNameKey as CNKeyDescriptor,
                CNContactFamilyNameKey as CNKeyDescriptor,
                CNContactMiddleNameKey as CNKeyDescriptor,
                CNContactNamePrefixKey as CNKeyDescriptor,
                CNContactNameSuffixKey as CNKeyDescriptor,
                CNContactNicknameKey as CNKeyDescriptor,
                CNContactOrganizationNameKey as CNKeyDescriptor,
                CNContactJobTitleKey as CNKeyDescriptor,
                CNContactDepartmentNameKey as CNKeyDescriptor,
                CNContactPhoneNumbersKey as CNKeyDescriptor,
                CNContactEmailAddressesKey as CNKeyDescriptor,
                CNContactPostalAddressesKey as CNKeyDescriptor,
                CNContactBirthdayKey as CNKeyDescriptor,
                CNContactNoteKey as CNKeyDescriptor,
                CNContactImageDataKey as CNKeyDescriptor,
                CNContactThumbnailImageDataKey as CNKeyDescriptor,
                CNContactImageDataAvailableKey as CNKeyDescriptor,
            ]

            let contact = try store.unifiedContact(
                withIdentifier: identifier,
                keysToFetch: keysToFetch
            )
            callback(.success(contactToDictionary(contact, includePhoto: true)))
        } catch {
            callback(
                .failure(
                    BridgeError(
                        code: .internalError,
                        message: "获取联系人失败: \(error.localizedDescription)"
                    )
                )
            )
        }
    }

    // MARK: - CreateContact

    private func createContact(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let contact = CNMutableContact()

        // 设置姓名
        if let givenName = params["givenName"]?.stringValue {
            contact.givenName = givenName
        }
        if let familyName = params["familyName"]?.stringValue {
            contact.familyName = familyName
        }
        if let middleName = params["middleName"]?.stringValue {
            contact.middleName = middleName
        }
        if let nickname = params["nickname"]?.stringValue {
            contact.nickname = nickname
        }

        // 设置公司
        if let organization = params["organization"]?.stringValue {
            contact.organizationName = organization
        }
        if let jobTitle = params["jobTitle"]?.stringValue {
            contact.jobTitle = jobTitle
        }

        // 设置电话号码
        if let phones = params["phones"]?.arrayValue as? [[String: Any]] {
            contact.phoneNumbers = phones.compactMap { phone in
                guard let number = phone["number"] as? String else {
                    return nil
                }
                let label =
                    phone["label"] as? String ?? CNLabelPhoneNumberMobile
                return CNLabeledValue(
                    label: label,
                    value: CNPhoneNumber(stringValue: number)
                )
            }
        }

        // 设置邮箱
        if let emails = params["emails"]?.arrayValue as? [[String: Any]] {
            contact.emailAddresses = emails.compactMap { email in
                guard let address = email["address"] as? String else {
                    return nil
                }
                let label = email["label"] as? String ?? CNLabelHome
                return CNLabeledValue(label: label, value: address as NSString)
            }
        }

        // 保存联系人
        let store = CNContactStore()
        let saveRequest = CNSaveRequest()
        saveRequest.add(contact, toContainerWithIdentifier: nil)

        do {
            try store.execute(saveRequest)
            callback(
                .success([
                    "success": true,
                    "identifier": contact.identifier,
                ])
            )
        } catch {
            callback(
                .failure(
                    BridgeError(
                        code: .internalError,
                        message: "保存联系人失败: \(error.localizedDescription)"
                    )
                )
            )
        }
    }

    // MARK: - 辅助方法

    private func permissionStatusString(_ status: CNAuthorizationStatus)
        -> String
    {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorized: return "authorized"
        @unknown default: return "unknown"
        }
    }

    private func contactToDictionary(
        _ contact: CNContact,
        includePhoto: Bool = false
    ) -> [String: Any] {
        var dict: [String: Any] = [
            "identifier": contact.identifier,
            "givenName": contact.givenName,
            "familyName": contact.familyName,
            "middleName": contact.middleName,
            "namePrefix": contact.namePrefix,
            "nameSuffix": contact.nameSuffix,
            "nickname": contact.nickname,
            "organization": contact.organizationName,
            "displayName": CNContactFormatter.string(
                from: contact,
                style: .fullName
            ) ?? "",
        ]

        // 电话号码
        dict["phones"] = contact.phoneNumbers.map { phone in
            [
                "label": CNLabeledValue<NSString>.localizedString(
                    forLabel: phone.label ?? ""
                ),
                "number": phone.value.stringValue,
            ]
        }

        // 邮箱
        dict["emails"] = contact.emailAddresses.map { email in
            [
                "label": CNLabeledValue<NSString>.localizedString(
                    forLabel: email.label ?? ""
                ),
                "address": email.value as String,
            ]
        }

        // 头像
        dict["hasImage"] = contact.imageDataAvailable
        if includePhoto, let imageData = contact.imageData {
            dict["imageBase64"] = imageData.base64EncodedString()
        } else if let thumbnailData = contact.thumbnailImageData {
            dict["thumbnailBase64"] = thumbnailData.base64EncodedString()
        }

        return dict
    }
}

// MARK: - CNContactPickerDelegate

extension ContactsModule: CNContactPickerDelegate {
    public func contactPicker(
        _ picker: CNContactPickerViewController,
        didSelect contact: CNContact
    ) {
        let result = contactToDictionary(contact, includePhoto: true)
        contactPickerCallback?(.success(result))
        contactPickerCallback = nil
    }

    public func contactPickerDidCancel(_ picker: CNContactPickerViewController)
    {
        contactPickerCallback?(.success(["cancelled": true]))
        contactPickerCallback = nil
    }
}
