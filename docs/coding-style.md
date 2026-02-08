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
| AI エージェント | kebab-case `.ts` | `src/server/ai/agents/` | `plan-generator-v2.ts` |
| AI 関数 (Function) | kebab-case `.ts` | `src/server/ai/functions/` | `recipe-generator.ts`, `diet-estimator.ts` |
| AI プロンプト | kebab-case `.ts` | `src/server/ai/prompts/[agents\|functions]/` | `prompts/functions/recipe-generator.ts` |
| AI ワークフロー | kebab-case `.ts` | `src/server/ai/workflows/` | `meal-plan-generation-v2.ts` |
| スキーマ/型定義 | kebab-case `.ts` | `src/lib/` or `src/lib/schemas/` | `schema.ts`, `user.ts` |
| ユーティリティ | camelCase `.ts` | `src/lib/tools/` | `calculateMacroGoals.ts` |
| API ルート | `route.ts` | `src/app/api/[resource]/[action]/` | `src/app/api/plan/[action]/route.ts` |

## インポート

- パスエイリアス `@/` (`src/` にマッピング) を必ず使用する。相対パスは同一ディレクトリ内のみ許容
- 順序:
  1. 外部パッケージ (`react`, `next`, `zod`, `firebase`, `@google/genai` 等)
  2. 内部モジュール (`@/components/...`, `@/lib/...`, `@/server/...`)
  3. 同一ディレクトリの相対インポート (`./recommended-tags`)

## コンポーネント

- **named export** を使用する (`export function ComponentName`)。default export は使わない
- Props は `interface {ComponentName}Props` で定義する
- クライアントコンポーネントはファイル先頭に `'use client'` を記述する
- スタイリングは Tailwind CSS を使用し、クラスの結合には `cn()` ユーティリティを使う
- アイコンは `lucide-react` から使用する
- UI プリミティブは `@/components/ui/` の shadcn/ui コンポーネントを優先的に使う

## 関数・変数の命名

- 関数・変数: camelCase
- イベントハンドラ: `handle` プレフィックス (`handleSubmit`, `handleSave`, `handleTagSelect`)
- 型・インターフェース: PascalCase (`UserProfile`, `PlanDocument`)
- 定数: UPPER_SNAKE_CASE (`DEFAULT_PLAN_DURATION_DAYS`)
- Zod スキーマ: PascalCase + `Schema` サフィックス (`CalculateNutritionRequestSchema`)
- Zod からの型導出: `export type TypeName = z.infer<typeof TypeNameSchema>`

## アーキテクチャ (レイヤー構成)

リクエストの流れ: **API Route → Service → AI Workflow / AI Function / Repository**

### サービス (`src/server/services/`)

- ビジネスロジックを担当する。API ルートから呼び出される
- **AI ワークフロー (`src/server/ai/workflows/`)**: 複数のAI呼び出しや複雑な条件分岐、リトライが必要な場合に呼び出す。ワークフロー内では、AI実行に必要なデータを準備するために他の Service を呼び出すことができる（オーケストレーション）
- **AI 関数 (`src/server/ai/functions/`)**: 単発の変換タスク（例：レシピ生成）の場合は直接呼び出して良い
- **Agent と Function の純粋性**: Agent および Function レイヤーには Service や Repository を混入させないこと。これらは常に純粋な推論・変換ロジックとして保ち、必要なデータはすべて引数（POJO）として受け取ることで、単体テストやデバッグ実行を容易にする。

### AI レイヤー (`src/server/ai/`)

AI機能は役割に応じて3つの階層に分離し、`@google/genai` SDKを使用して実装する。

#### 1. Workflows (`workflows/`)
- アプリケーションの業務プロセスを完結させるためのオーケストレーション層
- 複数の Agent や Function を組み合わせ、データの加工や条件分岐を行う
- 例：`meal-plan-generation-v2.ts`（現状分析 -> 指示作成 -> プラン生成を繋ぐ）

#### 2. Agents (`agents/`)
- 自律的な思考、自己修正ループ、長期的な計画立案を担当する
- 単一のプロンプトで解決できない複雑な推論ロジックを持つ
- 例：`plan-generator-v2.ts`（スケルトン作成と詳細生成のループを制御）

#### 3. Functions (`functions/`)
- 単一の入力に対して特定のスキーマで結果を返す「純粋な変換装置」
- 内部では `callModelWithSchema` を使用して1回のLLM呼び出しを行う
- 例：`recipe-generator.ts`（タイトルからレシピ詳細を生成）

### AI 実装の重要ルール

- **SDK**: `@google/genai` SDK を直接使用すること
- **構造化出力**: `callModelWithSchema` ヘルパーを使用し、必ず Zod スキーマで出力を定義すること
- **JSON Schema 互換性**: `zod-to-json-schema` を使用する際、Gemini の制限により **`$refStrategy: "none"`** を必ず指定して、参照をインライン展開すること
- **モデル選択**: 高速・低コストなタスクには `GEMINI_3_FLASH_MODEL`、複雑なタスクには `GEMINI_3_PRO_MODEL` を使い分ける
- **分離の徹底**: AI層の中に Firestore の呼び出しを直接記述しないこと。データ取得は呼び出し元の Service が責任を持ち、AI層には POJO（プレーンなオブジェクト）として渡す

## リポジトリ (`src/server/db/firestore/`)

- Firestore とのデータアクセスを担当する
- 関数はアロー関数で `export const` として定義する
- `collections.ts` で定義された型付きコレクション参照を使用する
- コンポーネントやサービスから Firebase SDK を直接呼び出さない

## エラーハンドリング

- API 層では `try-catch` で `ZodError` とビジネスロジックエラーを分けて処理する
- AI 実行時のエラーは `agent-helpers.ts` の共通処理でログ出力し、上位層で適切にリトライまたはフォールバックを行う
- console ログには `[クラス/関数名]` プレフィックスをつける (`console.log("[PlanGeneratorV2] Started...")`)