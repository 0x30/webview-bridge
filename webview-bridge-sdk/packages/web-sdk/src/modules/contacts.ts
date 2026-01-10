/**
 * Contacts 模块 - 联系人功能
 *
 * 提供读取联系人列表、选择联系人等功能
 * 所有操作均由 Native 端执行
 */

import { BridgeCore } from '../core'
import { BridgeModule } from '../types'

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 电话号码
 */
export interface PhoneNumber {
  /** 电话号码 */
  number: string
  /** 标签（如"移动"、"家庭"等） */
  label: string
}

/**
 * 邮箱地址
 */
export interface EmailAddress {
  /** 邮箱地址 */
  address: string
  /** 标签 */
  label: string
}

/**
 * 联系人信息
 */
export interface Contact {
  /** 联系人唯一标识符 */
  identifier: string
  /** 显示名称 */
  displayName: string
  /** 名 */
  givenName?: string
  /** 姓 */
  familyName?: string
  /** 中间名 */
  middleName?: string
  /** 昵称 */
  nickname?: string
  /** 公司名称 */
  organization?: string
  /** 职位 */
  jobTitle?: string
  /** 电话号码列表 */
  phones: PhoneNumber[]
  /** 邮箱列表 */
  emails: EmailAddress[]
  /** 是否有头像 */
  hasImage: boolean
  /** 头像 Base64（可选） */
  imageBase64?: string
  /** 缩略图 Base64（可选） */
  thumbnailBase64?: string
}

/**
 * 获取联系人列表参数
 */
export interface GetContactsParams {
  /** 搜索关键词 */
  query?: string
  /** 偏移量 */
  offset?: number
  /** 限制数量 */
  limit?: number
}

/**
 * 获取联系人列表结果
 */
export interface GetContactsResult {
  /** 联系人列表 */
  contacts: Contact[]
  /** 总数 */
  total: number
  /** 偏移量 */
  offset: number
  /** 限制数量 */
  limit: number
}

/**
 * 创建联系人参数
 */
export interface CreateContactParams {
  /** 名 */
  givenName?: string
  /** 姓 */
  familyName?: string
  /** 中间名 */
  middleName?: string
  /** 昵称 */
  nickname?: string
  /** 公司名称 */
  organization?: string
  /** 职位 */
  jobTitle?: string
  /** 电话号码列表 */
  phones?: PhoneNumber[]
  /** 邮箱列表 */
  emails?: EmailAddress[]
}

/**
 * 权限状态结果
 */
export interface PermissionResult {
  /** 是否已授权 */
  granted: boolean
  /** 权限状态 */
  status: 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unknown'
}

// =============================================================================
// Contacts 模块实现
// =============================================================================

export class ContactsModule implements BridgeModule {
  readonly moduleName = 'Contacts'
  readonly methods = [
    'GetContacts',
    'PickContact',
    'GetContact',
    'CreateContact',
    'HasPermission',
    'RequestPermission',
  ] as const

  constructor(private bridge: BridgeCore) {}

  /**
   * 检查通讯录权限
   */
  async hasPermission(): Promise<PermissionResult> {
    return this.bridge.send<PermissionResult>('Contacts.HasPermission')
  }

  /**
   * 请求通讯录权限
   */
  async requestPermission(): Promise<PermissionResult> {
    return this.bridge.send<PermissionResult>('Contacts.RequestPermission')
  }

  /**
   * 获取联系人列表
   * @param params 查询参数
   */
  async getContacts(params?: GetContactsParams): Promise<GetContactsResult> {
    return this.bridge.send<GetContactsResult>('Contacts.GetContacts', params)
  }

  /**
   * 选择联系人（打开系统联系人选择器）
   */
  async pickContact(): Promise<Contact | { cancelled: boolean }> {
    return this.bridge.send<Contact | { cancelled: boolean }>('Contacts.PickContact')
  }

  /**
   * 获取单个联系人详情
   * @param identifier 联系人标识符
   */
  async getContact(identifier: string): Promise<Contact> {
    return this.bridge.send<Contact>('Contacts.GetContact', { identifier })
  }

  /**
   * 创建新联系人
   * @param contact 联系人信息
   */
  async createContact(contact: CreateContactParams): Promise<{ success: boolean; identifier: string }> {
    return this.bridge.send<{ success: boolean; identifier: string }>('Contacts.CreateContact', contact)
  }
}
