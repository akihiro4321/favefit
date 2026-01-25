# TailwindCSS再導入移行計画

## 背景

以前、Mastra Studioの起動問題を回避するため、TailwindCSSの使用を取りやめ、手動でユーティリティクラスを定義していました。Node.jsをLTS版に入れ直してnvmで管理するように変更したことで、Mastra Studioの起動問題が解決したため、TailwindCSSを再度利用するように変更します。

## 現状分析

### 現在の状態

1. **依存関係**
   - `package.json`にTailwindCSSが含まれていない
   - `postcss.config.mjs`は空（プラグインなし）
   - 以前はTailwindCSS v4（`@tailwindcss/postcss`）を使用していたが、コミット`29c011b`で削除

2. **CSS設定**
   - `src/app/globals.css`に手動でユーティリティクラスが大量に定義されている（139行目以降、約1000行以上）
   - コミット`29c011b`（2026-01-24）でTailwindCSS v4の`@import "tailwindcss"`と`@theme inline`セクションが削除され、手動CSSに置き換えられた
   - TailwindCSSのディレクティブ（`@tailwind base`, `@tailwind components`, `@tailwind utilities`）が存在しない

3. **設定ファイル**
   - `components.json`にはTailwindCSSの設定が残っているが、`config`が空文字列
   - `tailwind.config.js`が存在しない
   - `postcss.config.mjs`から`@tailwindcss/postcss`プラグインが削除されている

4. **コードベース**
   - 多くのコンポーネントでTailwindCSSのクラス名が使用されている（`flex`, `grid`, `text-*`, `bg-*`, `p-*`, `m-*`など）
   - shadcn/uiコンポーネントが使用されており、これらはTailwindCSSを前提としている

5. **Git履歴**
   - コミット`29c011b`: TailwindCSS v4を削除し、手動CSSに置き換え
   - コミット`0f14263`: TailwindCSS v4を使用していた最後のコミット
   - `scripts/fix-lightningcss.js`が削除された（TailwindCSS v4のlightningcss依存関係を修正するスクリプト）

## 移行計画

### フェーズ1: 準備と設定（影響度: 低）

#### 1.1 依存関係のインストール
- [ ] `tailwindcss`をdevDependenciesに追加
- [ ] `postcss`と`autoprefixer`をdevDependenciesに追加（Next.js 16では通常含まれているが確認）

#### 1.2 設定ファイルの作成・更新
- [ ] `tailwind.config.js`を作成
  - `content`パスに`src/**/*.{js,ts,jsx,tsx}`を指定
  - 既存のCSS変数（`--primary`, `--secondary`など）を`theme.extend`で統合
  - shadcn/uiとの互換性を確保
- [ ] `postcss.config.mjs`を更新してTailwindCSSとautoprefixerを追加
- [ ] `components.json`の`tailwind.config`を更新

### フェーズ2: CSSファイルの移行（影響度: 高）

#### 2.1 Git履歴から特定した削除対象

コミット`29c011b`（2026-01-24）でTailwindCSSを削除した際に追加された不要なスタイル記述を削除：

**削除対象（`globals.css`の139行目以降、約1000行以上）:**
- [ ] 手動で定義されたユーティリティクラス（`/* Utility classes (replacing Tailwind) */`コメント以降）
  - `.flex`, `.flex-col`, `.items-center`, `.justify-center`などの基本レイアウトクラス
  - `.container`, `.max-w-lg`, `.mx-auto`などのコンテナクラス
  - `.py-8`, `.py-12`, `.px-4`, `.px-6`, `.p-4`などのパディングクラス
  - `.min-h-screen`, `.min-h-[60vh]`などの高さクラス
  - `.gap-1`, `.gap-2`, `.gap-4`などのギャップクラス
  - `.text-center`, `.text-2xl`, `.text-sm`などのテキストクラス
  - `.font-bold`などのフォントクラス
  - `.bg-primary`, `.text-primary`などのカラークラス
  - `.w-5`, `.h-5`, `.w-8`, `.h-8`などのサイズクラス
  - `.mb-2`, `.mb-8`, `.mt-2`などのマージンクラス
  - `.grid`, `.grid-cols-2`, `.grid-cols-3`などのグリッドクラス
  - `.border`, `.rounded`, `.rounded-md`などのボーダー・角丸クラス
  - `.shadow-xs`, `.shadow-sm`, `.shadow-md`などのシャドウクラス
  - `.hover:*`, `.focus-visible:*`などの疑似クラス
  - `.dark .dark-*`などのダークモードクラス
  - その他、TailwindCSSが標準で提供するすべてのユーティリティクラス

**保持する必要があるカスタムスタイル:**
- CSS変数の定義（`:root`と`.dark`セクション）は維持
- カスタムアニメーション（`@keyframes pop-in`, `@keyframes slide-up`, `@keyframes pulse`）は維持
- カスタムアニメーションクラス（`.animate-pop-in`, `.animate-slide-up`）は`@layer utilities`で再定義

#### 2.2 `globals.css`の更新
- [ ] TailwindCSSディレクティブを追加（ファイル先頭、CSS変数定義の前）
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- [ ] CSS変数の定義は維持（`:root`と`.dark`セクション）
- [ ] カスタムアニメーション（`@keyframes pop-in`, `@keyframes slide-up`, `@keyframes pulse`）は維持
- [ ] 手動で定義されたユーティリティクラス（139行目以降の`/* Utility classes (replacing Tailwind) */`セクション全体）を削除
- [ ] カスタムアニメーションクラスを`@layer utilities`で定義
  ```css
  @layer utilities {
    .animate-pop-in {
      animation: pop-in 0.3s ease-out;
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
  }
  ```

