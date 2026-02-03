# FaveFit Project Context (for AI Agent)

## Overview

FaveFitは、AIパワーを活用した食事プランニングアプリケーションです。Vercel AI SDKとGoogle Geminiを使用して、パーソナライズされた最大14日間の食事プラン（現在は7日間がデフォルト）を生成します。ユーザーの栄養目標、味の好み、市場価格を最適化し、時間枠ごとの個別制約への対応やマクロの自動バランス調整、冷蔵庫活用などの機能を備えています。

## Tech Stack

- **Framework:** Next.js 16.1.3 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 3.4, Radix UI (shadcn/ui compatible)
- **AI Engine:** Vercel AI SDK (`ai`), `@ai-sdk/google`
- **LLM:** Google Gemini Flash Latest
- **Database:** Firebase Firestore
- **Authentication:** Firebase Authentication
- **Observability:** Langfuse
- **Testing:** Vitest

## Key Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js 開発サーバーの起動 (local:3000) |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバーの起動 |
| `npm run lint` | ESLint の実行 |
| `npm run type-check` | TypeScript の型チェック (`tsc --noEmit`) |
| `npm test` | Vitest によるテスト実行 |

## Architecture & Layers

FaveFitは**レイヤードアーキテクチャ**を採用しており、各層が明確に分離されています:

```
Frontend (React Components)
    ↓
API Routes (/api/*)
    ↓
Services (src/server/services/)
    ↓
Repositories (src/server/db/firestore/)
    ↓
Database (Firestore)
```

### AI Agents

コアとなるAIロジックは `src/server/ai/` に集約されており、特定のタスクごとにエージェントが定義されています。

| Agent Name | Role | Defined In |
| --- | --- | --- |
| **Plan Generator** | 食事プランの骨組み（スケジューリング）の生成 | `src/server/ai/agents/plan-generator.ts` |
| **Recipe Creator** | 詳細なレシピ（材料・手順）の作成 | `src/server/ai/agents/recipe-creator.ts` |
| **Menu Adjuster** | 冷蔵庫の中身に基づいた代替案の提案 | `src/server/ai/agents/menu-adjuster.ts` |
| **Preference Learner** | ユーザーのフィードバックからの学習 | `src/server/ai/agents/preference-learner.ts` |

**Data Flow:**

1. **User Input:** フロントエンド（React Components）からユーザーの目標と嗜好を入力。
2. **API Routes:** `/api/plan/generate` などのエンドポイントでリクエストを受付。
3. **Services:** `plan-service.ts` がビジネスロジックを実行し、`src/server/ai/workflows/meal-plan-generation.ts` を呼び出し。
4. **AI Workflow:** 各エージェントを順次呼び出し、バリデーションと修正を行ってJSONデータを生成。
5. **Repositories:** `planRepository.ts` などがFirestoreへのデータ保存を担当。
6. **Firestore:** ユーザープロファイル (`users/{userId}`)、プラン (`plans/{planId}`)、履歴を保存。
7. **Langfuse:** エージェントの実行とツール使用のトレース。

## Directory Structure

```
src/
├── app/                      # Next.js App Router ページと API ルート
│   ├── api/                  # API エンドポイント (Controller層)
│   │   ├── user/            # ユーザー関連API
│   │   ├── plan/            # プラン関連API
│   │   ├── recipe/          # レシピ関連API
│   │   ├── menu/            # メニュー提案API
│   │   ├── shopping/        # 買い物リスト関連API
│   │   ├── history/         # レシピ履歴関連API
│   │   └── feedback/        # フィードバック関連API
│   ├── home/                # ホームページ
│   ├── onboarding/          # オンボーディングページ
│   └── ...                  # その他のページ
├── components/              # React UI コンポーネント
│   └── ui/                  # shadcn/ui 互換コンポーネント
├── lib/                     # 共有ユーティリティ（クライアント側）
│   ├── firebase-client.ts   # Firebase Auth クライアント設定
│   ├── schema.ts            # 共通型定義
│   ├── schemas/             # Zodスキーマ定義
│   └── tools/               # ツール関数
├── server/                  # サーバーサイドロジック
│   ├── ai/                  # AI ロジック、エージェント、ワークフロー
│   │   ├── agents/          # AIエージェント定義
│   │   ├── workflows/       # AIワークフロー
│   │   └── ...
│   ├── services/            # Service層（ビジネスロジック）
│   │   ├── user-service.ts
│   │   ├── plan-service.ts
│   │   ├── recipe-service.ts
│   │   ├── menu-service.ts
│   │   ├── shopping-list-service.ts
│   │   ├── recipe-history-service.ts
│   │   └── feedback-service.ts
│   ├── db/firestore/        # Repository層（データアクセス）
│   │   ├── client.ts        # Firestore クライアント
│   │   ├── userRepository.ts
│   │   ├── planRepository.ts
│   │   └── ...
│   ├── firebase.ts          # Firebase 共通設定
│   └── api-utils.ts         # API ヘルパー関数
├── docs/                    # 詳細なプロジェクトドキュメント
└── public/                  # 静的アセット
```

