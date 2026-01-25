# Mastra Studio ツール確認用テストケース

このファイルには、Mastra Studio から呼び出す **Tool** の動作確認用インプットと期待アウトプットを記載します。

## 1. 栄養計算 Tool（`id: calculate_nutrition`）

### 対応ツール

- `src/mastra/tools/calculateMacroGoals.ts` の `nutritionCalculatorTool`（`id: calculate_nutrition`）

### 内部実装

- `src/lib/tools/calculateMacroGoals.ts` の `calculateMacroGoals()`

### 概要

- Mifflin-St Jeor式でBMR算出 → 活動レベル係数でTDEE算出 → 目標に応じてカロリー調整 → PFC計算
- **このToolの入力スキーマには `preferences` は含まれません**（`CalculateMacroGoalsInputSchema` のみ）

### 丸めルール（実装準拠）

- `bmr`: 最後に `Math.round(bmr)`（例: 1748.75 → 1749）
- `tdee`: `Math.round(bmr * activityMultiplier)`
- `targetCalories`: 目標係数適用後に `Math.round(...)`
- `pfc`:
  - `protein(g)`: `Math.round(weight * (lose=2.0, その他=1.6))`
  - `fat(g)`: `Math.round((targetCalories * 0.25) / 9)`
  - `carbs(g)`: `Math.round((targetCalories - protein*4 - (targetCalories*0.25)) / 4)`  
    ※ **fat(g) を 9kcal 換算した値ではなく、`fatCalories = targetCalories * 0.25`（小数）をそのまま差し引く**点に注意

### テストケース 1: 減量目標の男性（低活動レベル）

**インプット:**

```json
{
  "age": 30,
  "gender": "male",
  "height_cm": 175,
  "weight_kg": 80,
  "activity_level": "sedentary",
  "goal": "lose"
}
```

**期待されるアウトプット:**

```json
{
  "bmr": 1749,
  "tdee": 2099,
  "targetCalories": 1679,
  "pfc": {
    "protein": 160,
    "fat": 47,
    "carbs": 155
  }
}
```

**計算の検証:**

- BMR = 10 × 80 + 6.25 × 175 - 5 × 30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 ≈ 1749（四捨五入）
- TDEE = round(1748.75 × 1.2) = round(2098.5) = 2099
- targetCalories = round(2099 × 0.8) = round(1679.2) = 1679
- protein = round(80 × 2.0) = 160g
- fatCalories = 1679 × 0.25 = 419.75kcal → fat = round(419.75 / 9) = 47g
- carbsCalories = 1679 - 160×4 - 419.75 = 619.25kcal → carbs = round(619.25 / 4) = 155g

### テストケース 2: 維持目標の女性（適度な活動レベル）

**インプット:**

```json
{
  "age": 25,
  "gender": "female",
  "height_cm": 160,
  "weight_kg": 55,
  "activity_level": "moderate",
  "goal": "maintain"
}
```

**期待されるアウトプット:**

```json
{
  "bmr": 1264,
  "tdee": 1959,
  "targetCalories": 1959,
  "pfc": {
    "protein": 88,
    "fat": 54,
    "carbs": 279
  }
}
```

**計算の検証:**

- BMR = 10 × 55 + 6.25 × 160 - 5 × 25 - 161 = 550 + 1000 - 125 - 161 = 1264
- TDEE = round(1264 × 1.55) = round(1959.2) = 1959
- targetCalories = round(1959) = 1959
- protein = round(55 × 1.6) = 88g
- fatCalories = 1959 × 0.25 = 489.75kcal → fat = round(489.75 / 9) = 54g
- carbsCalories = 1959 - 88×4 - 489.75 = 1117.25kcal → carbs = round(1117.25 / 4) = 279g

### テストケース 3: 増量目標の男性（高活動レベル）

**インプット:**

```json
{
  "age": 22,
  "gender": "male",
  "height_cm": 180,
  "weight_kg": 65,
  "activity_level": "very_active",
  "goal": "gain"
}
```

**期待されるアウトプット:**

```json
{
  "bmr": 1670,
  "tdee": 3173,
  "targetCalories": 3649,
  "pfc": {
    "protein": 104,
    "fat": 101,
    "carbs": 580
  }
}
```

**計算の検証:**

- BMR = 10 × 65 + 6.25 × 180 - 5 × 22 + 5 = 650 + 1125 - 110 + 5 = 1670
- TDEE = BMR × 1.9 = 1670 × 1.9 = 3173
- targetCalories = TDEE × 1.15 = 3173 × 1.15 = 3648.95 ≈ 3649
- protein = weight × 1.6 = 65 × 1.6 = 104g
- fat = (3649 × 0.25) / 9 = 912.25 / 9 ≈ 101g
- carbsCalories = 3649 - 104×4 - (3649×0.25) = 2320.75kcal → carbs = round(2320.75 / 4) = 580g

### テストケース 4: 境界値テスト - 最小値

**インプット:**

```json
{
  "age": 10,
  "gender": "female",
  "height_cm": 100,
  "weight_kg": 30,
  "activity_level": "sedentary",
  "goal": "maintain"
}
```

**期待されるアウトプット:**

- エラーなく計算が完了すること
- すべての値が正の数であること
- `pfc`の各値が0以上であること

