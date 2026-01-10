# GitHub Pages 部署指南

## 配置步骤

### 1. 推送到 GitHub

```bash
git add .
git commit -m "docs: add VitePress documentation and GitHub Actions workflow"
git push origin main
```

### 2. 配置 GitHub Pages

在你的 GitHub 仓库中：

1. 进入 **Settings** > **Pages**
2. **Source** 选择：**Deploy from a branch**
3. **Branch** 选择：**gh-pages** 和 **/ (root)**
4. 点击 **Save**

### 3. 启用 Actions

1. 进入 **Settings** > **Actions** > **General**
2. **Workflow permissions** 选择：**Read and write permissions**
3. 点击 **Save**

## 工作流说明

GitHub Actions 工作流 `.github/workflows/deploy-docs.yml` 会：

1. **监听事件**：
   - `main` 或 `master` 分支的 push
   - 对 `docs-site/` 目录的修改
   - 手动触发 (`workflow_dispatch`)

2. **构建流程**：
   - 检出代码
   - 安装 pnpm
   - 安装 Node.js 18
   - 安装 docs-site 依赖
   - 运行 `pnpm run build`

3. **部署流程**：
   - 上传构建产物到 `gh-pages` 分支
   - 自动部署到 GitHub Pages

## 首次部署

首次推送后，GitHub Actions 会自动运行：

1. 查看 **Actions** 标签页
2. 等待 **Deploy Docs to GitHub Pages** 工作流完成
3. 完成后，文档将在以下地址可用：

   ```
   https://[your-username].github.io/webview-bridge/
   ```

## 本地预览

在部署前可以本地预览：

```bash
cd docs-site
pnpm install
pnpm run dev
```

然后访问 `http://localhost:5173`

## 自定义域名

如果要使用自定义域名：

1. 在 `docs-site/.vitepress/config.ts` 中修改 `base` 配置
2. 在仓库根目录创建 `CNAME` 文件
3. 在 **Settings** > **Pages** 中配置自定义域名

## 故障排查

### 部署失败

1. 检查 **Actions** 标签页的错误日志
2. 确保 `docs-site/package.json` 中有 `build` 脚本
3. 检查依赖是否正确安装

### 页面显示不正确

1. 清除浏览器缓存
2. 检查 VitePress 配置中的 `base` 路径
3. 确保资源链接使用相对路径

### 样式缺失

这通常是因为 `base` 路径设置不正确。检查：
- VitePress 配置中的 `base` 值
- GitHub Pages 中的部署路径
- 浏览器开发者工具中的资源加载情况

## 更新文档

只需在 `docs-site/` 目录中进行修改并推送：

```bash
cd docs-site
# 编辑 markdown 文件
vim guide/xxx.md

# 推送
cd ..
git add docs-site/
git commit -m "docs: update xxx"
git push origin main
```

工作流会自动触发并部署更新。

## 环境变量

部署时会自动设置 `GITHUB_PAGES=true` 环境变量，VitePress 配置会根据此调整 `base` 路径。
