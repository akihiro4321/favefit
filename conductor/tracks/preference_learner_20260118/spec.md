# 仕様書: Preference Learner & フィードバック機能

## 概要
FaveFitのコアバリューである「使うほど自分好みになる」体験を実現するため、ユーザーの好みを登録・学習・活用するサイクル（フィードバックループ）を構築する。

## 目的
1. **明示的な好み登録:** ユーザーが好きな食材・嫌いな食材・アレルギーを登録できるようにする。
2. **フィードバック収集:** 生成・調理されたレシピに対する評価と感想を収集する。
3. **AIによる学習:** フィードバック内容を分析し、ユーザーの潜在的な好みを `learnedProfile` として蓄積する。
4. **提案への反映:** 登録された好みと学習結果を次回のレシピ生成に反映させ、パーソナライズ精度を向上させる。

## データベース設計
`conductor/product.md` のセクション5を参照。

### users/{userId}/preferences/main
ユーザーの好み設定と学習済みプロファイルを格納。
- `favoriteIngredients`: 好きな食材リスト
- `dislikedIngredients`: 嫌いな食材リスト
- `allergies`: アレルギーリスト
- `learnedProfile`: AIが学習したスコア（ジャンル、味、食材、回避パターン）

### users/{userId}/feedbacks/{feedbackId}
各レシピに対するフィードバック。
- `ratings`: 評価（総合、味、作りやすさ、満足感）
- `comment`: 自由記述コメント
- `analyzedTags`: AI分析結果

## アーキテクチャ

### Preference Learner Agent
- **役割:** 感想フィードバックの分析とプロファイル更新
- **入力:** ユーザーのフィードバック、対象レシピ情報
- **出力:** 更新された `learnedProfile` の差分（または更新後のプロファイル）
- **ロジック:** 指数移動平均などを用いて、直近のフィードバックを重み付けしてプロファイルを更新する。

### Recipe Creator Agent (更新)
- **変更点:** プロンプト生成時に `Preference` データを注入する。
- **挙動:**
    - `favoriteIngredients` を積極的に採用。
    - `dislikedIngredients` と `allergies` を除外。
    - `learnedProfile` でスコアの高いジャンル・味付けを優先。

## UI/UX
1. **好み登録 (`/profile`)**
   - タグ入力形式で直感的に登録可能。
2. **フィードバック入力 (`/home` -> モーダル)**
   - 星評価とコメント入力。
   - 「また作りたい？」などのシンプルな質問。
3. **おすすめタグ (`/home`)**
   - 学習結果に基づき、「今日の気分」入力時にタグをサジェストする。

## 参照
- `conductor/product.md`
- `src/lib/user.ts`
- `src/lib/agents/recipe-creator.ts`
