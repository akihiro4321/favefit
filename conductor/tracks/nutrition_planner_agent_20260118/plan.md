# 計画書: Nutrition Planner Agent 実装

## フェーズ 1: Google ADK セットアップ
- [x] タスク: Google ADK の導入
  - `@google/adk` および `@google/adk-devtools` のインストール。
  - プロジェクト構成の整備（エージェント定義用ディレクトリの作成）。
- [x] タスク: Gemini API の統合
  - Google Gemini モデルを使用するための設定。
  - APIキーの環境変数管理 (`.env.local`)。

## フェーズ 2: 栄養計算ロジックの実装 (Agent)
- [x] タスク: ユーザーコンテキストの定義
  - 年齢、性別、体重、身長、活動レベル、目的（減量/維持/増量）を入力とするインターフェースの設計。
- [x] タスク: Nutrition Planner Agent の作成
  - システムプロンプトの設計: ユーザー情報に基づいてTDEEとPFCバランスを計算するよう指示。
  - Output Schema の定義 (JSON): カロリー、タンパク質(g), 脂質(g), 炭水化物(g) を返す構造化データ。
- [x] タスク: ADK エージェントのテスト
  - サンプルデータを用いた Agent の動作検証（テスト用UI `/test-agent` の作成）。

## フェーズ 3: ユーザープロフィールとの統合
- [x] タスク: プロフィール入力 UI の拡張
  - 身長、体重、年齢、活動レベルなどの入力フォームを作成/更新 (`src/components/profile-form.tsx`)。
- [x] タスク: Agent 呼び出し API の実装
  - Next.js Server Actions または API Route 経由で ADK エージェントを実行するエンドポイント。
- [x] タスク: 結果の保存
  - 計算された栄養目標を Firestore の `users` コレクションに保存するロジック。

## フェーズ 4: UI 表示と確認
- [x] タスク: 目標栄養素の表示
  - プロフィールまたはホーム画面に、計算された目標値（カロリー/PFC）を表示するコンポーネント。
- [x] タスク: Conductor - 手動確認 "Nutrition Planner Agent" (詳細は workflow.md 参照)
