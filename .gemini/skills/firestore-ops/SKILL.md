---
name: firestore-ops
description: FaveFitのFirestoreデータ操作を行うスキル。 server/db/ 配下のコードを扱うときは必ず使うこと。
---
# Firestore Operations (firestore-ops)

FaveFitのFirestoreデータ操作とリポジトリパターンを管理するためのスキルです。
`src/server/db/firestore/` 配下のコードや `src/lib/schema.ts` を扱う際に使用します。

## 概要

FaveFitでは、Firestoreへのアクセスをリポジトリパターンで抽象化しています。
直接 `firebase/firestore` の関数をコンポーネントやAPIルートから呼び出すのではなく、必ずリポジトリを介して操作を行ってください。

## ディレクトリ構造

- `src/lib/schema.ts`: データモデル（TypeScriptインターフェース）の定義
- `src/server/db/firestore/`:
  - `client.ts`: Firestoreクライアントの初期化
  - `collections.ts`: 型安全なコレクション参照とドキュメント参照の定義
  - `*Repository.ts`: 各ドメイン（User, Plan, Recipe等）のリポジトリ実装

## 基本ルール

1. **型安全な参照の使用**:
   `src/server/db/firestore/collections.ts` で定義されている `collections` または `docRefs` を使用してください。これらは自動的にコンバーターが適用されており、型安全です。

2. **リポジトリの実装**:
   新しいデータ操作が必要な場合は、既存のリポジトリ（例: `userRepository.ts`）にメソッドを追加するか、新しいリポジトリファイルを作成してください。

3. **タイムスタンプの管理**:
   - 作成時は `serverTimestamp()` を使用します。
   - 更新時は必ず `updatedAt` フィールドを `serverTimestamp()` で更新してください。

4. **ネストされたオブジェクトの更新**:
   Firestoreの `updateDoc` でネストされたフィールドを部分更新する場合は、ドット記法（例: `"profile.identity.displayName": "New Name"`)を使用してください。

## 詳細な規約と例

詳細な実装パターンや例については、[references/conventions.md](references/conventions.md) を参照してください。