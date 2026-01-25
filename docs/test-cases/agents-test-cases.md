# Mastra Studio エージェント確認用テストケース

このファイルには、各エージェントの動作確認用のインプットと期待されるアウトプットが記載されています。

## 1. Plan Generator Agent (`plan-generator.ts`)

### テストケース 1: 基本的な14日間プラン生成

**インプット:**
```json
{
  "targetCalories": 1800,
  "pfc": {
    "protein": 120,
    "fat": 50,
    "carbs": 200
  },
  "preferences": {
    "cuisines": {
      "japanese": 8,
      "korean": 6,
      "italian": 5
    },
    "flavorProfile": {
      "spicy": 7,
      "light": 5
    },
    "dislikedIngredients": ["にんじん", "セロリ"]
  },
  "favoriteRecipes": [
    {
      "id": "recipe-001",
      "title": "鶏のから揚げ",
      "tags": ["japanese", "fried", "chicken"]
    },
    {
      "id": "recipe-002",
      "title": "キムチチゲ",
      "tags": ["korean", "spicy", "soup"]
    }
  ],
  "cheapIngredients": ["キャベツ", "もやし", "鶏もも肉"],
  "cheatDayFrequency": "weekly",
  "startDate": "2026-01-26"
}
```

**期待されるアウトプット:**
- `days`配列が14要素であること
- 各日が`breakfast`, `lunch`, `dinner`を含むこと
- 7日目と14日目が`isCheatDay: true`であること
- 各食事の`nutrition`が目標値に近いこと（±10%程度の誤差は許容）
- `dislikedIngredients`（にんじん、セロリ）が使用されていないこと
- `shoppingList`がカテゴリ別に整理されていること
- 同じレシピが連続しないこと

### テストケース 2: biweeklyチートデイ設定

**インプット:**
```json
{
  "targetCalories": 2000,
  "pfc": {
    "protein": 150,
    "fat": 60,
    "carbs": 220
  },
  "preferences": {
    "cuisines": {
      "italian": 9,
      "french": 7
    },
    "flavorProfile": {
      "rich": 8,
      "sweet": 6
    },
    "dislikedIngredients": []
  },
  "favoriteRecipes": [
    {
      "id": "recipe-003",
      "title": "パスタカルボナーラ",
      "tags": ["italian", "pasta", "cheese"]
    }
  ],
  "cheapIngredients": ["パスタ", "卵"],
  "cheatDayFrequency": "biweekly",
  "startDate": "2026-01-26"
}
```

**期待されるアウトプット:**
- `days`配列が14要素であること
- 14日目のみが`isCheatDay: true`であること
- 他の日は`isCheatDay: false`であること

### テストケース 3: 最小限のインプット

**インプット:**
```json
{
  "targetCalories": 1500,
  "pfc": {
    "protein": 100,
    "fat": 40,
    "carbs": 150
  },
  "cheatDayFrequency": "weekly",
  "startDate": "2026-01-26"
}
```

**期待されるアウトプット:**
- `preferences`や`favoriteRecipes`がなくても正常に動作すること
- デフォルトの嗜好でプランが生成されること

---

## 2. Boredom Analyzer Agent (`boredom-analyzer.ts`)

### テストケース 1: 飽きリスクが高いケース（同じ料理の繰り返し）

**インプット:**
```json
{
  "recentMeals": [
    { "date": "2026-01-12", "mealType": "dinner", "title": "鶏のから揚げ", "tags": ["japanese", "fried"] },
    { "date": "2026-01-13", "mealType": "dinner", "title": "鶏のから揚げ", "tags": ["japanese", "fried"] },
    { "date": "2026-01-14", "mealType": "dinner", "title": "鶏のから揚げ", "tags": ["japanese", "fried"] },
    { "date": "2026-01-15", "mealType": "lunch", "title": "親子丼", "tags": ["japanese", "rice"] },
    { "date": "2026-01-16", "mealType": "dinner", "title": "親子丼", "tags": ["japanese", "rice"] },
    { "date": "2026-01-17", "mealType": "dinner", "title": "親子丼", "tags": ["japanese", "rice"] }
  ],
  "preferences": {
    "cuisines": {
      "japanese": 10
    },
    "flavorProfile": {
      "light": 8
    }
  }
}
```

