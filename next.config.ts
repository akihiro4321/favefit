import type { NextConfig } from "next";

// App Hostingが提供するFIREBASE_WEBAPP_CONFIGからNEXT_PUBLIC_*変数を生成
// Next.jsはNEXT_PUBLIC_プレフィックスの変数のみクライアントバンドルにインライン化するため、
// FIREBASE_WEBAPP_CONFIGを直接参照してもクライアント側には渡らない
const webappConfig = process.env.FIREBASE_WEBAPP_CONFIG
  ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG)
  : null;

if (webappConfig) {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= webappConfig.apiKey;
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= webappConfig.authDomain;
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= webappConfig.projectId;
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= webappConfig.storageBucket;
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= webappConfig.messagingSenderId;
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??= webappConfig.appId;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
