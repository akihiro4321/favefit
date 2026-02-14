# 実装ガイドライン

## 1. SDKとヘルパー

- SDK: `ai` (Vercel AI SDK) を使用。
- ヘルパー: `src/server/ai/utils/agent-helpers.ts` の `callModelWithSchema` を使用して実装する。内部で `generateObject` を呼び出しており、Zodスキーマを直接渡すことができます。

## 2. 構造化出力 (Structured Output)

Vercel AI SDK は Zod スキーマを直接サポートしているため、手動で JSON Schema に変換する必要はありません。
`callModelWithSchema` に Zod スキーマをそのまま渡してください。

```typescript
import { MySchema } from "../types";
import { callModelWithSchema } from "../utils/agent-helpers";
import { FAST_MODEL } from "../config";

const result = await callModelWithSchema(
  instructions,
  prompt,
  MySchema,
  FAST_MODEL
);
```

## 3. モデル選択

モデル定数は `src/server/ai/config.ts` を参照し、具体的なモデルIDではなく役割を表す定数を使用してください。

- `FAST_MODEL` (GPT-4o-mini 等): 高速・低コスト。ほとんどのタスクはこれを使用。
- `SMART_MODEL` (GPT-4o 等): 複雑な推論、整合性チェック、クリエイティブな生成用。

## 4. プロンプトの実装パターン

プロンプトは `Input` オブジェクトを受け取り文字列を返す **TypeScript 関数** として定義し、`src/server/ai/prompts/` 配下に配置します。

```typescript
export function buildPrompt(input: MyInput): string {
  return `条件: ${input.value}...`.trim()
}
```
