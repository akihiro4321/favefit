# AIアーキテクチャと責務

FaveFitのAI機能は以下の **3層アーキテクチャ** で構成されています。

## 3層構造

1. **Service層 (`src/server/services/`)**
   - ビジネスロジック。
   - DBからデータを取得し、AI層にPOJOとして渡す。

2. **Workflow層 (`src/server/ai/workflows/`)**
   - 複数のAgent/Functionを組み合わせたオーケストレーション。
   - 条件分岐・リトライ・データ加工を担当。

3. **Agent層 (`src/server/ai/agents/`) / Function層 (`src/server/ai/functions/`)**
   - 純粋なAI処理。
   - **Agent**: 自己修正ループ・多段階推論など複雑なタスク。
   - **Function**: 単発の変換タスク（1回のLLM呼び出し）。

## AI層の純粋性ルール（最重要）

Agent と Function には **Firestore呼び出しやService呼び出しを絶対に混入させない** でください。
必要なデータはすべて呼び出し元（ServiceまたはWorkflow）が引数として渡します。

```typescript
// ✅ 正しい: データを引数で受け取る
export async function generateRecipe(input: RecipeInput): Promise<Recipe> { ... }

// ❌ 間違い: AI層の中でDBを叩いている
export async function generateRecipe(userId: string): Promise<Recipe> {
  const user = await userRepository.getUser(userId) // NG
}
```

この分離により、デバッグページからDB不要でAIロジックのみをテスト可能にしています。
