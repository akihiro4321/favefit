/**
 * Firebase Client Configuration
 * クライアントサイドで使用するFirebase Auth設定
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 環境変数の確認
const requiredEnvVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
];
const missingVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingVars.length > 0) {
  console.error(
    `[Firebase Client] Critical missing environment variables: ${missingVars.join(", ")}. Check App Hosting Secret settings.`
  );
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
