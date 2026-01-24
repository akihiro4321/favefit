# FaveFit

AIエージェントベースの食事プランアプリケーション。Mastra v1.0を使用して、ユーザーの栄養目標と好みに基づいた14日間の食事プランを自動生成します。

## 特徴

- 🤖 **AIエージェント駆動**: Mastra v1.0を使用した複数の専門エージェントによる食事プラン生成
- 📊 **栄養管理**: BMR/TDEE計算に基づく最適な栄養目標の自動算出
- 🎯 **パーソナライズ**: ユーザーの好みを学習し、嗜好に合わせたレシピ提案
- 📝 **詳細なトレーサビリティ**: LangfuseによるAIモデルの動作監視と分析
- 🛒 **買い物リスト**: 自動生成された買い物リストと物価連動レシピ選定

## 技術スタック

- **フレームワーク**: Next.js 16.1.3
- **UI**: React 19.2.3, Tailwind CSS 4, Radix UI
- **AI/エージェント**: Mastra v1.0 (@mastra/core)
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication
- **可観測性**: Langfuse 3.38.6
- **言語**: TypeScript 5

## エージェント構成

| エージェント名 | 役割 | 使用シーン |
|---|---|---|
| **Nutrition Planner** | 栄養目標策定 | オンボーディング時、目標変更時 |
| **Plan Generator** | 14日間計画構築 | プラン作成、一括再生成、飽き防止 |
| **Recipe Creator** | レシピ詳細生成 | レシピ詳細の生成 |
| **Menu Adjuster** | 臨機応変な提案 | 冷蔵庫食材からの提案、個別差し替え |
| **Preference Learner** | ユーザー嗜好学習 | 食事完了後のフィードバック取得 |
| **Boredom Analyzer** | 飽き度分析 | プランリフレッシュ時の分析 |

## セットアップ

### 必要な環境

- Node.js 20以上
- npm, yarn, pnpm, または bun
- Firebase プロジェクト
- Langfuse アカウント（オプション）

### インストール

```bash
# 依存関係のインストール
npm install
# または
yarn install
# または
pnpm install
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

# Langfuse (オプション - AIトレーサビリティ用)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## Langfuse統合

FaveFitはMastraのLangfuseExporterを使用してAIエージェントの動作を自動的にトレースしています。これにより、以下の情報をLangfuse上で確認できます：

- **トレース全体**: 各エージェント呼び出しの入力と出力
- **LLM呼び出し**: プロンプト、レスポンス、トークン使用量
- **ツール呼び出し**: ツール名、引数、レスポンス
- **イベント階層**: エージェントの実行フロー

### 設定

`src/mastra/index.ts`でLangfuseExporterが設定されています：

```typescript
import { LangfuseExporter } from "@mastra/langfuse";

export const mastra = new Mastra({
  agents: { /* ... */ },
  observability: {
    exporters: [
      new LangfuseExporter({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
        secretKey: process.env.LANGFUSE_SECRET_KEY!,
        baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
      }),
    ],
  },
});
```

Mastraが自動的にすべてのエージェント実行をトレースするため、手動でのトレース実装は不要です。

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   └── [pages]/          # ページコンポーネント
├── components/            # Reactコンポーネント
│   └── ui/               # UIコンポーネント（Radix UI）
├── lib/
│   ├── services/         # ビジネスロジック
│   ├── tools/            # エージェント用ツール
│   └── ...
├── mastra/               # Mastraエージェント定義
│   ├── agents/           # エージェント定義
│   ├── tools/             # エージェント用ツール
│   └── index.ts          # Mastraインスタンス設定
└── types/                # TypeScript型定義
```

## 主要機能

### 栄養目標計算
- BMR/TDEE計算に基づく自動栄養目標算出
- 目標（減量/維持/増量）に応じたカロリー調整
- PFC（タンパク質/脂質/炭水化物）の最適配分

### 14日間プラン生成
- 栄養目標、好み、物価を考慮した42食分の自動生成
- チートデイの自動配置
- 飽き防止機能による自動リフレッシュ

### レシピ提案
- 冷蔵庫食材からのレシピ提案
- コメント付き再提案（「もっと辛く」など）
- レシピ履歴管理とお気に入り機能

### 買い物リスト
- 週単位・カテゴリ別の自動生成
- 物価連動レシピ選定

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

## デプロイ

### Vercel

最も簡単なデプロイ方法は[Vercel Platform](https://vercel.com/new)を使用することです。

詳細は[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)を参照してください。

### Firebase

Firebase Hostingを使用する場合：

```bash
npm run build
firebase deploy
```

## ライセンス

このプロジェクトはプライベートプロジェクトです。

## 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [Mastra Documentation](https://mastra.ai/docs)
- [Langfuse Documentation](https://langfuse.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
