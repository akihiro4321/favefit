/**
 * Firebase Client Configuration
 * クライアントサイドで使用するFirebase Auth設定
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// App Hostingが提供する自動設定をパース
// ビルド時に値が存在すれば、それがJS bundleに埋め込まれます
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
