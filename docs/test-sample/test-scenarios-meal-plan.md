# 食事プラン生成 V2 テストシナリオ集

このドキュメントは、`/debug/meal-plan` ページで使用するためのテストデータとシナリオをまとめたものです。各 JSON をコピーしてデバッグ画面の左側エディタに貼り付け、「Version 2」を選択して実行してください。

---

## シナリオ 1: 標準的な減量（和食・バランス重視）
**目的**: 朝食固定の条件下で、食材（キャベツ、鶏肉）が数日間にわたって正しく使い回されるかを確認する。

### 入力データ
```json
{
  "input": {
    "targetCalories": 1800,
    "pfc": { "protein": 100, "fat": 50, "carbs": 230 },
    "mealTargets": {
      "breakfast": { "calories": 400, "protein": 20, "fat": 10, "carbs": 50 },
      "lunch": { "calories": 700, "protein": 40, "fat": 20, "carbs": 90 },
      "dinner": { "calories": 700, "protein": 40, "fat": 20, "carbs": 90 }
    },
    "preferences": {
      "cuisines": { "japanese": 10, "italian": 2 },
      "flavorProfile": { "light": 8, "spicy": 2 },
      "dislikedIngredients": ["レバー", "パクチー"]
    },
    "favoriteRecipes": [],
    "cheapIngredients": ["鶏むね肉", "キャベツ", "豆腐"],
    "cheatDayFrequency": "weekly",
    "startDate": "2026-02-07",
    "currentDiet": {
      "breakfast": "納豆卵かけご飯",
      "lunch": "外食の定食",
      "dinner": "自炊（肉野菜炒めなど）"
    },
    "mealSettings": {
      "breakfast": { "mode": "fixed", "text": "納豆卵かけご飯、味噌汁" },
      "lunch": { "mode": "auto", "text": "" },
      "dinner": { "mode": "auto", "text": "" }
    }
  },
  "mealTargets": {
    "breakfast": { "calories": 400, "protein": 20, "fat": 10, "carbs": 50 },
    "lunch": { "calories": 700, "protein": 40, "fat": 20, "carbs": 90 },
    "dinner": { "calories": 700, "protein": 40, "fat": 20, "carbs": 90 }
  },
  "dislikedIngredients": ["レバー", "パクチー"],
  "userId": "test-standard-loss"
}
```

---

## シナリオ 2: 筋肥大・バルクアップ（高タンパク・間食活用）
**目的**: 高カロリー目標 (2800kcal) に対し、3食が巨大化しすぎず、「間食 (snack)」が適切に導入されて栄養素を補完しているかを確認する。

### 入力データ
```json
{
  "input": {
    "targetCalories": 2800,
    "pfc": { "protein": 180, "fat": 70, "carbs": 360 },
    "mealTargets": {
      "breakfast": { "calories": 700, "protein": 40, "fat": 15, "carbs": 100 },
      "lunch": { "calories": 1000, "protein": 70, "fat": 25, "carbs": 130 },
      "dinner": { "calories": 1100, "protein": 70, "fat": 30, "carbs": 130 }
    },
    "preferences": {
      "cuisines": { "japanese": 5, "italian": 8, "ethnic": 5 },
      "flavorProfile": { "salty": 7, "spicy": 5 },
      "dislikedIngredients": []
    },
    "favoriteRecipes": [],
    "cheapIngredients": ["牛赤身肉", "ブロッコリー", "プロテインパウダー"],
    "cheatDayFrequency": "weekly",
    "startDate": "2026-02-07",
    "currentDiet": {
      "breakfast": "プロテインとパン",
      "lunch": "鶏肉弁当",
      "dinner": "パスタや肉料理"
    },
    "mealSettings": {
      "breakfast": { "mode": "auto", "text": "" },
      "lunch": { "mode": "auto", "text": "" },
      "dinner": { "mode": "auto", "text": "" }
    }
  },
  "mealTargets": {
    "breakfast": { "calories": 700, "protein": 40, "fat": 15, "carbs": 100 },
    "lunch": { "calories": 1000, "protein": 70, "fat": 25, "carbs": 130 },
    "dinner": { "calories": 1100, "protein": 70, "fat": 30, "carbs": 130 }
  },
  "dislikedIngredients": [],
  "userId": "test-muscle-gain"
}
```

---

## シナリオ 3: アレルギーと苦手食材の徹底排除
**目的**: 「乳製品」「卵」がNGという強い制約の中で、食材プールが動物性以外のタンパク源（魚、豆）を中心に構成されるかを確認する。