**期待されるアウトプット:**
- `boredomScore`が61以上であること
- `shouldRefresh`が`true`であること
- `recommendations`に複数の提案が含まれること
- `analysis`に「同じ料理の繰り返し」や「ジャンルの偏り」が指摘されること

### テストケース 2: 変化に富んでいるケース

**インプット:**
```json
{
  "recentMeals": [
    { "date": "2026-01-12", "mealType": "dinner", "title": "パスタカルボナーラ", "tags": ["italian", "pasta"] },
    { "date": "2026-01-13", "mealType": "dinner", "title": "キムチチゲ", "tags": ["korean", "spicy"] },
    { "date": "2026-01-14", "mealType": "dinner", "title": "サラダボウル", "tags": ["healthy", "salad"] },
    { "date": "2026-01-15", "mealType": "dinner", "title": "ハンバーグ", "tags": ["western", "meat"] },
    { "date": "2026-01-16", "mealType": "dinner", "title": "麻婆豆腐", "tags": ["chinese", "spicy"] },
    { "date": "2026-01-17", "mealType": "dinner", "title": "サーモンのムニエル", "tags": ["french", "fish"] }
  ],
  "preferences": {
    "cuisines": {
      "italian": 7,
      "korean": 6,
      "chinese": 5
    }
  }
}
```

**期待されるアウトプット:**
- `boredomScore`が30以下であること
- `shouldRefresh`が`false`であること
- `analysis`に「変化に富んでいる」などの肯定的な評価が含まれること

### テストケース 3: やや偏りがあるケース

**インプット:**
```json
{
  "recentMeals": [
    { "date": "2026-01-12", "mealType": "dinner", "title": "和風ハンバーグ", "tags": ["japanese", "meat"] },
    { "date": "2026-01-13", "mealType": "dinner", "title": "親子丼", "tags": ["japanese", "rice"] },
    { "date": "2026-01-14", "mealType": "dinner", "title": "味噌ラーメン", "tags": ["japanese", "noodle"] },
    { "date": "2026-01-15", "mealType": "dinner", "title": "生姜焼き", "tags": ["japanese", "meat"] },
    { "date": "2026-01-16", "mealType": "dinner", "title": "天ぷら", "tags": ["japanese", "fried"] },
    { "date": "2026-01-17", "mealType": "dinner", "title": "カレーライス", "tags": ["japanese", "curry"] }
  ],
  "preferences": {
    "cuisines": {
      "japanese": 9
    }
  }
}
```

**期待されるアウトプット:**
- `boredomScore`が31-60の範囲であること
- `recommendations`に「他のジャンルを試す」などの提案が含まれること

---

## 3. Menu Adjuster Agent (`menu-adjuster.ts`)

### テストケース 1: 基本的なメニュー調整

**インプット:**
```json
{
  "availableIngredients": ["鶏もも肉", "キャベツ", "にんにく", "しょうゆ", "みりん", "ご飯"],
  "targetNutrition": {
    "calories": 600,
    "protein": 40,
    "fat": 15,
    "carbs": 60
  },
  "preferences": {
    "cuisines": {
      "japanese": 8
    },
    "flavorProfile": {
      "light": 6
    },
    "dislikedIngredients": ["にんじん"]
  }
}
```

**期待されるアウトプット:**
- `suggestions`配列が3要素であること
- 各提案が`recipeId`, `title`, `description`, `tags`, `ingredients`, `steps`, `nutrition`を含むこと
- `additionalIngredients`が最小限であること（手元の食材を最大限活用）
- `nutrition`が`targetNutrition`に近いこと
- `dislikedIngredients`（にんじん）が使用されていないこと
- `message`がユーザー向けのメッセージであること

### テストケース 2: ユーザーコメントあり（辛いもの希望）

**インプット:**
```json
{
  "availableIngredients": ["豚バラ肉", "キャベツ", "キムチ", "ご飯", "ごま油"],
  "targetNutrition": {
    "calories": 700,
    "protein": 35,
    "fat": 20,
    "carbs": 70
  },
  "userComment": "もっと辛く、ガッツリしたものが食べたい",
  "preferences": {
    "flavorProfile": {
      "spicy": 7
    }
  }
}
```

