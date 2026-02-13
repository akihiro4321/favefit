import * as admin from "firebase-admin";

/**
 * Firebase Admin SDK の初期化
 */
if (!admin.apps.length) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined in environment variables."
    );
  }

  // デバッグ用: エミュレータ環境変数の確認
  if (process.env.NODE_ENV === "development") {
    console.log("[Firebase Admin] Project ID:", projectId);
    console.log(
      "[Firebase Admin] Firestore Emulator:",
      process.env.FIRESTORE_EMULATOR_HOST
    );
    console.log(
      "[Firebase Admin] Auth Emulator:",
      process.env.FIREBASE_AUTH_EMULATOR_HOST
    );
  }

  admin.initializeApp({
    projectId,
  });
}

const db = admin.firestore();
// undefined なプロパティを無視するように設定（Firestoreのエラーを回避）
db.settings({ ignoreUndefinedProperties: true });

export const adminDb = db;
export const adminAuth = admin.auth();

// サーバーサイドでのみ使用されることを保証
if (typeof window !== "undefined") {
  throw new Error("Firebase Admin SDK cannot be used on the client side.");
}
