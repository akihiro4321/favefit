# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

FaveFitは、Mastra v1.0のAIエージェントフレームワークを使用した食事プランニングアプリケーションです。ユーザーの栄養目標と嗜好に基づいて、7日間の食事プランを自動生成します。

## 開発コマンド

### 基本コマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check

# リント実行
npm run lint

# テスト実行
npm test

# Mastra Studio起動（エージェント開発用）
npm run studio
```

### 重要な注意点
- すべてのコマンドは `arch -arm64` でラップされている（Apple Silicon対応）
- 開発サーバーはデフォルトで `http://localhost:3000` で起動

## アーキテクチャ

### AIエージェント構成

Mastraを使用した6つの専門エージェントが協調動作します：

1. **Nutrition Planner** (`src/mastra/agents/nutrition-planner.ts`)
   - BMR/TDEE計算に基づく栄養目標策定
   - ユーザーのプロファイル（身長、体重、活動レベル、目標）から最適なカロリー・PFCバランスを算出

2. **Plan Generator** (`src/mastra/agents/plan-generator.ts`)
   - 7日間の食事プラン生成（朝・昼・夕の3食×7日）
   - レシピ構成比率：定番40%、新発見40%、低コスト20%
   - カロリー配分：朝20%、昼40%、夜40%
   - チートデイの自動配置

3. **Recipe Creator** (`src/mastra/agents/recipe-creator.ts`)
   - 個別レシピの詳細生成（材料、手順）
   - プラン承認後にバッチ処理で実行

4. **Menu Adjuster** (`src/mastra/agents/menu-adjuster.ts`)
   - 冷蔵庫の余り食材からレシピ提案
   - 個別の食事の差し替え

5. **Preference Learner** (`src/mastra/agents/preference-learner.ts`)
   - 食事完了後のフィードバック収集
   - ユーザー嗜好の学習と更新

6. **Boredom Analyzer** (`src/mastra/agents/boredom-analyzer.ts`)
   - 食事履歴から飽き度を分析
   - プランのリフレッシュ推奨

### データフロー

```
オンボーディング → Nutrition Planner → プラン生成（pending）
                                         ↓
                                    ユーザー承認
                                         ↓
                            Recipe Creator (バッチ処理)
                                         ↓
                                    買い物リスト生成
                                         ↓
                                    プランactive化
```

### ディレクトリ構造

```
src/
├── app/                        # Next.js App Router
│   ├── api/                   # APIエンドポイント
│   │   ├── plan/             # プラン生成・承認・拒否・リフレッシュ
│   │   ├── recipe/           # レシピ生成・詳細取得
│   │   ├── user/             # ユーザー情報・フィードバック
│   │   ├── menu/             # メニュー差し替え
│   │   └── market/           # 物価情報
│   └── [pages]/              # ページコンポーネント
├── components/                # React UIコンポーネント
│   └── ui/                   # Radix UI ベースコンポーネント
├── lib/
│   ├── services/             # ビジネスロジック層
│   │   ├── plan-service.ts  # プラン生成・リフレッシュの統合処理
│   │   ├── recipe-service.ts
│   │   ├── user-service.ts
│   │   ├── menu-service.ts
│   │   └── market-service.ts
│   ├── db/firestore/         # Firebase Firestore アクセス層
│   ├── tools/                # ヘルパー関数
│   └── schema.ts             # TypeScript型定義
├── mastra/
│   ├── agents/               # Mastraエージェント定義
│   ├── tools/                # エージェント用ツール
│   ├── workflows/            # Mastraワークフロー
│   └── index.ts              # Mastraインスタンス（Langfuse統合）
└── types/                    # 共通型定義
```

### 重要な設計パターン

#### 1. プラン生成の二段階承認
- **pending状態**: AIがプラン概要を生成（タイトル・栄養情報のみ）
- **ユーザー承認**: プラン内容を確認し承認/拒否
- **active状態**: 承認後にレシピ詳細をバッチ生成（`generateRecipeDetailsBatch`）

