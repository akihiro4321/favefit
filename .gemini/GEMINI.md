# FaveFit プロジェクトコンテキスト

## Language
このプロジェクトでのやりとりや生成物はすべて日本語にすること

## プロジェクト概要
**FaveFit** は、ユーザーの目標（減量、筋肥大など）や好みに基づいて、パーソナライズされた週間の食事プランを生成するAI搭載型食事プランニングアプリケーションです。**Google Gemini API (@google/genai)** を活用し、食事プランの策定、レシピ生成、買い物リストの作成をマルチエージェントワークフローでオーケストレーションします。

## 技術スタック
- **フレームワーク:** Next.js 16 (App Router)
- **言語:** TypeScript
- **スタイリング:** Tailwind CSS, Radix UI (`lucide-react`, `class-variance-authority` を使用)
- **データベース:** Firebase Firestore
- **認証:** Firebase Auth
- **AI 統合:** Google Generative AI SDK (`@google/genai`)[https://googleapis.github.io/js-genai/release_docs/index.html]
- **テスト:** Vitest, React Testing Library

## アーキテクチャとディレクトリ構造
プロジェクトは標準的な Next.js App Router 構造に従い、クライアントUIとサーバーサイドロジックを明確に分離しています。

```text
src/
├── app/          # Next.js App Router ページおよび API ルート
├── components/   # React UI コンポーネント (shadcn/ui スタイルのパターン)
│   └── ui/       # プリミティブ UI コンポーネント (Button, Card など)
├── lib/          # クライアントサイド共通ユーティリティ、スキーマ、Firebase クライアント
├── server/       # サーバーサイドビジネスロジック
│   ├── ai/       # AI エージェント、プロンプト、ワークフロー
│   ├── db/       # Firestore リポジトリおよび型定義済みコレクション
│   └── services/ # アプリケーションサービス (食事プラン、ユーザーなど)
└── types/        # グローバル TypeScript 型定義
```

## データベース (Firestore)
データはユーザー中心の設計で Firestore に保存されます。`src/server/db/firestore/collections.ts` のコンバーターを介して型安全にアクセスされます。

**主要なコレクション:**
- **Users** (`/users/{userId}`): プロフィール、栄養目標、嗜好。
- **Plans** (`/plans/{planId}`): 各スロットの食事情報を含む週間プラン。
- **Recipe History** (`/recipeHistory/{userId}/recipes/{recipeId}`): 提案・調理されたレシピの履歴。
- **Shopping Lists** (`/shoppingLists/{listId}`): プランに紐づく集約された食材リスト。
- **Market Prices** (`/marketPrices/latest`): 食材の市場価格キャッシュデータ。

## 開発ワークフロー

### 前提条件
- Node.js (最新の LTS 推奨)
- Firebase プロジェクトの認証情報

### 主要コマンド
- **開発サーバー起動:** `npm run dev`
- **本番ビルド:** `npm run build`
- **テスト実行:** `npm run test` (Vitest)
- **リンター実行:** `npm run lint`
- **型チェック:** `npm run type-check`

### コーディング規約
- **UI:** スタイリングには Tailwind CSS を使用。`src/components/ui` にある既存のコンポーネントを優先的に使用。
- **状態管理:** 可能な限りデータ取得には React Server Components (RSC) を使用。ミューテーションには Server Actions を使用。
- **データベース:** Firestore とのやり取りには、必ず `src/server/db/firestore` にある型定義済みリポジトリを使用。コンポーネント内で生の SDK を呼び出すのは避ける。
- **AI エージェント:** 新しい AI 機能は `src/server/ai/agents` で定義し、`src/server/ai/workflows` で統合する。

## AI ワークフロー
アプリケーションは以下のマルチエージェントシステムを使用しています：
1.  **プランジェネレーター (Plan Generator):** 栄養素の制約に基づき、ハイレベルな週間メニューを作成。
2.  **レシピクリエイター (Recipe Creator):** 選択されたメニューの詳細なレシピを生成。
3.  **メニューアジャスター (Menu Adjuster):** ユーザーのフィードバック（例：「火曜の夕食を入れ替えて」）に基づきプランを修正。
4.  **買い物リストジェネレーター (Shopping List Generator):** 確定したプランから食材を抽出・集約。