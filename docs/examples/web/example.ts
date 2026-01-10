// Example Web modules (client-side)
// Place this in your web app, not inside the SDK.

import { BridgeCore } from '@aspect/webview-bridge'

export interface UserInfo {
  userId: string
  username: string
  avatar?: string
  email?: string
  phone?: string
  extra?: Record<string, unknown>
}

export interface LoginParams {
  type: 'password' | 'sms' | 'oauth'
  account?: string
  password?: string
  code?: string
  provider?: 'wechat' | 'apple' | 'google'
}

export interface LoginResult {
  success: boolean
  user?: UserInfo
  token?: string
  error?: string
}

export interface AnalyticsEventParams {
  event: string
  properties?: Record<string, unknown>
  timestamp?: number
}

export class UserModule {
  readonly moduleName = 'User'
  readonly methods = ['GetCurrentUser', 'Login', 'Logout', 'UpdateProfile'] as const
  constructor(private bridge: BridgeCore) {}
  getCurrentUser() {
    return this.bridge.send<UserInfo | null>('User.GetCurrentUser')
  }
  login(params: LoginParams) {
    return this.bridge.send<LoginResult>('User.Login', params)
  }
  logout() {
    return this.bridge.send<void>('User.Logout')
  }
  updateProfile(profile: Partial<UserInfo>) {
    return this.bridge.send<UserInfo>('User.UpdateProfile', profile)
  }
}

export class AnalyticsModule {
  readonly moduleName = 'Analytics'
  readonly methods = ['Track', 'SetUserId', 'SetUserProperties', 'Flush'] as const
  constructor(private bridge: BridgeCore) {}
  track(params: AnalyticsEventParams) {
    return this.bridge.send<void>('Analytics.Track', {
      ...params,
      timestamp: params.timestamp ?? Date.now(),
    })
  }
  setUserId(userId: string) {
    return this.bridge.send<void>('Analytics.SetUserId', { userId })
  }
  setUserProperties(properties: Record<string, unknown>) {
    return this.bridge.send<void>('Analytics.SetUserProperties', { properties })
  }
  flush() {
    return this.bridge.send<void>('Analytics.Flush')
  }
}
