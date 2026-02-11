/**
 * Firestore Database Client
 * サーバーサイドで使用するFirestore DB設定
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// App Hostingが提供する自動設定をパース
const systemConfig = process.env.FIREBASE_WEBAPP_CONFIG 
  ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG) 
  : {};

const firebaseConfig = {
  apiKey: systemConfig.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: systemConfig.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: systemConfig.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: systemConfig.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: systemConfig.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: systemConfig.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
