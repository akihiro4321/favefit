# FaveFit 基本設計書

## 1. プロジェクト概要

### 1.1 アプリ名
**FaveFit** - Favorite（お気に入り）+ Fit（フィットネス）

### 1.2 コンセプト
「好きな食材で、楽しく美味しく痩せる」ダイエット支援アプリ

従来のカロリー制限型ダイエットアプリとは異なり、ユーザーの好みを最大限活かしながら、無理なく継続できるダイエットを支援する。

### 1.3 ターゲットユーザー
- ある程度の自炊経験がある人
- 見た目改善を目的としたダイエット志向
- 食事制限に挫折した経験がある人

### 1.4 コアバリュー
1. **好きな食材を登録** → ベースの好み（長期的）
2. **今日食べたいものを入力** → その日の気分（短期的）
3. **感想フィードバック** → 学習データ（蓄積型）

この3つの入力を組み合わせ、AIがパーソナライズされたダイエットレシピを提案する。

---

## 2. 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| Frontend | Next.js 16 (App Router) + PWA | Turbopackデフォルト、`next-pwa`でPWA化 |
| UI | Tailwind CSS + shadcn/ui | ユーティリティCSS + コピペ可能なUIコンポーネント |
| Backend | ADK TypeScript on Cloud Run | マルチエージェント |
| AI Model | Gemini 2.5 Flash | コスト効率・高速 |
| Database | Firestore | ユーザーデータ・感想履歴 |
| Auth | Firebase Auth | Google/メール認証 |
| Storage | Cloud Storage | （Future: 写真保存用） |

### 2.1 Google Cloud 必須要件への対応

| 必須要件 | 採用技術 |
|---------|---------|
| アプリケーション実行プロダクト | Cloud Run |
| AI技術 | Gemini API, ADK (Agent Development Kit) |

---

## 3. システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (PWA)                        │
│                   Next.js on Cloud Run                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Cloud Run)                   │
│                     ADK TypeScript                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ Nutrition  │  │   Recipe   │  │ Preference │
   │  Planner   │  │  Creator   │  │  Learner   │
   │   Agent    │  │   Agent    │  │   Agent    │
   └────────────┘  └────────────┘  └────────────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Gemini   │
                    │ 2.0 Flash│
                    └──────────┘
                          │
                          ▼
                   ┌────────────┐
                   │ Firestore  │
                   │ユーザーデータ│
                   └────────────┘
```

---

## 4. エージェント設計

### 4.1 エージェント一覧

| エージェント | 役割 | 入力 | 出力 |
|-------------|------|------|------|
| **Nutrition Planner** | 目標設定・カロリー計算・PFC配分 | 目標体重、期間、身体情報 | カロリー/PFC目標、計画 |
| **Recipe Creator** | 栄養目標を満たすレシピ生成 | 好き食材、栄養目標、今日の気分、好みプロファイル | レシピ（材料・手順・栄養情報） |
| **Preference Learner** | 感想分析・好み抽出・プロファイル更新 | フィードバック、レシピ情報 | 分析タグ、更新済みプロファイル |

### 4.2 Nutrition Planner Agent

**責務**
- 現在体重・目標体重・期間から1日の目標カロリーを計算
- 活動量を考慮した基礎代謝計算（Mifflin-St Jeor式）
- PFCバランス（タンパク質/脂質/炭水化物）の配分決定
- 週単位での減量ペース調整

**出力例**
```json
{
  "dailyCalorieTarget": 1800,
  "targetPfc": {
    "protein": 135,
    "fat": 50,
    "carbs": 200
  },
  "weeklyDeficit": 3500,
  "estimatedWeeklyLoss": 0.5,
  "targetDate": "2025-04-15"
}
```

### 4.3 Recipe Creator Agent

**責務**
- 栄養目標を満たすレシピのAI生成
- 好きな食材の積極活用
- 「今日の気分」の反映
- 過去の好みプロファイルに基づく調整

**入力コンテキスト**
```
- 好きな食材: 鶏肉, ブロッコリー, 卵
- 嫌いな食材: セロリ
- 今日の気分: 中華, ピリ辛, パパッと時短
- 栄養目標: 600kcal, P:45g, F:17g, C:67g（昼食分）
- 好みプロファイル: 
  - 好むジャンル: 中華(0.8), 和食(0.6)
  - 好む味付け: ピリ辛(0.9)
  - 避けるパターン: 長時間調理(0.7)
