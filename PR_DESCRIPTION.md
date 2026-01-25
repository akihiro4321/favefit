# 栄養目標のパーソナライズ機能実装

## 概要
ユーザーが目的（減量/維持/増量）に応じて、ペースや食事方針を選択できるパーソナライズ機能を実装しました。AI計算から決定論ロジックに切り替え、より透明性の高い栄養目標計算を提供します。

## 実装方針

### 計算方法
- **AI計算から決定論ロジックへ切り替え**
  - Mifflin-St Jeor式によるBMR計算
  - 活動レベル係数によるTDEE計算
  - ユーザー設定（ペース/微調整/方針）に基づく摂取カロリー算出
  - PFCプリセットに基づくマクロ栄養素配分

### データ保存
- **保存先**: `users/{userId}.nutrition.preferences`
- **フィールド**:
  - `lossPaceKgPerMonth`: 減量ペース（kg/月）
  - `maintenanceAdjustKcalPerDay`: 維持時の微調整（kcal/日）
  - `gainPaceKgPerMonth`: 増量ペース（kg/月）
  - `gainStrategy`: 増量方針（"lean" | "standard" | "aggressive"）
  - `macroPreset`: PFCプリセット（"balanced" | "lowfat" | "lowcarb" | "highprotein"）

### 設計上の整理
- **目的（goal）**: 既存の `profile.goal` を正として使用（二重管理を回避）
- **preferences**: ペース/方針/プリセットのみを保存
- **計算時**: `profile.goal` と `nutrition.preferences` を統合して使用

## 要件

### ユーザー体験
1. **減量時**: kg/月でペースを選択（0.5 / 1.0 / 2.0 kg/月）
2. **維持時**: kcal/日の微調整を選択（-200 〜 +200 kcal/日）
3. **増量時**: kg/月でペース + 増量方針を選択
   - ペース: 0.25 / 0.5 / 1.0 kg/月
   - 方針: リーン（脂肪増を抑える）/ 標準 / しっかり（体重を増やす）
4. **PFCプリセット**: バランス / ローファット / ローカーボ / 高たんぱく

### 計算ロジック
- **減量**: TDEE - (7700 × kg/月 ÷ 30)
- **維持**: TDEE + 微調整kcal/日
- **増量**: TDEE + (7700 × kg/月 ÷ 30)
- **PFC**:
  - たんぱく質: 目的と増量方針に応じたg/kg（減量:2.0g/kg、増量:1.8g/kg+方針補正）
  - 脂質: プリセットに応じた%（バランス:25%、ローファット:20%、ローカーボ:35%）
  - 炭水化物: 残り

## 変更内容

### スキーマ・型定義
- `src/lib/schema.ts`: `UserNutrition` に `preferences` フィールド追加

### 計算ロジック
- `src/lib/tools/calculateMacroGoals.ts`:
  - `calculatePersonalizedMacroGoals` 関数追加
  - `NutritionPreferencesSchema` 追加
  - プリセット別の脂質%とたんぱく質g/kgルール実装

### API
- `src/app/api/user/[action]/route.ts`:
  - `calculate-nutrition`: 決定論計算に切り替え、`preferences` を受け取る
  - `update-nutrition-preferences`: 新規追加（preferencesのみ更新）

### サービス層
- `src/lib/services/user-service.ts`: `calculateNutrition` を決定論計算に変更
- `src/lib/user.ts`: `updateUserNutritionPreferences` 関数追加
- `src/lib/services/plan-service.ts`: preferences優先ロジック実装

### UI
- `src/app/onboarding/page.tsx`: 目的別UI追加、preferences保存
- `src/components/profile-form.tsx`: 目的別UI追加、preferences保存
- `src/app/profile/page.tsx`: preferencesをProfileFormに渡す

### ドキュメント
- `docs/prototypes/nutrition-planner-wireframe.html`: UX検証用プロトタイプ
- `docs/test-cases/tools-test-cases.md`: パーソナライズ設定のテストケース追加

## テスト方法

### 手動テスト
1. **オンボーディング**:
   - Step 2で目的を選択し、対応するUIが表示されることを確認
   - PFCプリセットを選択し、計算結果が反映されることを確認
   - Step 3で計算結果が正しく表示されることを確認

2. **プロフィール更新**:
   - 既存のpreferencesが正しく読み込まれることを確認
   - 設定を変更して再計算が正しく行われることを確認

3. **プラン生成**:
   - preferencesがある場合は決定論計算が優先されることを確認
   - preferencesがない場合は従来ロジックがフォールバックされることを確認

### テストケース
- `docs/test-cases/tools-test-cases.md` の「テストケース 7」を参照

## 移行（既存ユーザー）

- `nutrition.preferences` が無いユーザーは既存の `nutrition.dailyCalories/pfc` をそのまま利用
- UI上は未設定状態を許容し、初回保存時にpreferencesを作成
- プラン生成時はpreferences優先、なければ従来ロジックでフォールバック

## 注意事項

- **活動レベル係数**: Mifflin-St Jeor式の標準的な活動係数を使用（参考リンクはコード内コメント参照）
- **kg/月換算**: 1kg ≈ 7700kcal、30日で割って日次に換算
- **増量方針**: カロリーではなくPFC（特にたんぱく質g/kg）に反映

## 関連ファイル

- プロトタイプ: `docs/prototypes/nutrition-planner-wireframe.html`
- 実装プラン: `.cursor/plans/nutrition_personalization_rollout_f2ae3120.plan.md`
