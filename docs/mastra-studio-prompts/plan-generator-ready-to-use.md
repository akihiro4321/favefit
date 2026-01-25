# Plan Generator Agent - すぐに使えるプロンプト集

Mastra Studioでコピー&ペーストしてすぐに実行できるプロンプト集です。

---

## プロンプト 1: 基本的なプラン生成（コピー&ペースト用）

```
以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。

【ユーザー情報】
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
  "startDate": "2026-01-26"
}
```

---

## プロンプト 2: 最小限の入力データ（コピー&ペースト用）

```
以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。

【ユーザー情報】
{
  "targetCalories": 2000,
  "pfc": {
    "protein": 120,
    "fat": 60,
    "carbs": 220
  },
  "cheatDayFrequency": "biweekly",
  "startDate": "2026-01-26"
}
```

---

## プロンプト 3: 高タンパク質・低カロリー設定（コピー&ペースト用）

```
以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。

【ユーザー情報】
{
  "targetCalories": 1500,
  "pfc": {
    "protein": 150,
    "fat": 40,
    "carbs": 120
  },
  "preferences": {
    "cuisines": {
      "japanese": 25,
      "western": 20
    },
    "flavorProfile": {
      "light": 25,
      "umami": 20
    },
    "dislikedIngredients": []
  },
  "favoriteRecipes": [
    {
      "id": "recipe-1",
      "title": "サラダチキン",
      "tags": ["高タンパク", "低カロリー", "簡単"]
    }
  ],
  "cheapIngredients": ["鶏むね肉", "卵", "豆腐", "もやし"],
  "cheatDayFrequency": "biweekly",
  "startDate": "2026-01-26"
}
```

---

## プロンプト 4: フィードバック付きプラン生成（コピー&ペースト用）

```
以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。

【ユーザー情報】
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
  "startDate": "2026-01-26"
}

【前回のプラン拒否時のフィードバック】
前回のプランは同じようなメニューが多く、飽きてしまいました。もっとバリエーション豊富なメニューを希望します。また、調理時間が短いレシピを優先してください。

このフィードバックを考慮して、より適切なプランを生成してください。
```

---

## プロンプト 5: エッジケース - 厳しい制約（コピー&ペースト用）

```
以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。

【ユーザー情報】
{
  "targetCalories": 1200,
  "pfc": {
    "protein": 80,
    "fat": 30,
    "carbs": 100
  },
  "preferences": {
    "cuisines": {
      "japanese": 50
    },
    "flavorProfile": {
      "light": 30
    },
    "dislikedIngredients": ["にんじん", "セロリ", "ピーマン", "トマト", "ナス"]
  },
  "favoriteRecipes": [],
  "cheapIngredients": ["もやし", "豆腐"],
  "cheatDayFrequency": "weekly",
  "startDate": "2026-01-26"
}
```

---

## Mastra Studioでの実行手順

1. **エージェント選択**
   - Mastra Studioで`planGenerator`エージェントを選択

2. **構造化出力の設定**
   - 「構造化出力」オプションを有効化
   - スキーマ: `PlanGeneratorOutputSchema`を指定
   - `jsonPromptInjection: true`を設定（Gemini 2.5モデルの場合）

3. **プロンプト入力**
   - 上記のいずれかのプロンプトをコピー&ペースト

4. **実行**
   - 実行ボタンをクリック
   - 結果を確認

5. **検証**
   - `days`配列が14要素であることを確認
   - 各食事の`nutrition`フィールドが数値型であることを確認
   - チートデイが正しく設定されていることを確認
   - `dislikedIngredients`が使用されていないことを確認

---

## 期待される出力の例（構造）

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

---

## トラブルシューティング

### 問題: `days`配列が14要素でない
**解決策**: プロンプトの冒頭に「必ず14日間のプランを生成してください」と明記

### 問題: `nutrition`フィールドが文字列型になっている
**解決策**: プロンプトの最後に「nutritionフィールドの各値（calories, protein, fat, carbs）は数値型で出力してください」と追加

### 問題: チートデイの設定が間違っている
**解決策**: プロンプトに「チートデイはweeklyの場合は7日目と14日目、biweeklyの場合は14日目のみに設定してください」と明記

### 問題: 同じレシピが連続している
**解決策**: プロンプトに「同じレシピが連続しないよう、バリエーション豊富なメニューを生成してください」と追加