```

### 4.4 Preference Learner Agent

**責務**
- 感想フィードバックの解釈・分析
- レシピの特徴と評価の関連付け
- 好みパターンの抽出
- learnedProfile の更新

**処理フロー**
1. フィードバック入力時に即時分析
2. レシピの特徴（ジャンル、味、食材等）と評価を紐付け
3. Geminiで好みパターンを抽出
4. スコア付きでプロファイルを更新（指数移動平均）

**学習後プロファイル例**
```json
{
  "preferredCuisines": {"中華": 0.82, "和食": 0.65},
  "preferredFlavors": {"ピリ辛": 0.90, "さっぱり": 0.55},
  "preferredIngredients": {"鶏肉": 0.85, "卵": 0.72},
  "avoidPatterns": {"長時間調理": 0.70, "複雑な手順": 0.60},
  "totalFeedbacks": 12,
  "lastUpdated": "2025-02-01T10:00:00Z"
}
```

---

## 5. データベース設計（Firestore）

### 5.1 コレクション構造

```
firestore/
├── users/
│   └── {userId}/
│       ├── (ドキュメントフィールド: profile情報)
│       ├── preferences/
│       │   └── main
│       ├── dietPlans/
│       │   └── {planId}
│       ├── recipes/
│       │   └── {recipeId}
│       ├── feedbacks/
│       │   └── {feedbackId}
│       └── tasteLogs/
│           └── {logId}
│
└── masterData/
    ├── cuisineTypes
    ├── flavorTags
    └── cookingStyles
```

### 5.2 スキーマ定義

#### users/{userId}

```typescript
interface User {
  // 基本情報
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 身体情報
  currentWeight: number;        // 現在体重 (kg)
  targetWeight: number;         // 目標体重 (kg)
  height: number;               // 身長 (cm)
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'low' | 'moderate' | 'high';
  
  // 計算済み目標
  dailyCalorieTarget: number;
  targetPfc: {
    protein: number;
    fat: number;
    carbs: number;
  };
  targetDate: Timestamp;
  
  // オンボーディング状態
  onboardingCompleted: boolean;
}
```

#### preferences/main

```typescript
interface Preference {
  id: string;
  userId: string;
  updatedAt: Timestamp;
  
  // 好きな食材
  favoriteIngredients: string[];
  
  // 嫌いな食材・アレルギー
  dislikedIngredients: string[];
  allergies: string[];
  
  // 調理環境
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  availableTime: 'short' | 'medium' | 'long';
  
  // AI学習済みプロファイル
  learnedProfile: {
    preferredCuisines: { [cuisine: string]: number };
    preferredFlavors: { [flavor: string]: number };
    preferredIngredients: { [ingredient: string]: number };
    preferredStyles: { [style: string]: number };
    avoidPatterns: { [pattern: string]: number };
    totalFeedbacks: number;
    updatedAt: Timestamp;
  };
}
```

#### recipes/{recipeId}

```typescript
interface Recipe {
  id: string;
  userId: string;
  createdAt: Timestamp;
  
  // レシピ情報
  title: string;
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  
  // 材料
  ingredients: {
    name: string;
    amount: string;
    unit: string;
    calories: number;
  }[];
  
  // 手順
  steps: {
    order: number;
    instruction: string;
    duration?: number;
  }[];
  
  // 栄養情報
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  
  // メタ情報
  cuisineType: string;
  flavorTags: string[];
  cookingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  
  // 生成コンテキスト
  generationContext: {
    tasteLogId?: string;
    requestText?: string;
  };
  
  feedbackId?: string;
}
```

#### feedbacks/{feedbackId}

```typescript
interface Feedback {
  id: string;
  userId: string;
  recipeId: string;
  createdAt: Timestamp;
  
  cooked: boolean;
  
  ratings: {
    overall: number;      // 1-5
    taste: number;        // 1-5
    ease: number;         // 1-5
    satisfaction: number; // 1-5
  };
  
  repeatPreference: 'definitely' | 'sometimes' | 'never';
  comment?: string;
  
  // AI分析結果
  analyzedTags?: {
    positiveTags: string[];
    negativeTags: string[];
    extractedPreferences: string[];
  };
}
```

#### tasteLogs/{logId}

```typescript
interface TasteLog {
  id: string;
  userId: string;
  createdAt: Timestamp;
  date: string;  // "2025-01-16"
  
  selectedCuisines: string[];
  selectedFlavors: string[];
  selectedStyles: string[];
  freeRequest?: string;
  
