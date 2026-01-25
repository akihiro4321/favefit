# Plan Generator Workflow - Mastra Studio テストガイド

## 概要

このドキュメントでは、`plan-service.ts:250-257`の構造化出力処理を忠実に再現したワークフローを使用して、Mastra StudioでPlan Generator Agentをテストする方法を説明します。

## ワークフローの構成

ワークフローは以下の3つのステップで構成されています：

1. **buildPromptStep**: プロンプト生成（plan-service.ts:245-248を再現）
2. **planGeneratorStep**: エージェント実行（plan-service.ts:250-257を再現）
3. **validateResultStep**: 結果検証（plan-service.ts:259-286を再現）

## ワークフローファイル

ワークフローは `src/mastra/workflows/test-plan-generator.ts` に定義されています。

## Mastra Studioでの使用方法

### 1. ワークフローの選択

Mastra Studioで以下のワークフローを選択：
- **ワークフローID**: `test_plan_generator`
- **ワークフロー名**: `Test Plan Generator with Structured Output`
- **登録場所**: `src/mastra/index.ts`の`workflows`セクション

### 2. ワークフローの構成

ワークフローは以下の3ステップで構成されています：

1. **buildPromptStep** (`id: "build_prompt"`)
   - 入力データからプロンプトテキストを生成
   - plan-service.ts:245-248を再現

2. **planGeneratorStep** (エージェントステップ)
   - `planGenerator`エージェントを構造化出力付きで実行
   - plan-service.ts:250-257を再現
   - `structuredOutput: { schema: PlanGeneratorOutputSchema, jsonPromptInjection: true }`

3. **validateResultStep** (`id: "validate_result"`)
   - 生成されたプランの検証（14日間チェックなど）
   - plan-service.ts:259-286を再現

### 3. 入力データの準備

以下のJSON形式で入力データを準備してください：

```json
{
  "targetCalories": 1800,
  "pfc": {
    "protein": 100,
    "fat": 50,
    "carbs": 200
  },
  "preferences": {
    "cuisines": {
      "japanese": 30,
      "korean": 15,
      "italian": 10
    },
    "flavorProfile": {
      "light": 20,
      "umami": 15,
      "spicy": 5
    },
    "dislikedIngredients": ["にんじん", "セロリ"]
  },
  "favoriteRecipes": [
    {
      "id": "recipe-1",
      "title": "鶏むね肉の照り焼き",
      "tags": ["和食", "高タンパク", "低脂質"]
    },
    {
      "id": "recipe-2",
      "title": "サラダチキンサンド",
      "tags": ["洋食", "高タンパク", "簡単"]
    }
  ],
  "cheapIngredients": ["キャベツ", "もやし", "鶏むね肉", "卵", "豆腐"],
  "cheatDayFrequency": "weekly",
  "startDate": "2026-01-26",
  "feedback": ""
}
```

### 4. フィードバック付きテスト

フィードバックを追加する場合は、`feedback`フィールドに文字列を設定：

```json
{
  "targetCalories": 1800,
  "pfc": {
    "protein": 100,
    "fat": 50,
    "carbs": 200
  },
  "preferences": {
    "cuisines": {
      "japanese": 30,
      "korean": 15
    },
    "flavorProfile": {
      "light": 20
    },
    "dislikedIngredients": ["にんじん"]
  },
  "favoriteRecipes": [
    {
      "id": "recipe-1",
      "title": "鶏むね肉の照り焼き",
      "tags": ["和食", "高タンパク"]
    }
  ],
  "cheapIngredients": ["キャベツ", "もやし", "鶏むね肉"],
  "cheatDayFrequency": "weekly",
  "startDate": "2026-01-26",
  "feedback": "前回のプランは同じようなメニューが多く、飽きてしまいました。もっとバリエーション豊富なメニューを希望します。また、調理時間が短いレシピを優先してください。"
}
```

### 5. 実行と結果確認

1. Mastra Studioでワークフローを実行
2. 各ステップの実行結果を確認：
   - **buildPromptStep**: 生成されたプロンプトテキスト
   - **planGeneratorStep**: エージェントの生の応答（`result.object`または`result.text`）
   - **validateResultStep**: 検証済みの最終結果

### 6. 期待される出力

最終的な出力は以下の構造になります：

```json
{
  "days": [
    {
      "date": "2026-01-26",
      "isCheatDay": false,
      "breakfast": {
        "recipeId": "recipe-xxx",
        "title": "レシピ名",
        "tags": ["タグ1", "タグ2"],
        "ingredients": ["材料1: 分量1", "材料2: 分量2"],
        "steps": ["手順1", "手順2"],
        "nutrition": {
          "calories": 500,
          "protein": 30,
          "fat": 15,
          "carbs": 50
        }
      },
      "lunch": { ... },
      "dinner": { ... }
    },
    // ... 合計14日分
  ],
  "shoppingList": [
    {
      "ingredient": "キャベツ",
      "amount": "1個",
      "category": "野菜"
    },
    // ... その他の食材
  ]
}
```

## テストケース

### テストケース 1: 基本的なプラン生成

