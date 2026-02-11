import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FaveFit - AI Meal Planner",
    short_name: "FaveFit",
    description: "Your Personalized Cooking Companion powered by AI",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a", // UIのプライマリカラー（グリーン系）に合わせています
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