**期待されるアウトプット:**
- `suggestions`の各`description`に「辛い」「ガッツリ」などの要素が含まれること
- `tags`に`spicy`や`hearty`などのタグが含まれること
- `message`に「辛めのレシピ」などの言及があること

### テストケース 3: 却下されたレシピの除外

**インプット:**
```json
{
  "availableIngredients": ["鶏むね肉", "ブロッコリー", "オリーブオイル", "塩", "こしょう"],
  "targetNutrition": {
    "calories": 500,
    "protein": 45,
    "fat": 10,
    "carbs": 40
  },
  "previousSuggestions": ["鶏むね肉のソテー", "ブロッコリーのサラダ"],
  "preferences": {
    "cuisines": {
      "western": 6
    }
  }
}
```

**期待されるアウトプット:**
- `previousSuggestions`に含まれるレシピ名が提案されないこと
- 異なるアプローチのレシピが提案されること

---

## 4. Nutrition Planner Agent (`nutrition-planner.ts`)

**注意:** このエージェントは`calculate_nutrition`ツールを使用します。インプットは自然言語のプロンプトです。

### テストケース 1: 減量目標の男性

**インプット（プロンプト）:**
```
30歳の男性です。身長175cm、体重80kgです。デスクワーク中心で活動レベルは低めです。体重を5kg減らしたいです。
```

**期待されるアウトプット:**
- `daily_calorie_target`が計算されていること（TDEEの80%程度）
- `protein_g`が体重×2.0g程度（減量時）であること
- `fat_g`が総カロリーの25%程度であること
- `carbs_g`が残りのカロリーから計算されていること
- `strategy_summary`が2-3文で説明されていること
- `calculate_nutrition`ツールが呼び出されていること

### テストケース 2: 維持目標の女性

**インプット（プロンプト）:**
```
25歳の女性です。身長160cm、体重55kgです。週に3回ジムに通っています。現在の体重を維持したいです。
```

**期待されるアウトプット:**
- `daily_calorie_target`がTDEEとほぼ同じであること
- `protein_g`が体重×1.6g程度であること
- `strategy_summary`に「維持」に関する説明が含まれること

### テストケース 3: 増量目標

**インプット（プロンプト）:**
```
22歳の男性です。身長180cm、体重65kgです。毎日運動しています。筋肉量を増やしたいです。
```

**期待されるアウトプット:**
- `daily_calorie_target`がTDEEの115%程度であること
- `protein_g`が十分な量（体重×1.6g以上）であること
- `strategy_summary`に「増量」や「筋肉量」に関する説明が含まれること

---

## 5. Preference Learner Agent (`preference-learner.ts`)

### テストケース 1: また作りたい（好みの強化）

**インプット:**
```json
{
  "recipe": {
    "title": "キムチチゲ",
    "tags": ["korean", "spicy", "soup"],
    "ingredients": ["キムチ", "豚肉", "豆腐", "にら"]
  },
  "feedback": {
    "wantToMakeAgain": true,
    "comment": "とても美味しかった！また作りたい"
  },
  "currentPreferences": {
    "cuisines": {
      "korean": 5,
      "japanese": 7
    },
    "flavorProfile": {
      "spicy": 4,
      "light": 6
    }
  }
}
```

**期待されるアウトプット:**
- `cuisineUpdates`に`korean`が+5〜+10の範囲でプラスされること
- `flavorUpdates`に`spicy`がプラスされること
- `summary`に「キムチチゲを好む」などの学習内容が記載されること

### テストケース 2: 作りたくない（好みの弱化）

**インプット:**
```json
{
  "recipe": {
    "title": "にんじんのサラダ",
    "tags": ["healthy", "salad", "vegetable"],
    "ingredients": ["にんじん", "レタス", "ドレッシング"]
  },
  "feedback": {
    "wantToMakeAgain": false,
    "comment": "にんじんが苦手で食べられなかった"
  },
  "currentPreferences": {
    "cuisines": {
      "western": 6
    },
    "flavorProfile": {
      "light": 7
    }
  }
}
```

