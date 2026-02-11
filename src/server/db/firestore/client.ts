/**
 * Firestore Database Client
 * サーバーサイドで使用するFirestore DB設定
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// サーバーサイドでの重複初期化を防ぐ
let app;
if (!getApps().length) {
  // 環境変数がある場合はそれを使用し、ない場合はGoogle Cloudのデフォルト環境を使用する
  if (firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
  } else {
    // App Hosting環境では引数なしで現在のプロジェクトとして初期化可能
    app = initializeApp();
  }
} else {
  app = getApp();
}

export const db = getFirestore(app);
