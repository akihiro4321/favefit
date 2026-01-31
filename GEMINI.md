# FaveFit Project Context

## Overview

FaveFitは、AIパワーを活用した食事プランニングアプリケーションです。Vercel AI SDKとGoogle Geminiを使用して、パーソナライズされた最大14日間の食事プラン（現在は7日間がデフォルト）を生成します。ユーザーの栄養目標、味の好み、市場価格を最適化し、「チートデイ」や「飽き防止分析」などの機能を備えています。

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
| `npm test` | Vitest によるテスト実行 |

## Architecture & Agents

コアとなるAIロジックは `src/ai/` に集約されており、特定のタスクごとにエージェントが定義されています。

| Agent Name | Role | Defined In |
| --- | --- | --- |
| **Nutrition Planner** | 栄養目標 (BMR/TDEE) の計算 | `src/ai/agents/nutrition-planner.ts` |
| **Plan Generator** | 食事プランの生成 | `src/ai/agents/plan-generator.ts` |
| **Recipe Creator** | 詳細なレシピ手順の作成 | `src/ai/agents/recipe-creator.ts` |
| **Menu Adjuster** | 冷蔵庫の中身に基づいた代替案の提案 | `src/ai/agents/menu-adjuster.ts` |
| **Preference Learner** | ユーザーのフィードバックからの学習 | `src/ai/agents/preference-learner.ts` |
| **Boredom Analyzer** | プランの多様性を分析 | `src/ai/agents/boredom-analyzer.ts` |

**Data Flow:**

1. **User Input:** 目標と嗜好（オンボーディング）。
2. **AI Workflow:** `src/ai/workflows/meal-plan-generation.ts` が各エージェントを順次呼び出し、バリデーションと修正を行ってJSONデータを生成。
3. **Firestore:** ユーザープロファイル (`users/{userId}`)、プラン (`plans/{planId}`)、履歴を保存。
4. **Langfuse:** エージェントの実行とツール使用のトレース。

## Directory Structure

- `src/app/` - Next.js App Router ページと API ルート。
- `src/components/` - React UI コンポーネント (shadcn/ui は `ui/` 内)。
- `src/lib/` - 共有ユーティリティ。
  - `db/` - Firestore クライアントとリポジトリ。
  - `services/` - ビジネスロジック。
- `src/ai/` - AI ロジック、エージェント、ツール、ワークフロー。
- `docs/` - 詳細なプロジェクトドキュメント。
- `public/` - 静的アセット。

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
  - 関心の分離を維持するため、AIロジック（プロンプト等）は `src/ai` 内に集約します。
  - エージェント実行時は `runAgentWithSchema`（ヘルパー）を通じ、一貫したエラーハンドリングとトレースを行います。
- **State Management:**
  - 可能な限り React Server Components (RSC) を使用し、サーバーサイドでのデータ取得を優先。
  - 対話性やローカル状態管理が必要な場合のみ `use client` を宣言した Client Components を使用します。
- **Database:**
  - Firestoreへの直接アクセスはリポジトリ（`src/lib/db/firestore`）に限定し、ビジネスロジック（`src/lib/services`）から利用します。

## Environment Setup

`.env.local` に必要な環境変数：

- Firebase Config (`NEXT_PUBLIC_FIREBASE_...`)
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`