  generatedRecipeIds: string[];
}
```

---

## 6. 画面設計

### 6.1 画面一覧

| # | 画面名 | 概要 |
|---|--------|------|
| 1 | ログイン | Firebase Auth（Google/メール） |
| 2 | オンボーディング - 目標設定 | 体重・目標・期間入力 |
| 3 | オンボーディング - 食材登録 | 好き/嫌い食材、アレルギー |
| 4 | ダイエット計画表示 | カロリー・PFC目標確認 |
| 5 | ホーム（今日の気分入力） | ジャンル・味・スタイル選択 |
| 6 | レシピ一覧 | 朝・昼・夜の提案レシピ |
| 7 | レシピ詳細 | 材料・手順・栄養情報 |
| 8 | 感想入力 | 評価・コメント入力 |
| 9 | 設定 | プロフィール編集、好み変更 |

### 6.2 画面フロー

```
[初回起動]
    │
    ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│目標設定 │───▶│食材登録 │───▶│計画表示 │
└─────────┘    └─────────┘    └─────────┘
                                   │
                                   ▼
                             ┌─────────┐
                             │ホーム   │◀─────────┐
                             │(今日の  │          │
                             │ 気分)   │          │
                             └────┬────┘          │
                                  │               │
                    ┌─────────────┼───────────────┤
                    ▼             ▼               │
              ┌─────────┐   ┌─────────┐          │
              │レシピ   │   │感想入力 │──────────┘
              │詳細     │   └─────────┘
              └─────────┘
```

### 6.3 「今日の気分」入力UI

```
┌─────────────────────────────────────────────────────────┐
│            今日はどんな気分？                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  【ジャンル】                                           │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ 和食 │ │ 中華 │ │ 洋食 │ │ 韓国 │ │ その他│              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                         │
│  【味の気分】                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ さっぱり  │ │ こってり  │ │ ピリ辛   │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 甘め     │ │ 塩系     │ │ 酸味     │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
│  【調理スタイル】                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ パパッと  │ │ じっくり  │ │ 作り置き │               │
│  │ 時短     │ │ 本格派   │ │ OK      │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
│  【最近気になるもの・リクエスト】                       │
│  ┌─────────────────────────────────────────────┐       │
│  │ 例：麻婆豆腐、サラダチキン、ガパオライス    │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  💡 あなたへのおすすめタグ（過去の好みから）           │
│  ┌────────┐ ┌──────────┐ ┌────────┐                   │
│  │ 鶏肉系  │ │ 野菜たっぷり│ │ 丼もの │                   │
│  └────────┘ └──────────┘ └────────┘                   │
│                                                         │
│              [この条件でレシピを見る]                   │
└─────────────────────────────────────────────────────────┘
```

### 6.4 感想フィードバックUI

```
┌─────────────────────────────────────────┐
│         レシピ感想入力                  │
├─────────────────────────────────────────┤
│                                         │
│  作りましたか？  [はい] [いいえ]        │
│                                         │
│  ──────────────────────────────         │
│  総合評価        ★★★★☆ (4/5)          │
│                                         │
│  味の好み        ★★★★★ (5/5)          │
│  作りやすさ      ★★★☆☆ (3/5)          │
│  満足感          ★★★★☆ (4/5)          │
│                                         │
│  また作りたい？  [ぜひ] [たまに] [もういい] │
│                                         │
│  コメント（任意）                       │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│           [保存する]                    │
└─────────────────────────────────────────┘
```

---

## 7. MVP機能スコープ

### 7.1 MVP（2025/2/15まで）

| # | 機能 | 詳細 |
|---|------|------|
| 1 | ユーザー登録・認証 | Firebase Auth（Google認証） |
| 2 | オンボーディング | 目標設定、好き食材登録 |
| 3 | ダイエット計画生成 | Nutrition Planner による目標計算 |
| 4 | 今日の気分入力 | ジャンル・味・スタイル選択 + フリーテキスト |
| 5 | レシピ提案（3食分） | Recipe Creator によるAI生成 |
| 6 | レシピ詳細表示 | 材料・手順・栄養情報 |
| 7 | 感想フィードバック | 評価・コメント入力 |
| 8 | 好みプロファイル学習 | Preference Learner による分析・蓄積 |
| 9 | おすすめタグ表示 | 学習結果を「今日の気分」画面に反映 |

### 7.2 Future（MVP後）

| # | 機能 | 詳細 |
|---|------|------|
| 1 | 写真カロリー推定 | Vertex AI Vision で食事写真を分析 |
| 2 | 1週間分レシピ提案 | まとめて献立を生成 |
| 3 | 買い物リスト生成 | レシピから材料を自動抽出 |
| 4 | 進捗トラッキング | 体重推移グラフ |
| 5 | ウェアラブル連携 | Google Fit との連携 |
| 6 | レシピお気に入り | 保存・履歴機能 |

---

## 8. 開発スケジュール

```
Week 1 (1/16-1/22): 基盤構築
├── プロジェクトセットアップ（Next.js + ADK）
├── Firestore スキーマ設計
├── Firebase Auth 導入
└── 基本UI（オンボーディング画面）

