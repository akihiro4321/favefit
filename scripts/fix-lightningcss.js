#!/usr/bin/env node

/**
 * lightningcssのネイティブモジュールのシンボリックリンクを修正するスクリプト
 * Tailwind CSS v4の依存関係として必要なlightningcssが正しく動作するようにします
 */

const fs = require('fs');
const path = require('path');

const lightningcssDir = path.join(__dirname, '..', 'node_modules', 'lightningcss');
const lightningcssArm64Dir = path.join(__dirname, '..', 'node_modules', 'lightningcss-darwin-arm64');

// lightningcssディレクトリが存在するか確認
if (!fs.existsSync(lightningcssDir)) {
  console.log('lightningcss not found, skipping fix');
  process.exit(0);
}

// lightningcss-darwin-arm64ディレクトリが存在するか確認
if (!fs.existsSync(lightningcssArm64Dir)) {
  console.log('lightningcss-darwin-arm64 not found, skipping fix');
  process.exit(0);
}

const targetFile = path.join(lightningcssArm64Dir, 'lightningcss.darwin-arm64.node');

if (!fs.existsSync(targetFile)) {
  console.log('lightningcss.darwin-arm64.node not found, skipping fix');
  process.exit(0);
}

// シンボリックリンクを作成
const links = [
  { from: path.join(lightningcssDir, 'lightningcss.darwin-arm64.node'), to: targetFile },
  { from: path.join(lightningcssDir, 'lightningcss.darwin-x64.node'), to: targetFile },
];

links.forEach(({ from, to }) => {
  try {
    // 既存のファイル/リンクを削除
    if (fs.existsSync(from)) {
      fs.unlinkSync(from);
    }
    // シンボリックリンクを作成
    fs.symlinkSync(path.relative(path.dirname(from), to), from);
    console.log(`Created symlink: ${from} -> ${to}`);
  } catch (error) {
    console.error(`Failed to create symlink ${from}:`, error.message);
  }
});

// lightningcss/node/index.jsを修正して、x64リクエスト時にarm64を使用するようにする
const indexJsPath = path.join(lightningcssDir, 'node', 'index.js');
if (fs.existsSync(indexJsPath)) {
  try {
    let content = fs.readFileSync(indexJsPath, 'utf8');
    const originalCode = `if (process.env.CSS_TRANSFORMER_WASM) {
  module.exports = require(\`../pkg\`);
} else {
  try {
    module.exports = require(\`lightningcss-\${parts.join('-')}\`);
  } catch (err) {
    module.exports = require(\`../lightningcss.\${parts.join('-')}.node\`);
  }
}`;
    
    const fixedCode = `if (process.env.CSS_TRANSFORMER_WASM) {
  module.exports = require(\`../pkg\`);
} else {
  try {
    module.exports = require(\`lightningcss-\${parts.join('-')}\`);
  } catch (err) {
    // Fallback: try arm64 if x64 is requested on Apple Silicon
    let nodeFile = \`../lightningcss.\${parts.join('-')}.node\`;
    try {
      module.exports = require(nodeFile);
    } catch (err2) {
      if (process.platform === 'darwin' && parts[1] === 'x64') {
        // On Apple Silicon, try arm64 version
        nodeFile = '../lightningcss.darwin-arm64.node';
        module.exports = require(nodeFile);
      } else {
        throw err2;
      }
    }
  }
}`;
    
    if (content.includes(originalCode)) {
      content = content.replace(originalCode, fixedCode);
      fs.writeFileSync(indexJsPath, content, 'utf8');
      console.log('Fixed lightningcss/node/index.js');
    } else if (!content.includes('On Apple Silicon, try arm64 version')) {
      // 既に修正されているか確認
      console.log('lightningcss/node/index.js already fixed or different format');
    }
  } catch (error) {
    console.error(`Failed to fix ${indexJsPath}:`, error.message);
  }
}

console.log('lightningcss fix completed');
