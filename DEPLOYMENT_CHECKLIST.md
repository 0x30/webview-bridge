# GitHub Pages 配置完成清单

## ✅ 已完成

- ✅ 创建 GitHub Actions 工作流文件 (`.github/workflows/deploy-docs.yml`)
- ✅ 配置 VitePress 支持 GitHub Pages (自动路径配置)
- ✅ 设置自动构建和部署
- ✅ 创建文档说明和指南

## 🚀 接下来的步骤

### 1. 推送代码到 GitHub

```bash
git add .github/workflows/deploy-docs.yml
git add docs-site/
git commit -m "ci: add GitHub Actions workflow for docs deployment"
git push origin main
```

### 2. 配置 GitHub 仓库

在 GitHub 仓库页面：

**Settings → Pages**

1. **Source**: 选择 "Deploy from a branch"
2. **Branch**: 选择 `gh-pages` 和 `/ (root)`
3. 点击 **Save**

**Settings → Actions → General**

1. **Workflow permissions**: 选择 "Read and write permissions"
2. 点击 **Save**

### 3. 检查部署状态

1. 进入仓库的 **Actions** 标签页
2. 查看 **Deploy Docs to GitHub Pages** 工作流
3. 等待绿色对勾 ✅（表示成功）
4. 进入 **Actions → Pages build and deployment** 查看部署结果

### 4. 访问文档

部署完成后，访问：

```
https://[your-username].github.io/webview-bridge/
```

## 📝 工作流说明

### 触发条件

工作流会在以下情况自动触发：

- ✅ 推送到 `main` 或 `master` 分支
- ✅ 修改 `docs-site/` 目录中的文件
- ✅ 修改工作流文件本身 `.github/workflows/deploy-docs.yml`
- ✅ 手动触发（GitHub Actions 页面中的 "Run workflow"）

### 构建步骤

1. **检出代码** - 从 GitHub 拉取最新代码
2. **设置 pnpm** - 使用 pnpm 8
3. **设置 Node.js** - 使用 Node.js 18
4. **安装依赖** - `pnpm install`
5. **构建文档** - `pnpm run build` (生成 `.vitepress/dist`)
6. **上传** - 上传构建产物
7. **部署** - 推送到 `gh-pages` 分支

### 部署时间

- 构建时间：通常 30-60 秒
- 部署时间：通常 10-30 秒
- 页面更新：部署后 1-5 分钟内生效

## 🛠️ 维护文档

### 编辑文档

```bash
# 编辑任意 markdown 文件
vim docs-site/guide/basic-usage.md

# 本地预览（可选）
cd docs-site
pnpm run dev
# 访问 http://localhost:5173
```

### 提交并推送

```bash
git add docs-site/
git commit -m "docs: update xxx"
git push origin main
```

工作流会自动重新构建和部署。

## ⚙️ VitePress 配置

VitePress 已配置为自动检测 `GITHUB_PAGES` 环境变量：

```typescript
base: process.env.GITHUB_PAGES ? '/webview-bridge/' : '/'
```

- **本地开发**：`base` = `/`
- **GitHub Pages**：`base` = `/webview-bridge/`（自动处理）

## 🔍 故障排查

### 工作流失败

1. 查看 **Actions** 标签页的错误日志
2. 常见原因：
   - 依赖安装失败 → 检查 `docs-site/package.json`
   - 构建失败 → 检查 VitePress 配置
   - 权限不足 → 检查 **Settings → Actions → Permissions**

### 页面无法访问

1. 确认 GitHub Pages 已启用并指向 `gh-pages` 分支
2. 等待 5-10 分钟让 DNS 缓存更新
3. 清除浏览器缓存 (Ctrl+Shift+Del)

### 样式或资源加载不正确

这通常表示 `base` 路径配置有问题：

1. 检查浏览器开发者工具中的网络标签页
2. 查看资源的完整 URL 是否正确
3. 检查 `.vitepress/config.ts` 中的 `base` 设置

## 📚 相关文档

- [VitePress 官方文档](https://vitepress.dev/)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [部署指南详情](./GITHUB_PAGES.md)

## 💡 提示

- 第一次部署可能需要 1-2 分钟
- 之后的更新通常只需 1 分钟
- 可以在 GitHub Pages 设置中查看部署历史
- 可以为自定义域名创建 `CNAME` 文件