Week 2 (1/23-1/29): コア機能①
├── Nutrition Planner Agent 実装
├── 目標設定 → 計画生成フロー
├── 好きな食材登録UI
└── Firestoreへのデータ保存

Week 3 (1/30-2/5): コア機能②
├── Recipe Creator Agent 実装
├── 「今日の気分」入力UI
├── レシピ提案画面
└── レシピ詳細表示

Week 4 (2/6-2/12): パーソナライズ & 仕上げ
├── Preference Learner Agent 実装
├── 感想フィードバック機能
├── 過去の好みを反映したレシピ提案
└── UI/UXブラッシュアップ

Week 5 (2/13-2/15): 提出準備
├── Cloud Run デプロイ
├── デモ動画撮影（3分）
├── Zenn記事執筆
└── 最終テスト & 提出
```

---

## 9. 提出物チェックリスト

| # | 提出物 | 状態 |
|---|--------|------|
| 1 | GitHubリポジトリ（公開） | ☐ |
| 2 | デプロイURL（Cloud Run） | ☐ |
| 3 | Zenn記事（トピック: gch4） | ☐ |
| 4 | デモ動画（3分、YouTube） | ☐ |
| 5 | システムアーキテクチャ図 | ☐ |

---

## 10. 技術要件チェックリスト

### 10.1 必須要件

#### (必須) Google Cloud アプリケーション実行プロダクト

| プロダクト | 使用 | 用途 |
|-----------|:----:|------|
| App Engine | ☐ | - |
| Google Compute Engine | ☐ | - |
| Google Kubernetes Engine (GKE) | ☐ | - |
| **Cloud Run** | ✅ | Frontend (Next.js) + Backend (ADK) のホスティング |
| Cloud Functions | ☐ | - |
| Cloud TPU / GPU | ☐ | - |

#### (必須) Google Cloud AI 技術

| プロダクト | 使用 | 用途 |
|-----------|:----:|------|
| Vertex AI | ☐ | （将来的にVertex AI経由のGemini利用を検討） |
| **Gemini API** | ✅ | レシピ生成、感想分析、好みプロファイル学習 |
| Gemma | ☐ | - |
| Imagen | ☐ | - |
| Agent Builder | ☐ | - |
| **ADK (Agents Development Kit)** | ✅ | マルチエージェント構成（3エージェント） |
| Speech-to-Text / Text-to-Speech API | ☐ | - |
| Vision AI API | ☐ | （Future: 写真カロリー推定で使用予定） |
| Natural Language AI API | ☐ | - |
| Translation AI API | ☐ | - |

### 10.2 任意要件

| プロダクト | 使用 | 用途 |
|-----------|:----:|------|
| Flutter | ☐ | - |
| **Firebase** | ✅ | Firebase Auth（認証）、Firestore（データベース） |
| Veo | ☐ | - |

### 10.3 技術要件サマリ

```
【必須】アプリケーション実行: Cloud Run ✅
【必須】AI技術: Gemini API ✅ + ADK ✅
【任意】その他: Firebase ✅
```

---

## 11. 審査基準への対応

### 11.1 課題の新規性

> 多くの人が抱えていて、いまだに解決策が与えられていない課題を発見したプロジェクトを評価します。

#### 発見した課題

**「ダイエットは続かない」問題**

従来のダイエットアプリは「カロリー制限」「食事記録」に焦点を当てており、以下の問題を抱えている：

| 従来のアプローチ | 問題点 |
|-----------------|--------|
| カロリー計算中心 | 数字に追われてストレスになる |
| 食事記録が面倒 | 毎食の入力が負担で続かない |
| 「食べてはいけない」思考 | 我慢が続かず挫折 |
| 画一的なレシピ提案 | 好みに合わず作る気にならない |

#### FaveFitが解決する課題

**「好きなものを我慢せずに痩せたい」**

- ダイエットの継続率が低い根本原因は「我慢」と「面倒さ」
- 好きな食材でダイエットできれば、食事が楽しみになる
- パーソナライズにより「自分のためのレシピ」という当事者意識が生まれる

#### 新規性のポイント

1. **入力の逆転**: 「食べたものを記録」→「食べたいものを入力」
2. **ポジティブアプローチ**: 「制限」→「好みを活かす」
3. **学習するAI**: 使うほど自分好みになる体験

---

### 11.2 解決策の有効性

> 提案されたソリューションがその中心となる課題に効果的に対処し、解決しているかを評価します。

#### 課題と解決策のマッピング

| 課題 | FaveFitの解決策 | 有効性 |
|------|----------------|--------|
| カロリー計算が面倒 | AIが栄養計算を自動化、ユーザーは数字を意識しなくていい | ✅ 認知負荷を軽減 |
| 好みに合わないレシピ | 好きな食材を登録 → 好みベースで提案 | ✅ 当事者意識が生まれる |
| 毎日の献立を考えるのが大変 | 「今日の気分」を選ぶだけでレシピ提案 | ✅ 意思決定コストを削減 |
| 同じレシピばかりで飽きる | 感想フィードバックで好みを学習、提案が進化 | ✅ 継続利用のモチベーション |
| ダイエット知識がない | AIが目標から逆算してPFC計算 | ✅ 専門知識不要で始められる |

#### ユーザージャーニーでの有効性

```
【従来のアプリ】
起床 → 朝食記録(面倒) → 昼食記録(面倒) → カロリーオーバー通知(ストレス) → 挫折

