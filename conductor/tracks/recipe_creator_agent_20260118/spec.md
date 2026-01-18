# Track Spec: Recipe Creator Agent

## 概要
ユーザーの現在の「気分」と、プロフィールに保存された「目標栄養素（カロリー/PFC）」に基づき、Gemini API を使用してパーソナライズされたレシピを生成・提示するエージェントを実装する。

## 目標
- Google ADK を使用して、構造化されたレシピデータ（JSON）を返すエージェントを構築する。
- ユーザーの「気分（ガッツリ、ヘルシー、甘いもの等）」を考慮したメニュー提案。
- プロフィールに設定された1日の栄養目標（の1食分相当）に合致するレシピ生成。

## ユーザーフロー
1. ユーザーがホーム画面で「今日の気分」を選択。
2. アプリがユーザーのプロフィール（目標栄養素）を取得。
3. Recipe Creator Agent が呼び出され、レシピを生成。
4. 生成されたレシピ（タイトル、材料、手順、栄養価）を画面に表示。

## 技術的要件
- **Agent Framework:** Google ADK (@google/adk)
- **Model:** `gemini-2.5-flash` (プロジェクト標準)
- **Output Schema:** 以下のフィールドを含む JSON
  - `title`: レシピ名
  - `description`: レシピの短い説明
  - `ingredients`: 材料リスト（名前、分量）
  - `instructions`: 調理手順（ステップ形式）
  - `nutrition`: このレシピの栄養価（Calories, Protein, Fat, Carbs）
  - `cookingTime`: 推定調理時間