### テストケース 5: 境界値テスト - 最大値

**インプット:**

```json
{
  "age": 100,
  "gender": "male",
  "height_cm": 250,
  "weight_kg": 200,
  "activity_level": "very_active",
  "goal": "lose"
}
```

**期待されるアウトプット:**

- エラーなく計算が完了すること
- BMRとTDEEが非常に高い値になること
- `pfc`の各値が適切な範囲内であること

### テストケース 6: 中年女性の減量ケース

**インプット:**

```json
{
  "age": 45,
  "gender": "female",
  "height_cm": 165,
  "weight_kg": 70,
  "activity_level": "moderate",
  "goal": "lose"
}
```

**期待されるアウトプット:**

```json
{
  "bmr": 1345,
  "tdee": 2085,
  "targetCalories": 1668,
  "pfc": {
    "protein": 140,
    "fat": 46,
    "carbs": 173
  }
}
```

**計算の検証:**

- BMR = 10 × 70 + 6.25 × 165 - 5 × 45 - 161 = 700 + 1031.25 - 225 - 161 = 1345.25 ≈ 1345（四捨五入）
- TDEE = BMR × 1.55 = 1345 × 1.55 = 2084.75 ≈ 2085
- targetCalories = TDEE × 0.8 = 2085 × 0.8 = 1668
- protein = weight × 2.0 = 70 × 2.0 = 140g（減量時）
- fat = (1668 × 0.25) / 9 = 417 / 9 ≈ 46g
- carbsCalories = 1668 - 140×4 - (1668×0.25) = 691kcal → carbs = round(691 / 4) = 173g

### テストケース 7: 入力バリデーション（エラーになるケース）

**目的:** `CalculateMacroGoalsInputSchema` の制約に違反した場合に、Tool呼び出しが失敗することを確認する

#### 7.1 年齢が最小未満

**インプット:**

```json
{
  "age": 9,
  "gender": "female",
  "height_cm": 160,
  "weight_kg": 55,
  "activity_level": "moderate",
  "goal": "maintain"
}
```

**期待される結果:**

- Zodバリデーションエラー（`age` は 10 以上）

#### 7.2 体重が最大超過

**インプット:**

```json
{
  "age": 30,
  "gender": "male",
  "height_cm": 175,
  "weight_kg": 201,
  "activity_level": "sedentary",
  "goal": "lose"
}
```

**期待される結果:**

- Zodバリデーションエラー（`weight_kg` は 200 以下）

#### 7.3 `preferences` を渡してしまう（現行Toolでは未対応）

**インプット:**

```json
{
  "age": 30,
  "gender": "male",
  "height_cm": 175,
  "weight_kg": 80,
  "activity_level": "sedentary",
  "goal": "lose",
  "preferences": {
    "lossPaceKgPerMonth": 1
  }
}
```

**期待される結果:**

- Toolが入力スキーマに合致しないため失敗する（`preferences` は受け付けない）

---

## 確認時の注意事項

1. **計算式の正確性**: Mifflin-St Jeor式が正しく実装されているか確認してください
   - 男性: BMR = 10 × weight + 6.25 × height - 5 × age + 5
   - 女性: BMR = 10 × weight + 6.25 × height - 5 × age - 161

2. **活動レベル係数**: 正しい係数が適用されているか確認してください
   - sedentary: 1.2（ほぼ運動しない）
   - light: 1.375（軽い運動 週に1-2回運動）
   - moderate: 1.55（中度の運動 週に3-5回運動）
   - active: 1.725（激しい運動やスポーツ 週に6-7回運動）
   - very_active: 1.9（非常に激しい運動・肉体労働 1日に2回運動）

3. **目標調整**: 目標に応じたカロリー調整が正しいか確認してください
   - lose: `round(TDEE × 0.8)`（20%減）
   - maintain: `round(TDEE)`（維持）
   - gain: `round(TDEE × 1.15)`（15%増）

4. **PFC計算**: PFC比率が正しく計算されているか確認してください
   - タンパク質: `round(weight × (lose=2.0, その他=1.6))`
   - 脂質: `fatCalories = targetCalories × 0.25`、`fat = round(fatCalories / 9)`
   - 炭水化物: `carbs = round((targetCalories - protein×4 - fatCalories) / 4)`

5. **数値の丸め**: すべての値が適切に丸められているか確認してください（整数値）

6. **エラーハンドリング**: 境界値や無効な入力に対して適切にエラーが返されるか確認してください

7. **型の確認**: 出力がすべて数値型であることを確認してください（文字列ではない）

---

## テスト実行時のチェックリスト

- [ ] すべてのテストケースでエラーなく実行される
- [ ] BMRの計算が正しい
- [ ] TDEEの計算が正しい（BMR × 活動レベル係数）
- [ ] 目標カロリーが正しい（TDEE × 目標係数）
- [ ] タンパク質の計算が正しい（体重 × 係数）
- [ ] 脂質の計算が正しい（総カロリー × 0.25 / 9）
- [ ] 炭水化物の計算が正しい（`targetCalories - protein×4 - (targetCalories×0.25)` の残りを /4）
- [ ] すべての値が整数で返される
- [ ] すべての値が正の数である
- [ ] スキーマに準拠した出力が返される