### 入力データ
```json
{
  "input": {
    "targetCalories": 1900,
    "pfc": { "protein": 110, "fat": 50, "carbs": 250 },
    "mealTargets": {
      "breakfast": { "calories": 500, "protein": 30, "fat": 15, "carbs": 60 },
      "lunch": { "calories": 700, "protein": 40, "fat": 15, "carbs": 100 },
      "dinner": { "calories": 700, "protein": 40, "fat": 20, "carbs": 90 }
    },
    "preferences": {
      "cuisines": { "chinese": 10, "japanese": 5 },
      "flavorProfile": { "spicy": 8, "heavy": 5 },
      "dislikedIngredients": ["卵", "牛乳", "チーズ", "ヨーグルト", "バター"]
    },
    "favoriteRecipes": [],
    "cheapIngredients": ["豆腐", "白身魚", "豚ヒレ肉"],
    "cheatDayFrequency": "weekly",
    "startDate": "2026-02-07",
    "currentDiet": {
      "breakfast": "ご飯と魚",
      "lunch": "中華炒め",
      "dinner": "鍋料理"
    },
    "mealSettings": {
      "breakfast": { "mode": "auto", "text": "" },
      "lunch": { "mode": "auto", "text": "" },
      "dinner": { "mode": "auto", "text": "" }
    }
  },
  "mealTargets": {
    "breakfast": { "calories": 500, "protein": 30, "fat": 15, "carbs": 60 },
    "lunch": { "calories": 700, "protein": 40, "fat": 15, "carbs": 100 },
    "dinner": { "calories": 700, "protein": 40, "fat": 20, "carbs": 90 }
  },
  "dislikedIngredients": ["卵", "牛乳", "チーズ", "ヨーグルト", "バター"],
  "userId": "test-allergy-safe"
}
```

---

## シナリオ 4: 冷蔵庫の余り物一掃（自炊効率化）
**目的**: 「白菜」「ひき肉」が fridgeIngredients に指定されている場合、Day1-3 のプールでこれらが重点的に配分され、使い切るプランになるかを確認する。

### 入力データ
```json
{
  "input": {
    "targetCalories": 2000,
    "pfc": { "protein": 120, "fat": 60, "carbs": 245 },
    "mealTargets": {
      "breakfast": { "calories": 500, "protein": 30, "fat": 15, "carbs": 60 },
      "lunch": { "calories": 750, "protein": 45, "fat": 25, "carbs": 85 },
      "dinner": { "calories": 750, "protein": 45, "fat": 20, "carbs": 100 }
    },
    "preferences": {
      "cuisines": { "japanese": 10 },
      "flavorProfile": { "light": 9 },
      "dislikedIngredients": []
    },
    "fridgeIngredients": ["白菜 1/4玉", "合い挽き肉 300g", "長ねぎ 1本"],
    "favoriteRecipes": [],
    "cheapIngredients": ["豆腐", "もやし"],
    "cheatDayFrequency": "weekly",
    "startDate": "2026-02-07",
    "currentDiet": { "breakfast": "なし", "lunch": "コンビニ", "dinner": "ラーメン" },
    "mealSettings": {
      "breakfast": { "mode": "auto", "text": "" },
      "lunch": { "mode": "auto", "text": "" },
      "dinner": { "mode": "auto", "text": "" }
    }
  },
  "mealTargets": {
    "breakfast": { "calories": 500, "protein": 30, "fat": 15, "carbs": 60 },
    "lunch": { "calories": 750, "protein": 45, "fat": 25, "carbs": 85 },
    "dinner": { "calories": 750, "protein": 45, "fat": 20, "carbs": 100 }
  },
  "dislikedIngredients": [],
  "userId": "test-fridge-cleanup"
}
```

---

## シナリオ 5: 極端な非対称配分（超軽量朝食）
**目的**: 朝食が 200kcal と指定されている場合、1日の合計 2000kcal を達成するために夕食が 1000kcal を超えるのではなく、昼食と間食にバランスよく振り分けられるかを検証。

### 入力データ
```json
{
  "input": {
    "targetCalories": 2000,
    "pfc": { "protein": 120, "fat": 60, "carbs": 245 },
    "mealTargets": {
      "breakfast": { "calories": 400, "protein": 20, "fat": 10, "carbs": 50 },
      "lunch": { "calories": 800, "protein": 50, "fat": 25, "carbs": 95 },
      "dinner": { "calories": 800, "protein": 50, "fat": 25, "carbs": 100 }
    },
    "preferences": {
      "cuisines": { "japanese": 10 },
      "flavorProfile": { "light": 8 },
      "dislikedIngredients": []
    },
    "startDate": "2026-02-07",
    "currentDiet": { "breakfast": "スムージーのみ", "lunch": "しっかりめ", "dinner": "普通" },
    "mealSettings": {
      "breakfast": { "mode": "custom", "text": "ベリーのスムージー（200kcal以内）" },
      "lunch": { "mode": "auto", "text": "" },
      "dinner": { "mode": "auto", "text": "" }
    }
  },
  "mealTargets": {
    "breakfast": { "calories": 400, "protein": 20, "fat": 10, "carbs": 50 },
    "lunch": { "calories": 800, "protein": 50, "fat": 25, "carbs": 95 },
    "dinner": { "calories": 800, "protein": 50, "fat": 25, "carbs": 100 }
  },
  "dislikedIngredients": [],
  "userId": "test-extreme-asymmetry"
}
```
