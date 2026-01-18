# 計画書: Preference Learner & フィードバック機能

## フェーズ 1: 好み登録機能の実装
- [x] タスク: Preference スキーマと Firestore 操作の実装
  - `src/lib/preference.ts` を作成。
  - `preferences/main` の型定義と CRUD 実装。
- [~] タスク: 好み登録 UI の実装
  - `src/components/preference-form.tsx` を作成。
  - 好きな食材、嫌いな食材、アレルギーの入力フォーム（タグ形式）。
  - `/profile` ページへの統合。
- [x] タスク: オンボーディングフローの更新
  - `onboardingCompleted` の条件更新。
  - プロフィール設定後の導線追加。

## フェーズ 2: Recipe Creator へのコンテキスト注入
- [x] タスク: エージェントプロンプトの動的生成
  - `src/lib/agents/recipe-creator.ts` の修正。
  - `UserPreference` を受け取り、プロンプトに好み・NG食材・学習傾向を反映させる関数の実装。
- [x] タスク: API Route の更新
  - `src/app/api/test-agent/route.ts` (または本番用エンドポイント) の修正。
  - DBから Preference を取得し、Agent に渡す処理の追加。

## フェーズ 3: フィードバック機能の実装
- [x] タスク: Feedback スキーマと Firestore 操作
  - `src/lib/feedback.ts` を作成。
  - `saveFeedback`, `getFeedbacksByUser` の実装。
- [x] タスク: フィードバック入力 UI
  - `src/components/feedback-form.tsx` を作成。
  - 評価（星）、コメント、再調理意向の入力フォーム。
- [x] タスク: フィードバックフローの統合
  - `/home` ページでのレシピ選択（「これに決めた」）時の保存処理。
  - フィードバック入力への導線（モーダル等）。

## フェーズ 4: Preference Learner Agent の実装
- [x] タスク: エージェント定義
  - `src/lib/agents/preference-learner.ts` を作成。
  - フィードバック分析用のシステムプロンプトと出力スキーマ（Zod）の定義。
- [x] タスク: 学習ロジックの実装
  - フィードバック受信時に Agent を呼び出す。
  - 分析結果に基づいて `learnedProfile` を更新（指数移動平均等）し、Firestore に保存する。

## フェーズ 5: おすすめタグ表示
- [x] タスク: おすすめタグコンポーネント
  - `src/components/recommended-tags.tsx` を作成。
  - `learnedProfile` から高スコアの属性を抽出して表示。
- [x] タスク: ホーム画面への統合
  - `/home` の MoodSelector 付近に配置し、タップで入力に反映させる。

## 完了条件
- [x] `npm run lint` および `npx tsc --noEmit` を通過すること。
- [x] 手動テストにより、登録した好みがレシピ生成に反映されることを確認。
- [x] フィードバックが保存され、プロファイルが更新されることを確認。
