# 実装ガイドライン

## 1. SDKとヘルパー

- SDK: `@google/genai` を直接使用。
- ヘルパー: `callModelWithSchema` を使い、Zodスキーマによる構造化出力を行う。

## 2. JSON Schema 互換性（重要）

`zod-to-json-schema` を使用する際、Gemini の制限により **`$refStrategy: "none"`** を必ず指定してください。
これを忘れると Gemini が `$ref` を解釈できず、出力が壊れます。

```typescript
import { zodToJsonSchema } from "zod-to-json-schema"

const jsonSchema = zodToJsonSchema(MyZodSchema, {
  $refStrategy: "none", // 必須
})
```

## 3. モデル選択

モデル定数は `src/server/ai/config.ts` を参照。

- `GEMINI_3_FLASH_MODEL`: メイン（高速・低コスト）。
- `GEMINI_3_PRO_MODEL`: 複雑な推論用。
- `GEMINI_2_5_FLASH_MODEL`: 単純なタスク用。

## 4. プロンプトの実装パターン

プロンプトは `Input` オブジェクトを受け取り文字列を返す **TypeScript 関数** として定義し、`src/server/ai/prompts/` 配下に配置します。

```typescript
export function buildPrompt(input: MyInput): string {
  return `条件: ${input.value}...`.trim()
}
```