```json
{
  "targetCalories": 1800,
  "pfc": {
    "protein": 100,
    "fat": 50,
    "carbs": 200
  },
  "preferences": {
    "cuisines": {
      "japanese": 30,
      "korean": 15,
      "italian": 10
    },
    "flavorProfile": {
      "light": 20,
      "umami": 15,
      "spicy": 5
    },
    "dislikedIngredients": ["にんじん", "セロリ"]
  },
  "favoriteRecipes": [
    {
      "id": "recipe-1",
      "title": "鶏むね肉の照り焼き",
      "tags": ["和食", "高タンパク", "低脂質"]
    }
  ],
  "cheapIngredients": ["キャベツ", "もやし", "鶏むね肉", "卵", "豆腐"],
  "cheatDayFrequency": "weekly",
  "startDate": "2026-01-26",
  "feedback": ""
}
```

**検証ポイント**:
- [ ] `days`配列が14要素である
- [ ] 各食事の`nutrition`フィールドが数値型である
- [ ] チートデイが7日目と14日目に設定されている
- [ ] `dislikedIngredients`が使用されていない

### テストケース 2: 最小限の入力データ

```json
{
  "targetCalories": 2000,
  "pfc": {
    "protein": 120,
    "fat": 60,
    "carbs": 220
  },
  "cheatDayFrequency": "biweekly",
  "startDate": "2026-01-26",
  "feedback": ""
}
```

**検証ポイント**:
- [ ] `preferences`や`favoriteRecipes`がなくても正常に動作する
- [ ] チートデイが14日目のみに設定されている

### テストケース 3: フィードバック付きプラン生成

```json
{
  "targetCalories": 1800,
  "pfc": {
    "protein": 100,
    "fat": 50,
    "carbs": 200
  },
  "preferences": {
    "cuisines": {
      "japanese": 30,
      "korean": 15
    },
    "flavorProfile": {
      "light": 20
    },
    "dislikedIngredients": ["にんじん"]
  },
  "favoriteRecipes": [
    {
      "id": "recipe-1",
      "title": "鶏むね肉の照り焼き",
      "tags": ["和食", "高タンパク"]
    }
  ],
  "cheapIngredients": ["キャベツ", "もやし", "鶏むね肉"],
  "cheatDayFrequency": "weekly",
  "startDate": "2026-01-26",
  "feedback": "前回のプランは同じようなメニューが多く、飽きてしまいました。もっとバリエーション豊富なメニューを希望します。"
}
```

**検証ポイント**:
- [ ] フィードバックがプロンプトに含まれている
- [ ] 多様なメニューが生成されている

## ワークフローの動作フロー

```
入力データ
  ↓
[buildPromptStep]
  ↓ プロンプト生成
[planGeneratorStep]
  ↓ 構造化出力付きエージェント実行
  - structuredOutput: { schema: PlanGeneratorOutputSchema, jsonPromptInjection: true }
  ↓
[validateResultStep]
  ↓ 結果検証
  - result.object または result.text から結果を取得
  - days配列の存在確認
  - 14日間の検証
  ↓
最終出力（検証済み）
```

## トラブルシューティング

### 問題: 構造化出力が取得できない

**症状**: `validateResultStep`で`result.object`が`undefined`になる

**解決策**:
1. `planGeneratorStep`の`structuredOutput`設定を確認
2. `jsonPromptInjection: true`が設定されているか確認
3. エージェントのモデルが構造化出力をサポートしているか確認

### 問題: days配列が14要素でない

**症状**: `validateResultStep`でエラーが発生

**解決策**:
1. エージェントの`instructions`で「必ず14日間のプラン」と明記されているか確認
2. スキーマの`.length(14)`制約が正しく設定されているか確認

### 問題: nutritionフィールドが文字列型になっている

**症状**: 型エラーが発生

**解決策**:
1. エージェントの`instructions`で「nutritionフィールドの各値は数値型で出力してください」と明記
2. `jsonPromptInjection: true`が設定されているか確認

## 実際のコードとの対応関係

| ワークフロー | plan-service.ts | 説明 |
|---|---|---|
| `buildPromptStep` | 238-248行目 | プロンプト生成 |
| `planGeneratorStep` | 250-257行目 | 構造化出力付きエージェント実行 |
| `validateResultStep` | 259-286行目 | 結果検証 |

## ワークフローの特徴

### 構造化出力の自動処理

エージェントステップ（`planGeneratorStep`）は構造化出力を自動的に処理します：

- **入力**: `{ prompt: string }` (前のステップから)
- **出力**: `PlanGeneratorOutputSchema`に準拠したオブジェクト
- **設定**: `structuredOutput: { schema: PlanGeneratorOutputSchema, jsonPromptInjection: true }`

これにより、`plan-service.ts:259-275`のフォールバック処理（テキストからJSON抽出）は通常不要になりますが、`validateResultStep`で念のため検証を行っています。

### エラーハンドリング

ワークフローは以下のエラーを検出します：

1. **days配列の欠如**: `validateResultStep`で検証
2. **14日間でない**: `validateResultStep`で検証
3. **構造化出力の失敗**: エージェントステップで自動的にエラーになる

### デバッグのヒント

Mastra Studioで各ステップの実行結果を確認できます：

- **buildPromptStep**: 生成されたプロンプトテキストを確認
- **planGeneratorStep**: エージェントの生の応答（構造化出力）を確認
- **validateResultStep**: 検証済みの最終結果を確認

## 参考

- ワークフローファイル: `src/mastra/workflows/test-plan-generator.ts`
- エージェント定義: `src/mastra/agents/plan-generator.ts`
- 実際の使用例: `src/lib/services/plan-service.ts:250-257`
