# FaveFit プロジェクト Wiki

このドキュメントは **FaveFit** コードベースの包括的な技術概要を提供します。システムのアーキテクチャ、ビジネスロジック、およびデータフローを深く理解する必要がある開発者を対象としています。

---

## 1. プロジェクト概要

**FaveFit** は、パーソナライズされた週間の食事プランを生成するために、複雑な LLM フローをオーケストレーションする AI 搭載型の食事プランニングアプリケーションです。

### コア・バリュー・プロポジション
- **適応型プランニング (Adaptive Planning):** ユーザーの現在の食習慣を分析し、目標（カロリー/マクロ栄養素）に合わせて段階的に調整するプランを生成します。
- **負担軽減:** 献立作成、レシピ生成、買い物リスト作成を自動化します。
- **在庫管理:** 冷蔵庫の残り物を考慮し、食材の無駄を削減します。

### 技術スタック
- **フロントエンド:** Next.js 16 (App Router), React 19, Tailwind CSS, Radix UI (shadcn/ui 互換).
- **バックエンド:** Next.js Server Actions, Firebase Admin SDK.
- **データベース:** Cloud Firestore (NoSQL).
- **AI エンジン:** Google Gemini API (`@google/genai` SDK).
- **テスト:** Vitest, React Testing Library.

---

## 2. アーキテクチャとディレクトリ構造

プロジェクトは **フィーチャー・レイヤード・アーキテクチャ (Feature-Layered Architecture)** を採用しています。

### ディレクトリマップ

```text
src/
├── app/                  # フロントエンド: Next.js App Router
│   ├── (routes)/         # ページ (onboarding, home, plan 等)
│   └── api/              # API ルート (主にデバッグや外部連携用)
├── components/           # UI: 共通 React コンポーネント (shadcn/ui)
├── lib/                  # 共通ドメイン: ユーティリティ & ロジック
│   ├── tools/            # 純粋関数 (数学的計算、栄養価計算)
│   ├── schemas/          # Zod バリデーションスキーマ
│   └── schema.ts         # データモデル: DB およびフロントエンド共通の型定義
├── server/               # バックエンド: ビジネスロジック & インフラ
│   ├── ai/               # AI レイヤー: Agents, Functions, Workflows
│   ├── db/               # インフラレイヤー: Firestore リポジトリ
│   └── services/         # サービスレイヤー: 業務プロセスのオーケストレーション
```

### 主要なアーキテクチャパターン

1.  **Service-Repository パターン:**
    - **Services** (`src/server/services/`): ビジネスルールを担当（例：「プラン確定後に買い物リストを作成する」）。
    - **Repositories** (`src/server/db/firestore/`): 生の DB 操作を担当（例：`setDoc`, `updateDoc`）。

2.  **AI オーケストレーションレイヤー:**
    - **Workflows:** 高レベルな業務プロセス（例：`generateMealPlan`）。Service 層からの境界線となります。
    - **Agents:** スマートで多段階の推論、計画立案を行う（例：`plan-generator`）。自己修正ループなどを持ちます。
    - **Functions:** 特定のスキーマに従った変換など、単発のタスクを行う LLM ラッパー（例：`plan-skeleton-generator`）。

---

## 3. コアロジック: 食事プラン生成 (V2 Flow)

生成ロジックはシステムの核となる部分です。**2段階生成 (Skeleton & Chunk) 戦略** を使用し、週全体の整合性と詳細なレシピの質を両立させています。

### フロー図

```text
Service (plan-service.ts)
  │
  ▼
Workflow (meal-plan-generation.ts)
  │
  ├─> Function: Diet Estimator (現在の食習慣を分析)
  ├─> Logic: Create Adaptive Directive (目標への段階的な調整指示を作成)
  │
  ▼
Agent (plan-generator.ts)
  │
  ├─> Phase 1: Skeleton Generation (グローバル計画)
  │     └─> 出力: WeeklySkeleton (食材プール、献立タイトル案)
  │
  └─> Phase 2: Chunk Detail Generation (並列詳細生成)
        ├─> 週間プランを「食材プール」に基づきチャンク（数日単位）に分割
        ├─> 並列実行: チャンクごとに generateChunkDetails() を呼び出し
        └─> マージ & バリデーション
```

