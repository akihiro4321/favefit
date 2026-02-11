---
name: ai-module-dev
description: FaveFitのAIモジュール（Agent, Function, Workflow）の新規作成・修正・デバッグを行うスキル。server/ai/ 配下のコードを扱うときは必ず使うこと。
---
# AIモジュール開発 (ai-module-dev)

FaveFitのAI機能（Agent, Function, Workflow）の開発と修正を支援するスキルです。

## 概要

FaveFitのAIシステムは、関心の分離とスケーラビリティを重視した設計になっています。
新規モジュールの作成や既存ロジックの変更時は、以下の構成とルールに従ってください。

## ディレクトリ構造

- `src/server/ai/`:
  - `agents/`: 複雑な推論・ループ処理
  - `functions/`: 単発の変換タスク
  - `workflows/`: オーケストレーション（Service層との境界）
  - `prompts/`: プロンプト定義関数
  - `types/`: AI関連の型定義

## 基本ルールとリファレンス

詳細は各リファレンスファイルを参照してください。

1. **アーキテクチャと責務** ([references/architecture.md](references/architecture.md))
   - 3層構造の定義とAI層の純粋性（DBアクセス禁止）について。

2. **実装ガイドライン** ([references/implementation.md](references/implementation.md))
   - SDKの使用方法、Zod/JSON Schemaの注意点、プロンプトの実装パターン。

3. **食事プラン生成ロジック** ([references/meal-plan-pipeline.md](references/meal-plan-pipeline.md))
   - 2段階生成（Skeleton & Chunk）のパイプライン詳細。

## いつどのモジュールを作るか

- LLM呼び出しが1回で済む → **Function**
- LLM呼び出しが複数回 or 自己修正ループが必要 → **Agent**
- Agent/Functionを組み合わせて業務フローを作る → **Workflow**
- ユーザーデータとの紐付けを行う → **Service** (`src/server/services/`)