**期待されるアウトプット:**
- `cuisineUpdates`や`flavorUpdates`にマイナススコアが含まれること
- `summary`に「にんじんが苦手」などの学習内容が記載されること

### テストケース 3: コメントから詳細な学習

**インプット:**
```json
{
  "recipe": {
    "title": "パスタカルボナーラ",
    "tags": ["italian", "pasta", "cheese"],
    "ingredients": ["パスタ", "ベーコン", "卵", "チーズ"]
  },
  "feedback": {
    "wantToMakeAgain": true,
    "comment": "クリーミーで濃厚な味が最高！チーズがたっぷりで大満足"
  },
  "currentPreferences": {
    "cuisines": {
      "italian": 6
    },
    "flavorProfile": {
      "rich": 5,
      "light": 4
    }
  }
}
```

**期待されるアウトプット:**
- `cuisineUpdates`に`italian`がプラスされること
- `flavorUpdates`に`rich`が大きくプラスされること（コメントから「濃厚」を読み取る）
- `summary`にコメントの内容が反映されること

---

## 6. Recipe Creator Agent (`recipe-creator.ts`)

**注意:** このエージェントは`buildRecipePrompt`関数で構築されたプロンプトを受け取ります。

### テストケース 1: 基本的なレシピ生成

**インプット（プロンプト例）:**
```
【リクエスト内容】
- 今日の気分: ヘルシーなものが食べたい
- 目標栄養素: カロリー500kcal, タンパク質30g, 脂質15g, 炭水化物50g

【ユーザーの好み情報】
- 好きな食材: 鶏むね肉, ブロッコリー, トマト
- 苦手な食材: にんじん, セロリ
- アレルギー: なし
- 料理スキル: intermediate
- かけられる時間: medium
- 過去の傾向: 好みのジャンル: japanese, korean, 好みの味: light, spicy
```

**期待されるアウトプット:**
- `title`が適切なレシピ名であること
- `description`が魅力的な説明であること
- `ingredients`が配列で、各要素が`name`と`amount`を含むこと
- `instructions`がステップ形式の配列であること（最大5ステップ程度）
- `nutrition`が目標値に近いこと（±10%程度の誤差は許容）
- `cookingTime`が15-20分程度であること
- 苦手な食材（にんじん、セロリ）が使用されていないこと
- 好きな食材が積極的に使用されていること

### テストケース 2: 具体的な料理名のリクエスト

**インプット（プロンプト例）:**
```
【リクエスト内容】
- 今日の気分: ハンバーグが食べたい
- 目標栄養素: カロリー700kcal, タンパク質40g, 脂質25g, 炭水化物60g

【ユーザーの好み情報】
- 好きな食材: 牛肉, 玉ねぎ
- 苦手な食材: なし
- アレルギー: なし
- 料理スキル: beginner
- かけられる時間: short
```

**期待されるアウトプット:**
- `title`に「ハンバーグ」が含まれること
- 初心者でも作れるような簡単な手順であること
- 短時間で作れるレシピであること（15分以内）

### テストケース 3: 特殊な食材のリクエスト

**インプット（プロンプト例）:**
```
【リクエスト内容】
- 今日の気分: エスカルゴが食べたい
- 目標栄養素: カロリー400kcal, タンパク質20g, 脂質20g, 炭水化物30g

【ユーザーの好み情報】
- 好きな食材: にんにく, バター
- 苦手な食材: なし
- アレルギー: なし
- 料理スキル: advanced
```

**期待されるアウトプット:**
- `title`に「エスカルゴ」が含まれること
- 特殊な食材でもリクエスト通りに提案されること
- 入手難易度の制約が緩和されていること

---

## 確認時の注意事項

1. **JSON形式の検証**: 各エージェントの出力がスキーマに準拠しているか確認してください
2. **数値の型**: `nutrition`フィールドの各値が数値型であることを確認してください（文字列ではない）
3. **配列の長さ**: `days`配列が14要素、`suggestions`が3要素など、指定された長さになっているか確認してください
4. **必須フィールド**: 各スキーマで必須とされているフィールドがすべて含まれているか確認してください
5. **ツールの呼び出し**: `nutrition-planner`エージェントが`calculate_nutrition`ツールを正しく呼び出しているか確認してください
