import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ビルド時のデバッグログ
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  env: {
    BUILD_TIME_DEBUG: "true",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

// ビルド環境変数の確認
console.log("--- Build Time Environment Variables Check ---");
const varsToFetch = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "GOOGLE_GENERATIVE_AI_API_KEY"
];
varsToFetch.forEach(v => {
  const val = process.env[v];
  console.log(`${v}: ${val ? `Defined (prefix: ${val.substring(0, 5)}...)` : "UNDEFINED"}`);
});
console.log("----------------------------------------------");

export default nextConfig;

export default nextConfig;
