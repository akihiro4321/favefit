# Firestoreの実装規約と例

## 1. コレクション・ドキュメント参照の取得

`collections.ts` で定義されたヘルパーを使用します。

```typescript
import { docRefs, collections } from "./collections";

// 特定のユーザーのドキュメント参照
const userRef = docRefs.user(userId);

// ユーザー配下のサブコレクション参照
const historyRef = collections.recipeHistory(userId);
```

## 2. ドキュメントの取得

```typescript
import { getDoc } from "firebase/firestore";
import { docRefs } from "./collections";

export const getUser = async (uid: string) => {
  const userRef = docRefs.user(uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data(); // 型付けされたデータが返る
  }
  return null;
};
```

## 3. 部分更新 (Dot Notation)

ネストされたオブジェクトを破壊せずに特定のフィールドだけ更新する場合は、ドット記法を使用します。

```typescript
import { updateDoc, serverTimestamp } from "firebase/firestore";
import { docRefs } from "./collections";

export const updateDisplayName = async (uid: string, name: string) => {
  const userRef = docRefs.user(uid);
  await updateDoc(userRef, {
    "profile.identity.displayName": name,
    updatedAt: serverTimestamp(), // 必須
  });
};
```

## 4. トランザクション

複数のドキュメントをアトミックに更新する場合に使用します。

```typescript
import { runTransaction } from "firebase/firestore";
import { db } from "./client";
import { docRefs } from "./collections";

export const completeTask = async (userId: string, taskId: string) => {
  await runTransaction(db, async (transaction) => {
    const userRef = docRefs.user(userId);
    const taskRef = docRefs.task(userId, taskId); // 例

    const userSnap = await transaction.get(userRef);
    // ... ロジック
    
    transaction.update(userRef, { /* ... */ });
    transaction.update(taskRef, { status: "completed" });
  });
};
```

## 5. スキーマ定義 (lib/schema.ts)

Firestoreで使用する型は `Timestamp` や `FieldValue` を含めることができるように定義します。

```typescript
import { Timestamp, FieldValue } from "firebase/firestore";

export interface UserDocument {
  profile: {
    displayName: string;
  };
  updatedAt: Timestamp | FieldValue;
}
```
