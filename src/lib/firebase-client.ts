/**
 * Firebase Client Configuration
 * クライアントサイドで使用するFirebase Auth設定
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// NEXT_PUBLIC_*変数はnext.config.tsでFIREBASE_WEBAPP_CONFIGからも設定される
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 環境変数の確認
if (typeof window !== "undefined") {
  if (!firebaseConfig.apiKey) {
    console.error(
      "[Firebase Client] Critical: Firebase API Key is missing. Check App Hosting build logs for FIREBASE_WEBAPP_CONFIG."
    );
  }
}

// クライアントサイドでの重複初期化を防ぐ
// ビルド時（プリレンダリング）にAPIキーがない場合は初期化をスキップする
const app =
  !getApps().length && firebaseConfig.apiKey
    ? initializeApp(firebaseConfig)
    : getApps().length > 0
      ? getApp()
      : null;

export const auth = app ? getAuth(app) : ({} as ReturnType<typeof getAuth>);
export const googleProvider = new GoogleAuthProvider();
