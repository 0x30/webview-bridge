import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'WebView Bridge SDK',
  description: '跨平台 WebView 原生能力桥接 SDK',
  
  lang: 'zh-CN',
  
  // GitHub Pages 配置
  base: process.env.GITHUB_PAGES ? '/webview-bridge/' : '/',
  
  head: [
    ['link', { rel: 'icon', href: `${process.env.GITHUB_PAGES ? '/webview-bridge' : ''}/favicon.ico` }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API 文档', link: '/api/' },
      { text: '扩展', link: '/extension/overview' },
      {
        text: '平台',
        items: [
          { text: 'Web SDK', link: '/platforms/web' },
          { text: 'iOS SDK', link: '/platforms/ios' },
          { text: 'Android SDK', link: '/platforms/android' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
            { text: '基本用法', link: '/guide/basic-usage' },
            { text: '架构概述', link: '/guide/architecture' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '错误处理', link: '/guide/error-handling' },
            { text: '事件系统', link: '/guide/events' },
            { text: '调试技巧', link: '/guide/debugging' },
          ],
        },
      ],
      '/api/': [
        {
          text: '核心',
          items: [
            { text: '概览', link: '/api/' },
            { text: 'Bridge 对象', link: '/api/bridge' },
            { text: '事件', link: '/api/events' },
          ],
        },
        {
          text: '模块',
          items: [
            { text: 'App 应用', link: '/api/modules/app' },
            { text: 'Device 设备', link: '/api/modules/device' },
            { text: 'Storage 存储', link: '/api/modules/storage' },
            { text: 'Clipboard 剪贴板', link: '/api/modules/clipboard' },
            { text: 'Haptics 触觉反馈', link: '/api/modules/haptics' },
            { text: 'StatusBar 状态栏', link: '/api/modules/statusbar' },
            { text: 'System 系统', link: '/api/modules/system' },
            { text: 'Permission 权限', link: '/api/modules/permission' },
            { text: 'Contacts 联系人', link: '/api/modules/contacts' },
            { text: 'Media 媒体', link: '/api/modules/media' },
            { text: 'Location 位置', link: '/api/modules/location' },
            { text: 'Biometrics 生物识别', link: '/api/modules/biometrics' },
            { text: 'NFC 近场通信', link: '/api/modules/nfc' },
            { text: 'Network 网络', link: '/api/modules/network' },
          ],
        },
      ],
      '/extension/': [
        {
          text: '扩展开发',
          items: [
            { text: '概述', link: '/extension/overview' },
            { text: '创建模块', link: '/extension/create-module' },
            { text: 'iOS 实现', link: '/extension/ios-implementation' },
            { text: 'Android 实现', link: '/extension/android-implementation' },
            { text: 'Web 实现', link: '/extension/web-implementation' },
            { text: '最佳实践', link: '/extension/best-practices' },
          ],
        },
      ],
      '/platforms/': [
        {
          text: '平台集成',
          items: [
            { text: 'Web SDK', link: '/platforms/web' },
            { text: 'iOS SDK', link: '/platforms/ios' },
            { text: 'Android SDK', link: '/platforms/android' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/aspect/webview-bridge' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Aspect',
    },

    search: {
      provider: 'local',
    },

    outline: {
      label: '页面导航',
      level: [2, 3],
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    lastUpdated: {
      text: '最后更新于',
    },

    editLink: {
      pattern: 'https://github.com/aspect/webview-bridge/edit/main/docs-site/:path',
      text: '在 GitHub 上编辑此页',
    },
  },
})
