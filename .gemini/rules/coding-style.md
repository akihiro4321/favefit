# コーディング規約（共通）

## 全般
- コメント・エラーメッセージ・ドキュメントは日本語
- TypeScript strict mode

## 命名規則
- ファイル: kebab-case（コンポーネント.tsx、サービス *-service.ts）
- リポジトリのみ例外: camelCase (*Repository.ts)
- 関数・変数: camelCase / 型: PascalCase / 定数: UPPER_SNAKE_CASE
- イベントハンドラ: handleXxx
- Zodスキーマ: PascalCaseSchema / 型導出: z.infer<typeof Schema>

## インポート
- @/ エイリアス必須。相対パスは同一ディレクトリのみ
- 順序: 外部パッケージ → 内部モジュール → 同一ディレクトリ

## コンポーネント
- named export（default export 禁止）
- Props は interface {Name}Props
- スタイリング: Tailwind + cn() / アイコン: lucide-react / UI: shadcn/ui

## エラーハンドリング
- API層: try-catch で ZodError とビジネスロジックエラーを分離
- console ログ: [クラス/関数名] プレフィックス

## 詳細規約
- AI開発はスキルを参照
  - [@../skills/ai-module-dev/SKILL.md](../skills/ai-module-dev/SKILL.md)
- DB操作はスキルを参照
  - [@../skills/firestore-ops/SKILL.md](../skills/firestore-ops/SKILL.md)
