---
name: mastra
description: Mastraエージェントフレームワークを使用してAIエージェントとツールを作成・実行する。エージェントの定義、ツールの作成、プロンプト生成、構造化出力の処理方法をガイドする。Mastraエージェントの作成、修正、実行が必要な場合に使用する。
---

# Mastra エージェント開発

このプロジェクトではMastra v1.0を使用してAIエージェントを実装しています。

## クイックスタート

### エージェントの作成

```typescript
import { Agent } from "@mastra/core/agent";
import { z } from "zod";

// 出力スキーマを定義
export const MyAgentOutputSchema = z.object({
  result: z.string(),
});

// エージェントを定義
export const myAgent = new Agent({
  id: "my_agent",
  name: "My Agent",
  instructions: `エージェントの役割と動作を説明する指示文`,
  model: "google/gemini-2.5-flash-lite",
  tools: {
    // オプション: ツールを追加
  },
});
```

### ツールの作成

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "my_tool",
  description: "ツールの説明",
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
  execute: async (inputData) => {
    // ツールの処理を実装
    return { output: "result" };
  },
});
```

### エージェントの実行

```typescript
import { mastra } from "@/mastra";

// エージェントを取得
const agent = mastra.getAgent("myAgent");

// プロンプトを生成
const prompt = "ユーザーのリクエスト内容";

// エージェントを実行
const result = await agent.generate(prompt);

// 結果を処理
let parsedResult;
if (result.text) {
  // JSONを抽出してパース
  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI応答からJSONを抽出できませんでした");
  }
  parsedResult = JSON.parse(jsonMatch[0]);
} else if (result.object) {
  // 構造化出力が有効な場合
  parsedResult = result.object;
} else {
  throw new Error("AI応答が無効です");
}
```

## プロジェクト構造

```
src/mastra/
├── index.ts              # Mastraインスタンスとエージェント登録
├── agents/              # エージェント定義
│   ├── nutrition-planner.ts
│   ├── plan-generator.ts
│   ├── recipe-creator.ts
│   └── ...
└── tools/               # エージェント用ツール
    └── calculateMacroGoals.ts
```

## エージェント登録

`src/mastra/index.ts`でエージェントを登録：

```typescript
export const mastra = new Mastra({
  agents: {
    nutritionPlanner: nutritionPlannerAgent,
    planGenerator: planGeneratorAgent,
    // ...
  },
  observability: new Observability({
    // Langfuse設定
  }),
});
```

登録後は`mastra.getAgent("agentName")`で取得可能。

## パターンとベストプラクティス

### 1. スキーマ定義

エージェントの入出力は必ずZodスキーマで定義：

```typescript
// 入力スキーマ
export const InputSchema = z.object({
  field: z.string(),
});

// 出力スキーマ
export const OutputSchema = z.object({
  result: z.number(),
});

// 型のエクスポート
export type Input = z.infer<typeof InputSchema>;
export type Output = z.infer<typeof OutputSchema>;
```

### 2. プロンプト生成関数

複雑なプロンプトは専用関数で生成：

```typescript
export const buildPrompt = (
  userDoc: UserDocument,
  context: Context
): string => {
  return `
【リクエスト内容】
- 条件1: ${context.field1}
- 条件2: ${context.field2}

【ユーザー情報】
- 好み: ${userDoc.preferences}
`;
};
```

### 3. エラーハンドリング

JSON抽出とパースは必ずエラーハンドリング：

```typescript
let parsedResult;
if (result.text) {
  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to extract JSON:", result.text);
    throw new Error("AI応答からJSONを抽出できませんでした");
  }
  try {
    parsedResult = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error("JSONパースに失敗しました");
  }
} else if (result.object) {
  parsedResult = result.object;
} else {
  throw new Error("AI応答が無効です");
}
```

### 4. ツールの使用

計算や外部API呼び出しはツール化：

```typescript
// エージェントの指示でツール使用を明示
instructions: `
【重要】
- 数値計算は必ず calculate_nutrition ツールを使用すること
- 自分で計算しないでください
`,
tools: {
  calculate_nutrition: nutritionCalculatorTool,
},
```

### 5. モデル選択

現在のプロジェクトでは`google/gemini-2.5-flash-lite`を使用。

## 既存エージェント一覧

| エージェント名 | ID | 用途 |
|---|---|---|
| Nutrition Planner | `nutritionPlanner` | 栄養目標策定 |
| Plan Generator | `planGenerator` | 14日間プラン生成 |
| Recipe Creator | `recipeCreator` | レシピ詳細生成 |
| Menu Adjuster | `menuAdjuster` | メニュー提案 |
| Preference Learner | `preferenceLearner` | ユーザー嗜好学習 |
| Boredom Analyzer | `boredomAnalyzer` | 飽き度分析 |

## トラブルシューティング

### JSON抽出に失敗する

- プロンプトで「必ずJSON形式で出力してください」と明示
- エージェントの`instructions`で出力形式を指定
- スキーマを明確に定義

### ツールが呼ばれない

- エージェントの`instructions`でツール使用を明示
- ツールの`description`を具体的に記述
- エージェント登録を確認

### 構造化出力が取得できない

- `result.object`と`result.text`の両方をチェック
- フォールバック処理を実装

## 参考例

既存のエージェント実装を参照：
- `src/mastra/agents/nutrition-planner.ts` - ツール使用例
- `src/mastra/agents/plan-generator.ts` - 複雑なスキーマ例
- `src/mastra/agents/recipe-creator.ts` - プロンプト生成例
- `src/lib/services/recipe-service.ts` - エージェント実行例
