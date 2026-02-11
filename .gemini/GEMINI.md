# FaveFit プロジェクトコンテキスト

## Language
このプロジェクトでのやりとりや生成物はすべて日本語にすること

## プロジェクト概要
**FaveFit** は、ユーザーの目標（減量、筋肥大など）や好みに基づいて、パーソナライズされた週間の食事プランを生成するAI搭載型食事プランニングアプリケーションです。**Google Gemini API (@google/genai)** を活用し、食事プランの策定、レシピ生成、買い物リストの作成をマルチエージェントワークフローでオーケストレーションします。

## 技術スタック
- **フレームワーク:** Next.js 16 (App Router)
- **言語:** TypeScript
- **スタイリング:** Tailwind CSS, Radix UI (`lucide-react`, `class-variance-authority` を使用)
- **データベース:** Firebase Firestore
- **認証:** Firebase Auth
- **AI 統合:** Google Generative AI SDK (`@google/genai`)
- **テスト:** Vitest, React Testing Library

## アーキテクチャとディレクトリ構造
プロジェクトはサーバーサイドビジネスロジックとAIロジックを明確に分離した多層構造を採用しています。

```text
src/
├── app/          # Next.js App Router (Pages, API Routes)
├── components/   # React UI コンポーネント (shadcn/ui スタイル)
├── lib/          # 共通ユーティリティ、計算ロジック、Firestoreスキーマ
├── server/       # サーバーサイドロジック
│   ├── ai/       # AIモジュール
│   │   ├── agents/    # 自律的な推論・ループ・計画を行うエージェント (V2推奨)
│   │   ├── functions/ # 単発のタスク（レシピ生成、分析）を行う関数
│   │   ├── prompts/   # プロンプト定義 (agents/用とfunctions/用に分離)
│   │   └── workflows/ # エージェントや関数を組み合わせた業務プロセス
│   ├── db/       # Firestoreリポジトリ層
│   └── services/ # アプリケーションサービス層（ビジネスロジックの本体）
└── types/        # グローバル型定義
```

## AI アーキテクチャ
AI機能は以下の3つのレイヤーで構成されています。

1.  **Workflows (オーケストレーション)**: アプリのService層から呼ばれ、複数のAI（Agent/Function）を組み合わせて目的を達成します。Service層との境界線です。
2.  **Agents (思考層)**: 自己修正ループ、計画の立案（Anchor & Fill等）、複雑な推論を担当します。
3.  **Functions (タスク層)**: 「入力を特定のスキーマに従って変換する」単発のLLM呼び出しを担当します。

### 食事プラン生成パイプライン (V2 Flow)
現在の標準は、以下の2段階生成フローです。
- **Phase 1 (Skeleton)**: 1週間分の一括メニュー案と、数日単位の「食材プール（使い回し計画）」を策定します。
- **Phase 2 (Detail)**: 策定された食材プールに基づき、チャンク単位（数日分）で詳細な分量と手順を並列生成します。

## 開発・検証ツール
- **デバッグページ (`/debug/meal-plan`)**: 任意のユーザー設定JSONを流し込み、AIワークフロー（V1/V2）を直接実行・比較できる開発者用ツールが用意されています。

## コーディング規約
コーディング規約は [@./rules/coding-style.md](./rules/coding-style.md) にまとめてあるので、コードの生成・変更時は必ず参照すること。

### AI開発の重要ルール
- **SDK**: `ai` (Vercel AI SDK) ではなく `@google/genai` を直接使用すること。
- **スキーマ**: `zod-to-json-schema` を使用する際、Geminiの制限により `$refStrategy: "none"` を指定して参照をインライン展開すること。
- **分離**: モデル呼び出しロジック（ai/層）の中に Service層（DB操作等）を混入させないこと。必要なデータは引数として渡すこと。
