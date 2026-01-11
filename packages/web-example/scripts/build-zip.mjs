/**
 * 构建 ZIP 包脚本
 * 将 dist 目录打包成 web-bundle.zip，放到 public 目录供下载
 */

import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, '../dist');
const publicDir = join(__dirname, '../public');
const outputFile = join(publicDir, 'web-bundle.zip');

// 确保 public 目录存在
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// 检查 dist 是否存在
if (!existsSync(distDir)) {
  console.error('❌ dist 目录不存在，请先运行 npm run build');
  process.exit(1);
}

// 创建 zip 文件
const output = createWriteStream(outputFile);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最高压缩级别
});

output.on('close', () => {
  const size = (archive.pointer() / 1024).toFixed(2);
  console.log(`✅ ZIP 打包完成: ${outputFile}`);
  console.log(`   大小: ${size} KB`);
  console.log(`   内容: ${countFiles(distDir)} 个文件`);
  console.log('');
  console.log('📥 下载地址 (开发服务器运行时):');
  console.log('   http://localhost:5173/web-bundle.zip');
});

archive.on('error', (err) => {
  console.error('❌ 打包失败:', err);
  process.exit(1);
});

archive.pipe(output);

// 将 dist 目录添加到 zip (使用 www 作为根目录名)
archive.directory(distDir, 'www');

archive.finalize();

/**
 * 统计目录中的文件数量
 */
function countFiles(dir) {
  let count = 0;
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count++;
    }
  }
  
  return count;
}