## Development Conventions

### Coding Rules

- **Formatting:** Prettierの設定に従い、ESLintで構文チェックを行います。
- **Naming:**
  - 変数・関数名: `camelCase`
  - クラス・コンポーネント名: `PascalCase`
  - 定数: `UPPER_SNAKE_CASE`
  - ファイル名: 原則としてコンポーネントは `PascalCase`、その他は `kebab-case`
- **Typing:**
  - `any` の使用は原則禁止。適切なインターフェースまたは型定義を行います。
  - AIの入出力には `zod` スキーマを使用し、ランタイムバリデーションを徹底します。
- **Styling:**
  - Tailwind CSS ユーティリティクラスを使用。
  - 複雑な条件分岐は `clsx` や `tailwind-merge` を活用して整理します。
- **Components:**
  - TypeScript インターフェースを備えた関数型コンポーネント。
  - UIコンポーネントは `src/components/ui` (shadcn/ui互換) を優先的に使用します。
- **AI Logic:**
  - 関心の分離を維持するため、AIロジック（プロンプト等）は `src/server/ai` 内に集約します。
  - エージェント実行時は `runAgentWithSchema`（ヘルパー）を通じ、一貫したエラーハンドリングとトレースを行います。
  - AIエージェントはService層から呼び出され、直接フロントエンドやAPI Routesから呼び出すことはありません。
- **State Management:**
  - 可能な限り React Server Components (RSC) を使用し、サーバーサイドでのデータ取得を優先。
  - 対話性やローカル状態管理が必要な場合のみ `use client` を宣言した Client Components を使用します。
- **Layered Architecture:**
  - **Frontend → API Routes → Services → Repositories** の階層を厳守します。
  - フロントエンド（Components、Pages）から直接Repositoryを呼び出すことは禁止。必ずAPI Routes経由でアクセスします。
  - API Routes (Controller層) は入力バリデーションとエラーハンドリングを担当し、ビジネスロジックはService層に委譲します。
  - Service層は複数のRepositoryを組み合わせたビジネスロジックを実装します。
  - Repository層のみがFirestoreへの直接アクセスを行います。
- **Database:**
  - Firestoreへの直接アクセスはRepository層（`src/server/db/firestore`）に限定します。
  - Service層（`src/server/services`）からRepositoryを呼び出してビジネスロジックを実装します。
  - フロントエンドはAPI Routes（`src/app/api`）経由でのみデータにアクセスします。

## API Endpoints

すべてのAPIエンドポイントは `/api/` 配下に配置されており、レイヤードアーキテクチャに従って実装されています。

### User API (`/api/user/[action]`)
- `get-profile` - ユーザープロファイルを取得
- `update-profile` - ユーザープロファイルを更新
- `complete-onboarding` - オンボーディングを完了
- `set-plan-creating` - プラン作成中ステータスを設定
- `calculate-nutrition` - 栄養目標を計算
- `update-nutrition-preferences` - 栄養設定を更新
- `learn-preference` - ユーザーの好みを学習

### Plan API (`/api/plan/[action]`)
- `get-active` - アクティブなプランを取得
- `get-pending` - 承認待ちのプランを取得
- `generate` - 新しいプランを生成
- `approve` - プランを承認
- `reject` - プランを拒否

### Recipe API (`/api/recipe/[action]`)
- `get-detail` - レシピ詳細を取得（または生成）
- `get-saved` - 保存されたレシピを取得
- `get-saved-list` - 保存されたレシピ一覧を取得
- `swap-meal` - レシピを差し替え

### Menu API (`/api/menu`)
- 冷蔵庫の中身（食材リスト）に基づいてメニューを提案

### Shopping API (`/api/shopping/[action]`)
- `get-list` - 買い物リストを取得
- `get-by-category` - カテゴリ別に買い物リストを取得
- `toggle-item` - アイテムのチェック状態を切り替え

### History API (`/api/history/[action]`)
- `get-history` - レシピ履歴を取得
- `get-favorites` - お気に入りを取得
- `add-to-favorites` - お気に入りに追加
- `mark-as-cooked` - 作成済みとしてマーク

### Feedback API (`/api/feedback/save`)
- フィードバックを保存し、レシピに紐付け

## Environment Setup

`.env.local` に必要な環境変数：

- Firebase Config (`NEXT_PUBLIC_FIREBASE_...`)
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`
