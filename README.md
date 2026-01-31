# FaveFit

AIパワーを活用した食事プランニングアプリケーション。Vercel AI SDKとGoogle Geminiを使用して、ユーザーの栄養目標と好みに基づいた食事プラン（デフォルト7日間）を自動生成します。

## 特徴

- 🤖 **AIワークフロー駆動**: Vercel AI SDKを使用した専門エージェントによる柔軟な食事プラン生成
- 📊 **栄養管理**: BMR/TDEE計算に基づく最適な栄養目標の自動算出
- 🎯 **パーソナライズ**: ユーザーの好みを学習し、嗜好に合わせたレシピ提案
- 📝 **詳細なトレーサビリティ**: LangfuseによるAIモデルの動作監視と分析
- 🛒 **買い物リスト**: 自動生成された買い物リストと物価を考慮した食材選定

## 技術スタック

- **フレームワーク**: Next.js 16.1.3 (App Router)
- **UI**: React 19.2.3, Tailwind CSS 3.4, Radix UI (shadcn/ui compatible)
- **AIエンジン**: Vercel AI SDK (`ai`), `@ai-sdk/google`
- **LLM**: Google Gemini Flash Latest
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication
- **可観測性**: Langfuse 3.38.6
- **言語**: TypeScript 5

## エージェント構成

コアとなるAIロジックは `src/ai/` に集約されています。

| エージェント名 | 役割 | 使用シーン |
| --- | --- | --- |
| **Nutrition Planner** | 栄養目標策定 | オンボーディング時、目標変更時 |
| **Plan Generator** | 計画構築 | プラン作成、一括再生成 |
| **Recipe Creator** | レシピ詳細生成 | レシピ詳細（材料・手順）の生成 |
| **Menu Adjuster** | 臨機応変な提案 | 冷蔵庫食材からの提案、個別差し替え |
| **Preference Learner** | ユーザー嗜好学習 | プラン却下時のフィードバック等からの学習 |
| **Boredom Analyzer** | 飽き度分析 | プランの多様性分析 |

## セットアップ

### 必要な環境

- Node.js 20以上
- npm, yarn, pnpm, または bun
- Firebase プロジェクト
- Google Gemini API キー
- Langfuse アカウント（オプション）

### インストール

```bash
# 依存関係のインストール
npm install
```

### 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Langfuse (AIトレーサビリティ用)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## プロジェクト構造

```text
src/
├── ai/                    # AIロジック (Agents, Workflows, Tools)
├── app/                   # Next.js App Router (Pages & API Routes)
├── components/            # Reactコンポーネント
├── lib/
│   ├── db/               # データベースクライアント・リポジトリ
│   ├── services/         # ビジネスロジック
│   └── tools/            # ユーティリティ計算ツール
└── types/                 # TypeScript型定義
```

## 主要機能

### 栄養目標計算

- BMR/TDEE計算に基づく自動栄養目標算出
- 目標（減量/維持/増量）に応じたカロリー調整
- PFC（タンパク質/脂質/炭水化物）の最適配分

### 食事プラン生成

- 栄養目標、好み、物価を考慮した最大14日間の自動生成（現在は7日間がデフォルト）
- チートデイの自動配置
- AIワークフローによる栄養素の自動バリデーションと修正

### レシピ提案・管理

- 冷蔵庫食材を活用したメニュー調整
- 詳細な調理手順と分量の生成
- メニューの個別差し替え機能

### 買い物リスト

- プランに基づいた食材の自動集計
- カテゴリ別の整理機能

## 開発

### ビルド

```bash
npm run build
```

### リント

```bash
npm run lint
```

### テスト

```bash
npm test
```
