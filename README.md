# FaveFit - Agentic Meal Planner

[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/)
[![Gemini](https://img.shields.io/badge/Gemini%20AI-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**FaveFit** は、Google Gemini API を活用した、**Agentic AI（自律型エージェント）によるパーソナライズ食事プランニングアプリケーション**です。

単なるレシピ提案に留まらず、ユーザーの生活習慣の分析、栄養目標の策定、そして「食材の使い回し」までを考慮した1週間分の食事計画を、複数のAIエージェントが連携して自律的に生成します。

## 🌟 プロジェクトの目的（解決したい課題）

健康的な食生活を維持するには、「栄養バランス」「個人の好み」「コスト・手間の効率化」という相反する要素を同時に満たす必要があります。
- **課題1**: 自分の目標（減量・筋肥大等）に最適な栄養計算が難しい。
- **課題2**: 毎日違うものを作るのは大変だが、同じものばかりでは飽きる。
- **課題3**: 食材を余らせてしまうフードロスの問題。

FaveFitは、AIエージェントが「パーソナル栄養士」兼「チーフシェフ」として振る舞うことで、これらの課題を解決します。

## 🚀 主な機能

- 🍱 **自律型食事プラン生成**: 7日間の朝・昼・晩（＋間食）の献立を自動作成。
- ⚖️ **適応型栄養プランニング**: 現在の食習慣をAIが分析し、無理のない改善案（アダプティブ・ディレクティブ）を提示。
- 🛒 **食材効率化（Ingredient Pool）**: 数日単位で食材を使い回す「食材プール」をAIが計画し、買い物リストを最適化。
- 🔄 **インタラクティブ調整**: 「夜は軽くしたい」「冷蔵庫に余っている卵を使いたい」といった個別要望に即座に対応。
- 📱 **PWA (Progressive Web App) 対応**: スマホのホーム画面に追加して、ネイティブアプリのように利用可能。
- 📊 **マクロ管理**: カロリー、タンパク質、脂質、炭水化物のバランスをリアルタイムで視覚化。

## 🤖 Agentic AI アーキテクチャ

本プロジェクトの核となるのは、**マルチエージェント・オーケストレーション**による2段階生成パイプラインです。

### 1. Analysis & Directive Phase (分析・指示フェーズ)
- **Diet Estimator Agent**: ユーザーの現在の食生活を分析し、ベースラインを推定。
- **Adaptive Planner**: 目標と現状のギャップを埋めるための具体的な「戦略（指示）」を策定します。

### 2. Two-Stage Generation (2段階生成プロセス)
Gemini API の高い推論能力を活かし、以下のステップでプランを具体化します。
- **Phase 1: Skeleton Generation**: 1週間分の献立の「骨組み」と、食材を効率よく使い回すための「食材プール」を策定。
- **Phase 2: Detail Worker (Parallel)**: 策定された食材プールに基づき、具体的なレシピ（材料・手順）をチャンク単位で並列生成。

これにより、一貫性（食材の使い回し）と詳細さ（正確なレシピ）を両立させています。

## 🛠 技術スタック

- **AI SDK**: `@google/genai` (Google Generative AI SDK)
- **Model**: Gemini 2.5 Flash / Gemini 3 Flash Preview(用途に応じて使い分け)
- **Framework**: Next.js 16 (App Router), TypeScript
- **Backend/BaaS**: Firebase (Firestore, Authentication)
- **Styling**: Tailwind CSS, Radix UI (Lucide Icons)
- **Validation**: Zod (Structured Output の定義に使用)

## 📦 セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/your-repo/favefit.git
cd favefit
```

### 2. パッケージのインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.local` ファイルを作成し、以下の情報を入力してください。

```env
# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. 起動
```bash
npm run dev
```

## 📱 モバイルでの利用方法 (PWA)

FaveFit は PWA に対応しており、スマホのホーム画面に追加してアプリとして利用できます。

### Android (Chrome)
1. Chrome ブラウザでアプリの URL にアクセスします。
2. ブラウザメニュー（右上の「︙」）をタップします。
3. **「アプリをインストール」** または **「ホーム画面に追加」** をタップします。

### iOS (Safari)
1. Safari ブラウザでアプリの URL にアクセスします。
2. 画面下部の **共有ボタン**（上向き矢印のアイコン）をタップします。
3. メニューを下にスクロールし、**「ホーム画面に追加」** をタップします。

## 📈 今後の展望 (Roadmap)

- **マルチモーダル連携**: 冷蔵庫の中身を写真で撮るだけで、欠けている食材を考慮したプラン修正。
- **ECサイト連携**: 生成された買い物リストをワンクリックでネットスーパーのカートに追加。
- **ウェアラブル同期**: Google Fit 等と連携し、その日の消費カロリーに応じた夕食の動的調整。

---
Created for **Google Cloud Japan AI Hackathon Vol. 4**