#### 2.3 カスタムユーティリティの移行
以下のカスタムクラスは`tailwind.config.js`の`theme.extend`または`globals.css`の`@layer utilities`で定義：
- `.animate-pop-in` - `@layer utilities`で定義
- `.animate-slide-up` - `@layer utilities`で定義
- `.animate-pulse` - TailwindCSS標準なので削除（必要に応じて`theme.extend`でカスタマイズ）
- `.opacity-60` - TailwindCSS標準なので削除
- `.bg-primary/10`などのカスタムカラー - TailwindCSSの`color-mix`で対応可能
- カスタムブレークポイントやスペーシング（必要に応じて`theme.extend`で定義）

### フェーズ3: 動作確認とテスト（影響度: 中）

#### 3.1 ビルド確認
- [ ] `npm run build`が成功することを確認
- [ ] ビルドエラーがないことを確認
- [ ] ビルド後のCSSサイズを確認（最適化が正しく動作しているか）

#### 3.2 開発サーバーでの確認
- [ ] `npm run dev`で開発サーバーが起動することを確認
- [ ] 各ページでスタイルが正しく適用されていることを確認
  - [ ] ホームページ（`/`）
  - [ ] オンボーディング（`/onboarding`）
  - [ ] プランページ（`/plan`）
  - [ ] レシピページ（`/recipes`）
  - [ ] 履歴ページ（`/history`）
  - [ ] プロフィールページ（`/profile`）
  - [ ] その他のページ

#### 3.3 UIコンポーネントの確認
- [ ] shadcn/uiコンポーネントが正しく動作することを確認
  - [ ] Button
  - [ ] Card
  - [ ] Input
  - [ ] Dialog
  - [ ] Tabs
  - [ ] その他のUIコンポーネント

#### 3.4 レスポンシブデザインの確認
- [ ] モバイル表示が正しく動作することを確認
- [ ] タブレット表示が正しく動作することを確認
- [ ] デスクトップ表示が正しく動作することを確認

#### 3.5 ダークモードの確認
- [ ] ダークモードが正しく動作することを確認
- [ ] CSS変数が正しく適用されていることを確認

### フェーズ4: クリーンアップ（影響度: 低）

#### 4.1 不要なコードの削除
- [ ] 手動で定義されたユーティリティクラスが完全に削除されていることを確認
  - `globals.css`の139行目以降の`/* Utility classes (replacing Tailwind) */`セクション全体が削除されていることを確認
  - git diffで確認し、コミット`29c011b`で追加された手動スタイルがすべて削除されていることを確認
- [ ] コメントアウトされたコードがないことを確認
- [ ] 重複するスタイル定義がないことを確認

#### 4.2 削除されたファイルの確認
コミット`29c011b`で削除された以下のファイルは、TailwindCSS再導入後は不要のため再作成しない：
- [ ] `scripts/fix-lightningcss.js` - TailwindCSS v3では不要（v4のみ必要だった）

#### 4.3 ドキュメントの更新
- [ ] `README.md`の技術スタックセクションを確認・更新
  - TailwindCSS v3を使用することを明記（v4ではない）
- [ ] 必要に応じて開発ドキュメントを更新

## リスクと対策

### リスク1: スタイルの不一致
**影響**: 高  
**対策**: 
- フェーズ2で段階的に移行し、各ステップで動作確認
- ブラウザの開発者ツールでスタイルを確認
- ビジュアルリグレッションテストを実施

### リスク2: ビルドエラー
**影響**: 中  
**対策**: 
- TailwindCSSの設定を慎重に確認
- 段階的に移行し、各ステップでビルドを確認
- エラーが発生した場合は、該当するクラスを確認して修正

### リスク3: パフォーマンスへの影響
**影響**: 低  
**対策**: 
- TailwindCSSのJITモードを使用（デフォルト）
- ビルド後のCSSサイズを確認
- 不要なクラスが含まれていないことを確認

### リスク4: カスタムクラスの見落とし
**影響**: 中  
**対策**: 
- `globals.css`を慎重に確認
- カスタムクラスを`tailwind.config.js`または`@layer utilities`で定義
- 各ページで動作確認

## 実施手順

1. **ブランチの作成**
   ```bash
   git checkout -b feature/restore-tailwindcss
   ```

2. **フェーズ1の実施**
   - 依存関係のインストール
   - 設定ファイルの作成・更新

3. **フェーズ2の実施**
   - `globals.css`の更新
   - カスタムユーティリティの移行

4. **フェーズ3の実施**
   - 動作確認とテスト

5. **フェーズ4の実施**
   - クリーンアップとドキュメント更新

6. **プルリクエストの作成**
   - 変更内容の説明
   - テスト結果の報告
   - レビュー依頼

## 成功基準

- [ ] すべてのページでスタイルが正しく適用されている
- [ ] ビルドが成功する
- [ ] 開発サーバーが正常に起動する
- [ ] UIコンポーネントが正しく動作する
- [ ] レスポンシブデザインが正しく動作する
- [ ] ダークモードが正しく動作する
- [ ] パフォーマンスに大きな影響がない（ビルド時間、CSSサイズ）

## 参考情報

- [TailwindCSS公式ドキュメント](https://tailwindcss.com/docs)
- [Next.js + TailwindCSS統合ガイド](https://tailwindcss.com/docs/guides/nextjs)
- [shadcn/ui設定](https://ui.shadcn.com/docs/installation)
