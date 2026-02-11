import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

// App Hostingが提供するFIREBASE_WEBAPP_CONFIGからクライアント用の値を抽出
// アダプターがnext.config.tsを上書きするため、configオブジェクト内のenvオプションで渡す
const webappConfig = process.env.FIREBASE_WEBAPP_CONFIG
  ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG)
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY || webappConfig?.apiKey || "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || webappConfig?.authDomain || "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || webappConfig?.projectId || "",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || webappConfig?.storageBucket || "",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || webappConfig?.messagingSenderId || "",
    NEXT_PUBLIC_FIREBASE_APP_ID:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID || webappConfig?.appId || "",
  },
};

export default withPWA(nextConfig);
