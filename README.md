# FaveFit

AIパワーを活用した食事プランニングアプリケーション。Vercel AI SDKとGoogle Geminiを使用して、ユーザーの栄養目標と好みに基づいた食事プラン（デフォルト7日間）を自動生成します。

## 特徴

- 🍱 **柔軟な献立調整**: 朝・昼・夕の各スロットの固定や、「夜は軽く」といった個別制約に対応
- ⚖️ **マクロの自動補填**: 特定の食事が制限された場合、AIが他の食事で栄養バランスを自動調整
- 🤖 **AIワークフロー駆動**: 専門エージェントによる多段階プロセスで、精度の高い献立とレシピを生成
- 🛒 **買い物リストの自動生成**: 生成されたプランに基づき、買い物リストを自動で集約
- 🎯 **パーソナライズ**: ユーザーの身体データや嗜好を学習し、最適な食事を提案

## クイックスタート

### 1. インストール

```bash
git clone https://github.com/your-repo/favefit.git
cd favefit
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の情報を設定してください：

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key

# Langfuse (Optional)
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて利用を開始できます。

## 主要機能

### 食事プラン生成
ユーザーの身長、体重、活動量、および減量・増量目標に合わせて1週間分のプランを作成します。特定の時間帯のメニューを固定したり、特別な要望（「夕食はフルーツのみ」など）を反映させることが可能です。

### レシピ閲覧・調整
各献立の具体的なレシピ（材料、手順）を確認できます。冷蔵庫にある食材を伝えて、メニューの一部を調整する機能も備えています。

### 買い物リスト
作成されたプランの全レシピから必要な食材を自動抽出し、項目別に整理された買い物リストを生成します。

## プロジェクト構造

```text
src/
├── ai/          # AIエージェントとワークフローのロジック
├── app/         # Next.js App Router ページとAPI
├── components/  # React UI コンポーネント
├── lib/         # Firestoreリポジトリ、共通サービス、計算ユーティリティ
└── types/       # TypeScript 型定義
```

## ライセンス

MIT License