【FaveFit】
起床 → 「今日は中華気分」選択(楽しい) → AIがレシピ提案(ワクワク) 
→ 好きな食材で調理(満足) → 感想入力(振り返り) → 次回はもっと自分好みに(期待)
```

---

### 11.3 実装品質と拡張性

> 開発者がアイデアをどの程度実現し、必要なツールを活用し、拡張性があり、運用しやすく、費用対効果の高いソリューションを作成できたかを評価します。

#### 実装品質

| 観点 | FaveFitの実装 |
|------|--------------|
| **アーキテクチャ** | ADKによるマルチエージェント構成で責務を明確に分離 |
| **AI活用** | gemini 2.5 Flashによる高速・低コストなレシピ生成 |
| **データ設計** | Firestoreのドキュメント指向設計でユーザーデータを効率管理 |
| **認証** | Firebase Authによるセキュアな認証基盤 |
| **UI/UX** | Next.js 16 + shadcn/uiによるモダンなPWA |

#### 拡張性

| 拡張ポイント | 対応 |
|-------------|------|
| **エージェント追加** | ADKの構造により新エージェント（買い物リスト生成等）を容易に追加可能 |
| **AI機能拡張** | Vision AI APIを追加すれば写真カロリー推定も実装可能 |
| **データ連携** | Google Fit API連携でウェアラブルデータ取り込み可能 |
| **多言語対応** | Translation AI APIで国際化可能 |
| **スケール** | Cloud Run + Firestoreでトラフィック増加に自動対応 |

#### 費用対効果

| 項目 | コスト最適化 |
|------|------------|
| **LLM** | gemini 2.5 Flash（高速・低コスト）を選択 |
| **インフラ** | Cloud Runの従量課金でスモールスタート可能 |
| **DB** | Firestoreの無料枠で初期開発・検証可能 |
| **認証** | Firebase Authの無料枠で十分 |

#### 運用しやすさ

| 観点 | 対応 |
|------|------|
| **デプロイ** | Cloud Runへの自動デプロイ（GitHub Actions想定） |
| **監視** | Cloud Loggingでエージェントの動作ログを収集 |
| **保守** | TypeScript + 型定義によりコードの保守性を確保 |

---

## 12. 差別化ポイントまとめ

| 観点 | 競合（一般的なダイエットアプリ） | FaveFit |
|------|-------------------------------|---------|
| アプローチ | 制限・記録型 | 好みベース・提案型 |
| ユーザー体験 | 「食べたものを入力」 | 「食べたいものを選ぶ」 |
| AI活用 | カロリー計算の自動化程度 | マルチエージェントによる計画・提案・学習 |
| パーソナライズ | 固定的なレシピDB | フィードバックで進化するAI |
| 感情 | 罪悪感・義務感 | ワクワク感・期待感 |