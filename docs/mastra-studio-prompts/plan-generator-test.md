# Plan Generator Agent - Mastra Studio 動作確認用プロンプト

## エージェント情報
- **エージェントID**: `planGenerator`
- **モデル**: `google/gemini-2.5-flash-lite`
- **用途**: 14日間の食事プランと買い物リストを生成

## テストケース 1: 基本的なプラン生成

### プロンプト
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

### 期待される出力
- `days`配列に14日分のプランが含まれている
- 各日には`breakfast`, `lunch`, `dinner`の3食が含まれている
- 各食事には`nutrition`（calories, protein, fat, carbs）が数値で含まれている
- `shoppingList`配列に買い物リストが含まれている
- チートデイは7日目と14日目に設定されている（weeklyの場合）
- `dislikedIngredients`（にんじん、セロリ）が使用されていない

---

## テストケース 2: 最小限の入力データ

### プロンプト
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

### 期待される出力
- `preferences`や`favoriteRecipes`がなくても正常に動作する
- チートデイは14日目のみ（biweeklyの場合）
- 基本的な栄養バランスが保たれている

---

## テストケース 3: フィードバック付きプラン生成

### プロンプト
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
```

### 期待される出力
- フィードバックを考慮した多様なメニュー構成
- 調理時間が短いレシピが優先されている
- 同じレシピが連続しないよう配慮されている

---

## テストケース 4: 高タンパク質・低カロリー設定

### プロンプト
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

### 期待される出力
- 高タンパク質（150g/日）を満たすメニュー構成
- 低カロリー（1500kcal/日）を維持
- 炭水化物が控えめ（120g/日）な構成

---

## テストケース 5: エッジケース - 非常に厳しい制約

### プロンプト
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

### 期待される出力
- 非常に厳しい制約でも14日間のプランが生成される
- 避けるべき食材が使用されていない
- 栄養目標に可能な限り近い値が設定されている

---

## 出力スキーマ検証ポイント

### 必須フィールド
- `days`: 配列（必ず14要素）
  - `date`: 文字列（YYYY-MM-DD形式）
  - `isCheatDay`: 真偽値
  - `breakfast`, `lunch`, `dinner`: 各食事オブジェクト
    - `recipeId`: 文字列
    - `title`: 文字列
    - `tags`: 文字列配列
    - `ingredients`: 文字列配列
    - `steps`: 文字列配列
    - `nutrition`: オブジェクト
      - `calories`: 数値（文字列ではない）
      - `protein`: 数値（文字列ではない）
      - `fat`: 数値（文字列ではない）
      - `carbs`: 数値（文字列ではない）
- `shoppingList`: 配列
  - `ingredient`: 文字列
  - `amount`: 文字列
  - `category`: 文字列

### 検証チェックリスト
- [ ] `days`配列が正確に14要素である
- [ ] 各食事の`nutrition`フィールドが数値型である（文字列ではない）
- [ ] チートデイが正しい日付に設定されている
- [ ] `dislikedIngredients`が使用されていない
- [ ] 1日の合計カロリーが`targetCalories`に近い（±200kcal以内が理想）
- [ ] 同じレシピが連続していない
- [ ] `shoppingList`がカテゴリ別に整理されている

---

## Mastra Studioでの実行方法

1. Mastra Studioを開く
2. エージェント一覧から`planGenerator`を選択
3. 上記のいずれかのテストケースのプロンプトを入力欄に貼り付け
4. 「構造化出力」オプションを有効化
5. スキーマとして`PlanGeneratorOutputSchema`を指定
6. 実行して結果を確認

## トラブルシューティング

### よくある問題

1. **`days`配列が14要素でない**
   - プロンプトに「必ず14日間のプラン」と明記する
   - スキーマの`.length(14)`制約を確認

2. **`nutrition`フィールドが文字列型になっている**
   - プロンプトに「nutritionフィールドの各値は数値型で出力してください」と明記
   - `jsonPromptInjection: true`を設定

3. **チートデイの設定が間違っている**
   - `weekly`: 7日目と14日目
   - `biweekly`: 14日目のみ
   - プロンプトで明確に指示

4. **同じレシピが連続している**
   - プロンプトに「同じレシピが連続しないよう変化をつける」と明記

5. **`dislikedIngredients`が使用されている**
   - プロンプトに「dislikedIngredientsは絶対に使わない」と強調