### Phase 1: Skeleton Generation
- **目的:** 週全体のテーマを統一し、食材の使い回し（食材プール）を最適化する。
- **入力:** ユーザー設定、冷蔵庫の在庫、適応型プランニング指示。
- **主要な出力:** `Ingredient Pools` (例: 「月〜水: キャベツと鶏肉」)。この段階ではレシピは作らず、タイトルと目標栄養価のみを決定します。

### Phase 2: Chunk Detail Generation
- **目的:** Skeleton の計画に沿った、実行可能な詳細レシピを生成する。
- **プロセス:** Skeleton で定義された目標栄養価を「厳格な制約」として、具体的な分量や手順を生成します。

---

## 4. ドメインロジックと計算規則

AI が創造性を担当する一方で、厳格な数学的ルールが栄養管理を統治します。

### 栄養価計算 (`src/lib/tools/mealNutritionCalculator.ts`)
- **配分ルール:**
    - 朝食: 1日の目標の **20%**
    - 昼食: 1日の目標の **40%**
    - 夕食: 1日の目標の **40%**
- **制約:** AI には単なる合計値ではなく、スロットごとの具体的なターゲット数値が与えられます。

### マクロ目標設定 (`src/lib/tools/calculateMacroGoals.ts`)
- 基礎代謝量 (BMR) と 1日の総消費エネルギー (TDEE) を計算します。
- ユーザーの目的（減量、維持、増量）に応じた係数を適用します。

---

## 5. データレイヤー (Firestore)

### コレクションスキーマ (`src/lib/schema.ts`)

#### `users/{userId}`
- **`profile`**: 
    - `identity`: 表示名、作成日、ゲストフラグ。
    - `physical`: 年齢、身長、体重、目標、アレルギー、嗜好食材。
    - `lifestyle`: 活動レベル、料理スキル、冷蔵庫在庫、現在の食習慣。
- **`nutrition`**: 計算された BMR/TDEE、1日の目標カロリー、PFC バランス、減量戦略。
- **`learnedPreferences`**: AI が生成した料理ジャンルや食材のスコアカード。

#### `plans/{planId}`
- **構造:** 週間プラン全体を保持。
- **`days` マップ:** 日付をキーとした `DayPlan` オブジェクト。
  - `meals`: 朝・昼・晩（・間食）の各スロット。`recipeId`、栄養価、材料リスト、手順を含む。
- **更新:** `planRepository.ts` を通じ、ドット記法を用いたパス指定（例: `days.2023-10-27.meals.lunch.status`）で部分更新を行います。

---

## 6. AI システム設定

### 使用モデル (`src/server/ai/config.ts`)
- **Gemini 2.5 Flash:** メインモデル。高速かつ低コストなため、Auditor、Skeleton、Chunk 生成などほとんどのタスクに使用されます。
- **Gemini 3 Pro / Flash (Preview):** より複雑な推論が必要なタスク、または次世代機能の検証に使用されます。

### プロンプトエンジニアリング
- プロンプトは `Input` オブジェクトを受け取り文字列を返す TypeScript 関数として定義されています (`src/server/ai/prompts/`)。
- **重要:** `zod-to-json-schema` を使用して Gemini から厳格な JSON 出力を得ています。Gemini の制限により、スキーマ変換時は `$refStrategy: "none"` を指定して参照をインライン展開する必要があります。

---

## 7. 開発者ツール

### デバッグページ
- **URL:** `/debug/meal-plan`
- **機能:**
    1. 任意のユーザープロファイル JSON を流し込む。
    2. `meal-plan-generation` ワークフロー全体を直接実行。
    3. Skeleton フェーズと Detail フェーズの生の JSON 出力を検査。
    4. ロジックテストのため、DB への書き込みをバイパス可能。

### 共通コマンド
- `npm run dev`: 開発サーバーの起動。
- `npm run test`: Vitest によるユニットテストの実行。
- `npm run lint`: ESLint によるチェック。
