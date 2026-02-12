/**
 * Firebase Admin SDK Client
 * サーバーサイドでセキュリティルールをバイパスしてFirestoreを操作するために使用
 */

import * as admin from "firebase-admin";

// 重複初期化を防止
if (!admin.apps.length) {
  try {
    // App Hosting / Google Cloud 環境では引数なしで初期化可能
    // 開発環境でも GOOGLE_APPLICATION_CREDENTIALS があれば動作する
    admin.initializeApp();
  } catch (error) {
    console.warn(
      "Firebase Admin standard initialization failed, trying with project ID:",
      error
    );
    // 予備の初期化（環境変数が不十分な場合）
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// サーバーサイドでのみ使用されることを保証
if (typeof window !== "undefined") {
  throw new Error("Firebase Admin SDK cannot be used on the client side.");
}