理由：初期生成を高速化し、ユーザーが早く確認できるようにするため

#### 2. 構造化出力の使用
すべてのエージェントは `structuredOutput` オプションを使用してZodスキーマに準拠したJSON出力を強制：
```typescript
const result = await agent.generate(messageText, {
  structuredOutput: {
    schema: PlanGeneratorOutputSchema,
    jsonPromptInjection: true,
  },
});
```

フォールバック処理も実装済み（テキストからJSONを抽出）

#### 3. 栄養計算の一貫性
- `calculatePersonalizedMacroGoals` (`src/lib/tools/calculateMacroGoals.ts`) で決定論的に計算
- プロンプト内でもカロリー計算式を明示（P*4 + F*9 + C*4）
- 目標カロリーとの許容誤差±1%

#### 4. エージェント間の役割分離
- **Plan Generator**: 構造的なプラン全体の設計
- **Recipe Creator**: 個別レシピの詳細化
- **Boredom Analyzer**: メタ分析とリフレッシュ判定

各エージェントは独立して実行可能

## 環境変数

`.env.local` に以下を設定：
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=

# Langfuse (オプション - AIトレーサビリティ用)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
```

## 可観測性（Observability）

Langfuse統合により、すべてのエージェント実行は自動的にトレースされます：
- `src/mastra/index.ts` で `LangfuseExporter` を設定
- 手動でのトレーシングコードは不要
- エージェントの入力・出力・LLM呼び出し・ツール呼び出しが自動記録

## Firestoreスキーマ

### `users` コレクション
```typescript
{
  profile: {
    age, gender, height_cm, currentWeight,
    activity_level, goal, cheatDayFrequency
  },
  nutrition: {
    dailyCalories, pfc: { protein, fat, carbs },
    preferences: { /* 嗜好度スコア */ }
  },
  learnedPreferences: {
    cuisines: Record<string, number>,
    flavorProfile: Record<string, number>,
    dislikedIngredients: string[]
  },
  planCreationStatus: "idle" | "creating",
  planRejectionFeedback: string | null
}
```

### `plans` コレクション
```typescript
{
  userId, startDate, status: "pending" | "active" | "archived",
  days: {
    "YYYY-MM-DD": {
      isCheatDay: boolean,
      meals: { breakfast, lunch, dinner },
      totalNutrition: { calories, protein, fat, carbs }
    }
  }
}
```

## テスト実行

```bash
# すべてのテスト実行
npm test

# カバレッジ付き実行
npm test -- --coverage

# 特定のファイルのテスト実行
npm test src/lib/tools/calculateMacroGoals.test.ts
```

テストフレームワーク：Vitest + @testing-library/react

## 新しいエージェントの追加

1. `src/mastra/agents/` にエージェントファイルを作成
2. Zodスキーマで入出力を定義
3. `src/mastra/index.ts` の `agents` オブジェクトに登録
4. サービス層（`src/lib/services/`）から呼び出し

例：
```typescript
export const myAgent = new Agent({
  id: "my_agent",
  name: "My Agent",
  instructions: "...",
  model: "google/gemini-2.5-flash",
});
```

## 注意事項

### エージェント実行時
- すべてのエージェント呼び出しは非同期（`async/await`）
- エラーハンドリングを必ず実装
- バックグラウンド処理は `catch` でログ記録

### プラン生成
- `DEFAULT_PLAN_DURATION_DAYS` は7日固定（`src/mastra/agents/plan-generator.ts`）
- プラン生成失敗時も `planCreationStatus` を必ずクリア
- 拒否フィードバックは次回生成時に自動反映

### 栄養計算
- `calculatePersonalizedMacroGoals` を使用（決定論的）
- プロファイル不足時のデフォルト値：1800kcal, P100g, F50g, C200g