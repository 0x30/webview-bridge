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

    // MARK: - 统一 keysToFetch 常量

    private let allContactKeysToFetch: [CNKeyDescriptor] = [
        CNContactIdentifierKey as CNKeyDescriptor,
        CNContactGivenNameKey as CNKeyDescriptor,
        CNContactFamilyNameKey as CNKeyDescriptor,
        CNContactMiddleNameKey as CNKeyDescriptor,
        CNContactNamePrefixKey as CNKeyDescriptor,
        CNContactNameSuffixKey as CNKeyDescriptor,
        CNContactNicknameKey as CNKeyDescriptor,
        CNContactPhoneticGivenNameKey as CNKeyDescriptor,
        CNContactPhoneticFamilyNameKey as CNKeyDescriptor,
        CNContactPhoneticMiddleNameKey as CNKeyDescriptor,
        CNContactOrganizationNameKey as CNKeyDescriptor,
        CNContactJobTitleKey as CNKeyDescriptor,
        CNContactDepartmentNameKey as CNKeyDescriptor,
        CNContactPhoneNumbersKey as CNKeyDescriptor,
        CNContactEmailAddressesKey as CNKeyDescriptor,
        CNContactPostalAddressesKey as CNKeyDescriptor,
        CNContactBirthdayKey as CNKeyDescriptor,
        CNContactImageDataAvailableKey as CNKeyDescriptor,
        CNContactThumbnailImageDataKey as CNKeyDescriptor,
        CNContactImageDataKey as CNKeyDescriptor,
        // CNContactFormatter 所需的键
        CNContactFormatter.descriptorForRequiredKeys(for: .fullName),
    ]

    // MARK: - Handle Request

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

    // MARK: - 权限

    private func hasPermission(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        callback(
            .success([
                "granted": status == .authorized,
                "status": permissionStatusString(status),
            ])
        )
    }

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
            callback(
                .success([
                    "granted": granted,
                    "status": self.permissionStatusString(status),
                ])
            )
        }
    }

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

    // MARK: - GetContacts

    private func getContacts(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let store = CNContactStore()

        guard CNContactStore.authorizationStatus(for: .contacts) == .authorized
        else {
            callback(
                .failure(
                    BridgeError(code: .permissionDenied, message: "未获得通讯录权限")
                )
            )
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                var contacts: [[String: Any]] = []
                let request = CNContactFetchRequest(
                    keysToFetch: self.allContactKeysToFetch
                )

                // 可选搜索
                if let query = params["query"]?.stringValue, !query.isEmpty {
                    request.predicate = CNContact.predicateForContacts(
                        matchingName: query
                    )
                }

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

    // MARK: - PickContact （已修复版本）

    private func pickContact(
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

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

            // 关键修复：提前声明常用字段，降低系统返回残缺contact的概率
            picker.displayedPropertyKeys = [
                CNContactIdentifierKey,
                CNContactGivenNameKey,
                CNContactFamilyNameKey,
                CNContactMiddleNameKey,
                CNContactPhoneNumbersKey,
                CNContactEmailAddressesKey,
                CNContactThumbnailImageDataKey,
            ]

            topVC.present(picker, animated: true, completion: nil)
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

        fetchFullContact(
            identifier: identifier,
            includePhoto: true,
            callback: callback
        )
    }

    // MARK: - CreateContact

    private func createContact(
        params: [String: AnyCodable],
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let contact = CNMutableContact()
        contact.givenName = params["givenName"]?.stringValue ?? ""
        contact.familyName = params["familyName"]?.stringValue ?? ""
        contact.middleName = params["middleName"]?.stringValue ?? ""
        contact.nickname = params["nickname"]?.stringValue ?? ""
        contact.organizationName = params["organization"]?.stringValue ?? ""
        contact.jobTitle = params["jobTitle"]?.stringValue ?? ""

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

        if let emails = params["emails"]?.arrayValue as? [[String: Any]] {
            contact.emailAddresses = emails.compactMap { email in
                guard let address = email["address"] as? String else {
                    return nil
                }
                let label = email["label"] as? String ?? CNLabelHome
                return CNLabeledValue(label: label, value: address as NSString)
            }
        }

        let store = CNContactStore()
        let request = CNSaveRequest()
        request.add(contact, toContainerWithIdentifier: nil)

        do {
            try store.execute(request)
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

    private func contactToDictionary(
        _ contact: CNContact,
        includePhoto: Bool = false
    ) -> [String: Any] {
        // 安全拼接 displayName
        let displayName: String
        if contact.isKeyAvailable(CNContactGivenNameKey)
            || contact.isKeyAvailable(CNContactFamilyNameKey)
        {
            displayName =
                CNContactFormatter.string(from: contact, style: .fullName)
                ?? "\(contact.givenName) \(contact.familyName)"
                .trimmingCharacters(in: .whitespaces)
        } else {
            displayName = "\(contact.givenName) \(contact.familyName)"
                .trimmingCharacters(in: .whitespaces)
        }

        // 构建字典
        var dict: [String: Any] = [
            "identifier": contact.identifier,
            "givenName": contact.givenName,
            "familyName": contact.familyName,
            "middleName": contact.middleName,
            "namePrefix": contact.namePrefix,
            "nameSuffix": contact.nameSuffix,
            "nickname": contact.nickname,
            "organization": contact.organizationName,
            "displayName": displayName,
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

    private func fetchFullContact(
        identifier: String,
        includePhoto: Bool,
        callback: @escaping (Result<Any?, BridgeError>) -> Void
    ) {
        let store = CNContactStore()
        do {
            let contact = try store.unifiedContact(
                withIdentifier: identifier,
                keysToFetch: allContactKeysToFetch
            )
            callback(
                .success(
                    contactToDictionary(contact, includePhoto: includePhoto)
                )
            )
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
}

// MARK: - CNContactPickerDelegate

extension ContactsModule: CNContactPickerDelegate {

    public func contactPicker(
        _ picker: CNContactPickerViewController,
        didSelect contact: CNContact
    ) {
        // 关键安全做法：只取 identifier，什么都不要碰！
        let safeIdentifier = contact.identifier

        // 尽早关闭 picker，提升体验
        picker.dismiss(animated: true, completion: nil)

        // 重新完整获取
        fetchFullContact(
            identifier: safeIdentifier,
            includePhoto: true,
            callback: { [weak self] result in
                self?.contactPickerCallback?(result)
                self?.contactPickerCallback = nil
            }
        )
    }

    public func contactPickerDidCancel(_ picker: CNContactPickerViewController)
    {
        contactPickerCallback?(.success(["cancelled": true]))
        contactPickerCallback = nil
    }
}
