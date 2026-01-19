# 🍽️ FaveFit - AI駆動型ダイエット支援アプリ

<div align="center">

**「好きな食材で、楽しく美味しく痩せる」**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Google ADK](https://img.shields.io/badge/Google_ADK-0.2.4-4285F4)](https://github.com/google/adk)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash_Lite-4285F4)](https://ai.google.dev/)

</div>

---

## 🏆 ハッカソン提出作品

**Google Cloud Japan AI Hackathon Vol.4** 提出作品

- **デモURL**: `https://favefit-xxx.run.app` _(デプロイ後に更新予定)_
- **Zenn記事**: `https://zenn.dev/xxx/articles/xxx` _(執筆後に更新予定)_
- **GitHubリポジトリ**: [akihiro4321/favefit](https://github.com/akihiro4321/favefit)

---

## 📖 プロジェクト概要

### コンセプト

従来のダイエットアプリは「カロリー記録」が面倒で続かない。FaveFitは発想を逆転させました。

❌ **従来**: 食べたものを記録 → カロリー計算 → 制限
✅ **FaveFit**: 食べたいものを入力 → AIが自動計算 → 最適なレシピ提案

### 解決する課題

**「ダイエットは続かない」問題**

| 従来のアプローチ | 問題点 |
|-----------------|--------|
| カロリー計算中心 | 数字に追われてストレス |
| 食事記録が面倒 | 毎食の入力が負担 |
| 「食べてはいけない」思考 | 我慢が続かず挫折 |
| 画一的なレシピ提案 | 好みに合わず作る気にならない |

### FaveFitの革新性

1. **入力の逆転**: 「記録」から「希望」へのパラダイムシフト
2. **ポジティブアプローチ**: 制限ではなく、好みを活かす
3. **学習するAI**: 使うほど自分好みに進化する体験

---

## ✨ 主な機能

### 1. 🤖 マルチエージェント型レシピ生成

3つの専門AIエージェントが連携してパーソナライズ：

- **Nutrition Planner Agent**: 科学的根拠に基づく栄養計画
  - Mifflin-St Jeor式でBMR（基礎代謝）を計算
  - 活動レベルを考慮したTDEE（総消費カロリー）算出
  - 目標に応じたPFCバランス（タンパク質/脂質/炭水化物）の配分

- **Recipe Creator Agent**: 気分に合わせたレシピ生成
  - ユーザーの「今日の気分」（ジャンル・味・気分）を反映
  - 好きな食材の積極活用、嫌いな食材/アレルギーの除外
  - **時短・簡単レシピ優先**（15-20分以内）
  - 栄養目標（カロリー・PFC）を満たす食材選定

- **Preference Learner Agent**: フィードバックループで継続的学習
  - ユーザーの評価とコメントを分析
  - レシピ特徴（ジャンル、味、食材）と評価を関連付け
  - 好みパターンを数値化してプロファイルを更新

### 2. 🎯 3つのコアバリュー

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  好きな食材登録   │ →  │  今日の気分入力   │ →  │ 感想フィードバック│
│  (長期的な好み)   │     │  (短期的な気分)   │     │   (学習データ)    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 16.1.3** (App Router) - React 19.2.3
- **TypeScript 5** - 型安全な開発
- **Tailwind CSS 4** + **shadcn/ui** - モダンなUI

### バックエンド & AI
- **Google ADK 0.2.4** (Agent Development Kit) - マルチエージェント構成
- **Gemini 2.5 Flash Lite** - 高速・低コストなAI処理
- **Firebase Auth** - Google + 匿名認証
- **Cloud Firestore** - NoSQLデータベース

### インフラ
- **Google Cloud Run** - フルサーバーレス構成（予定）

### 開発ツール
- **Vitest 4.0.17** - テストフレームワーク
- **ESLint 9** - コード品質管理

---

## 🏗️ アーキテクチャ

### マルチエージェント型設計

```
┌─────────────────────────────────────┐
│    Next.js Frontend (PWA)          │
│        on Cloud Run                │
└─────────────┬───────────────────────┘
              │ API Routes
              ▼
┌─────────────────────────────────────┐
│   Backend API (ADK TypeScript)     │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌──────────┐ ┌──────┐ ┌──────────┐
│Nutrition │ │Recipe│ │Preference│
│ Planner  │ │Creator│ │ Learner │
└────┬─────┘ └───┬──┘ └────┬─────┘
     └───────────┴─────────┘
                 │
                 ▼
         ┌──────────────┐
         │   Gemini     │
         │ 2.5 Flash    │
         │    Lite      │
         └──────────────┘
                 │
                 ▼
         ┌──────────────┐
         │  Firestore   │
         └──────────────┘
```

### ディレクトリ構造

```
favefit/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # ランディングページ
│   │   ├── home/                 # 気分入力 & レシピ生成
│   │   ├── profile/              # プロフィール設定
│   │   ├── recipes/              # レシピ一覧・詳細
│   │   └── api/
│   │       ├── test-agent/       # エージェント実行API
│   │       └── learn-preference/ # 好み学習API
│   ├── components/               # UIコンポーネント
│   │   ├── ui/                   # shadcn/ui コンポーネント
│   │   ├── mood-selector.tsx     # 気分選択UI
│   │   ├── feedback-form.tsx     # 感想入力フォーム
│   │   └── recipe-card.tsx       # レシピ表示カード
│   ├── lib/
│   │   ├── agents/               # AIエージェント定義
│   │   │   ├── nutrition-planner.ts
│   │   │   ├── recipe-creator.ts
│   │   │   └── preference-learner.ts
│   │   ├── firebase.ts           # Firebase初期化
│   │   ├── user.ts               # ユーザーデータ管理
│   │   ├── preference.ts         # 好みデータ管理
│   │   └── recipe.ts             # レシピデータ管理
│   └── types/
│       └── index.ts              # 型定義
├── conductor/                    # プロジェクト管理ドキュメント
│   ├── product.md                # プロダクト設計
│   ├── tech-stack.md             # 技術スタック詳細
│   └── tracks/                   # 開発トラック管理
└── spec.md                       # 詳細仕様書
```

---

## 🚀 セットアップ方法

### 前提条件

- Node.js 20以上
- npm または yarn
- Firebaseプロジェクト
- Google Cloud プロジェクト（Gemini API有効化）

### 1. 環境変数の設定

`.env.local` ファイルを作成して以下を設定：

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Cloud (for ADK)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

詳細な設定方法は `.env.example` を参照してください。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### 4. ビルド & 本番起動

```bash
npm run build
npm run start
```

---

## 🧪 テスト

```bash
# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# リント実行
npm run lint

# 型チェック
npx tsc --noEmit
```

---

## 📱 ユーザーフロー

### 1. オンボーディング → 栄養目標算出
```typescript
// ユーザーが身体情報を入力
const input = {
  age: 30, gender: 'male',
  height_cm: 175, weight_kg: 75,
  activity_level: 'moderate',
  goal: 'lose'
};

// Nutrition Planner Agent が実行される
// → { daily_calorie_target: 1800, protein_g: 135, ... }
```

### 2. 気分入力 → レシピ生成
```typescript
// 「今日の気分」を選択
const mood = {
  genre: '中華',
  tasteBalance: 70,  // こってり寄り
  freeText: '麻婆豆腐が食べたい'
};

// Recipe Creator Agent が好みプロファイルを自動考慮
// → { title: "10分で作る！ヘルシー麻婆豆腐", ... }
```

### 3. フィードバック → 好み学習
```typescript
// 感想を入力
const feedback = {
  ratings: { overall: 5, taste: 5, ease: 4, satisfaction: 5 },
  comment: 'ピリ辛で美味しかった！豆板醤を少し多めに入れた。'
};

// Preference Learner Agent が自動実行
// → learnedProfile が更新される
//    preferredFlavors: { "ピリ辛": 0.9 }
```

---

## 📊 プロジェクト管理

このプロジェクトは `conductor/` ディレクトリで体系的に管理されています：

- **product.md**: プロダクト設計とコンセプト
- **tech-stack.md**: 技術スタック詳細
- **tracks.md**: 開発トラックの進捗管理
- **tracks/**: 各フィーチャーの詳細な設計ドキュメント

---

## 🎯 技術的な強み

### 1. マルチエージェント型アーキテクチャ
責務の明確な分離により、保守性と拡張性を確保

### 2. 継続的な学習ループ
使うほど賢くなるパーソナライゼーション

### 3. 型安全性
TypeScript + Zod によるスキーマバリデーション

### 4. 高速・低コスト
Gemini 2.5 Flash Lite の採用により、リアルタイムインタラクションを実現

### 5. スケーラビリティ
Firestore + Cloud Run によるフルサーバーレス構成

---

## 🔮 将来的な拡張計画

- [ ] 📸 写真カロリー推定（Vertex AI Vision）
- [ ] 📅 1週間分レシピ提案
- [ ] 🛒 買い物リスト生成
- [ ] 📊 進捗トラッキング（体重推移グラフ）
- [ ] ⌚ ウェアラブル連携（Google Fit）
- [ ] ❤️ レシピお気に入り機能

---

## 🎨 スクリーンショット

_※デモ動画とスクリーンショットは執筆中_

---

## 🤝 貢献

このプロジェクトはハッカソン提出作品ですが、フィードバックやアイデアは大歓迎です！

---

## 📝 ライセンス

このプロジェクトは個人プロジェクトです。

---

## 👤 作成者

**akihiro4321**

- GitHub: [@akihiro4321](https://github.com/akihiro4321)

---

## 🙏 謝辞

- **Google Cloud Japan** - AI Hackathon Vol.4の開催
- **Google ADK Team** - 素晴らしいAgent Development Kitの提供
- **Gemini Team** - 高速で低コストなAIモデルの提供
- **Firebase Team** - シームレスな認証とデータベース基盤

---

<div align="center">

**好きな食材で、楽しく美味しく痩せる。**

Made with ❤️ and 🤖 AI

</div>
