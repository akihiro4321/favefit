# FaveFit コーディング規約

## 言語・全般

- コード内のコメント、エラーメッセージ、ドキュメントはすべて **日本語** で記述する
- TypeScript strict mode を前提とする

## ファイル命名規則

| 種類 | 命名規則 | 配置先 | 例 |
|---|---|---|---|
| コンポーネント | kebab-case `.tsx` | `src/components/` | `recipe-card.tsx`, `mood-selector.tsx` |
| UI プリミティブ | kebab-case `.tsx` | `src/components/ui/` | `button.tsx`, `card.tsx` |
| サービス | `*-service.ts` | `src/server/services/` | `plan-service.ts`, `user-service.ts` |
| リポジトリ | `*Repository.ts` (camelCase) | `src/server/db/firestore/` | `planRepository.ts`, `userRepository.ts` |
| AI エージェント | kebab-case `.ts` | `src/server/ai/agents/` | `plan-generator.ts`, `recipe-creator.ts` |
| AI プロンプト | kebab-case `.ts` | `src/server/ai/agents/prompts/` | `plan-generator.ts` |
| AI ワークフロー | kebab-case `.ts` | `src/server/ai/workflows/` | `generate-meal-plan.ts` |
| スキーマ/型定義 | kebab-case `.ts` | `src/lib/` or `src/lib/schemas/` | `schema.ts`, `user.ts` |
| ユーティリティ | camelCase `.ts` | `src/lib/tools/` | `calculateMacroGoals.ts` |
| API ルート | `route.ts` | `src/app/api/[resource]/[action]/` | `src/app/api/plan/[action]/route.ts` |

## インポート

- パスエイリアス `@/` (`src/` にマッピング) を必ず使用する。相対パスは同一ディレクトリ内のみ許容
- 順序:
  1. 外部パッケージ (`react`, `next`, `zod`, `firebase` 等)
  2. 内部モジュール (`@/components/...`, `@/lib/...`, `@/server/...`)
  3. 同一ディレクトリの相対インポート (`./recommended-tags`)

```typescript
// 良い例
import { useState } from "react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RecommendedTags } from "./recommended-tags";
```

## コンポーネント

- **named export** を使用する (`export function ComponentName`)。default export は使わない
- Props は `interface {ComponentName}Props` で定義する
- クライアントコンポーネントはファイル先頭に `'use client'` を記述する
- スタイリングは Tailwind CSS を使用し、クラスの結合には `cn()` ユーティリティを使う
- アイコンは `lucide-react` から使用する
- UI プリミティブは `@/components/ui/` の shadcn/ui コンポーネントを優先的に使う

```typescript
'use client'

interface PreferenceFormProps {
  userId: string;
  onUpdate: () => void;
}

export function PreferenceForm({ userId, onUpdate }: PreferenceFormProps) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

## 関数・変数の命名

- 関数・変数: camelCase
- イベントハンドラ: `handle` プレフィックス (`handleSubmit`, `handleSave`, `handleTagSelect`)
- 型・インターフェース: PascalCase (`UserProfile`, `PlanDocument`)
- 定数: UPPER_SNAKE_CASE (`DEFAULT_PLAN_DURATION_DAYS`)
- Zod スキーマ: PascalCase + `Schema` サフィックス (`CalculateNutritionRequestSchema`)
- Zod からの型導出: `export type TypeName = z.infer<typeof TypeNameSchema>`

## アーキテクチャ (レイヤー構成)

リクエストの流れ: **API Route → Service → Repository / AI Workflow**

### API ルート (`src/app/api/`)

- `[action]` パラメータで switch によるアクションベースルーティングを行う
- リクエストバリデーションは Zod スキーマで行う
- レスポンスは `successResponse<T>(data)` でラップする
- エラーは `HttpError.badRequest()` / `HttpError.notFound()` 等を使用する

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  const body = await req.json();

  switch (action) {
    case "generate": {
      const validated = GenerateRequestSchema.parse(body);
      const result = await generatePlan(validated);
      return successResponse(result);
    }
    default:
      return HttpError.badRequest(`Unknown action: ${action}`);
  }
}
```

### サービス (`src/server/services/`)

- ビジネスロジックを担当する。API ルートから呼び出される
- Request / Response のインターフェースを定義して使用する
- JSDoc コメントで関数の概要を日本語で記載する
- ファイル先頭にモジュール説明のコメントブロックを置く

```typescript
/**
 * FaveFit v2 - プランサービス
 * プラン生成・リフレッシュに関するビジネスロジック
 */

export interface GeneratePlanRequest {
  userId: string;
}

export interface GeneratePlanResponse {
  status: "started" | "already_creating";
  message: string;
}

/**
 * プランを生成（非同期）
 */
export async function generatePlan(
  request: GeneratePlanRequest
): Promise<GeneratePlanResponse> {
  // ...
}
```

### リポジトリ (`src/server/db/firestore/`)

- Firestore とのデータアクセスを担当する
- 関数はアロー関数で `export const` として定義する
- `collections.ts` で定義された型付きコレクション参照を使用する
- コンポーネントやサービスから Firebase SDK を直接呼び出さない

```typescript
export const getActivePlan = async (
  userId: string
): Promise<(PlanDocument & { id: string }) | null> => {
  // ...
};
```

### AI エージェント (`src/server/ai/agents/`)

- 入出力スキーマを Zod で定義し、同一ファイル内にまとめる
- プロンプトは `agents/prompts/` に分離する
- 実行関数は `run{AgentName}` の命名で export する
- ワークフロー (`src/server/ai/workflows/`) で複数エージェントをオーケストレーションする

## スキーマ・型定義

- メインのFirestore スキーマは `src/lib/schema.ts` に集約する
- API リクエスト/レスポンスのバリデーションには Zod を使用する
- セクション区切りには `// ========================================` 形式のコメントを使う
- Firestore の日時フィールドは `Timestamp | FieldValue` 型を使用する

## エラーハンドリング

- API 層では `try-catch` で `ZodError` とビジネスロジックエラーを分けて処理する
- リポジトリ層のエラーは `console.error` でログ出力した上で、`throw` または `null` を返す
- エラーメッセージは日本語で記述する (`"ユーザーが見つかりません"`, `"プランが見つかりません"`)
- console ログには `[関数名]` プレフィックスをつける (`console.log("[generatePlan] Started...")`)
