# 技術スタック: FaveFit

## 1. フロントエンド
- **フレームワーク:** Next.js 16 (App Router)
  - Turbopack (デフォルト)
  - PWA サポート (`next-pwa`)
- **UI ライブラリ:** Tailwind CSS + shadcn/ui
- **言語:** TypeScript

## 2. バックエンド & AI
- **フレームワーク:** Google ADK (Agent Development Kit) TypeScript
- **実行環境:** Google Cloud Run
- **AI モデル:** Gemini 2.5 Flash (via Gemini API)
  - **選定理由:** リアルタイムなインタラクションに適した高速性とコスト効率。

## 3. データベース & 認証
- **データベース:** Firestore (NoSQL)
  - 構造: ユーザー中心のドキュメントコレクション。
- **認証:** Firebase Auth
  - 方法: Google ログイン & メール/パスワード。

## 4. インフラ & ツール
- **ホスティング:** Google Cloud Run (Frontend & Backend)
- **バージョン管理:** Git
