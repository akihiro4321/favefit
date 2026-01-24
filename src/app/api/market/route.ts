/**
 * FaveFit v2 - 物価データ更新API
 * POST /api/market
 * GET /api/market
 * 
 * 注意: 本番環境では Cloud Functions 等でバッチ実行する想定
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { MarketPriceDocument, MarketPriceEntry } from "@/lib/schema";

const BASE_PRICES: Record<string, number> = {
  キャベツ: 150,
  白菜: 200,
  レタス: 180,
  ほうれん草: 200,
  小松菜: 180,
  にんじん: 100,
  大根: 150,
  じゃがいも: 250,
  玉ねぎ: 200,
  もやし: 30,
  トマト: 300,
  きゅうり: 150,
  なす: 200,
  ピーマン: 150,
  ブロッコリー: 250,
  鶏むね肉: 400,
  鶏もも肉: 500,
  豚バラ肉: 600,
  豚ロース: 700,
  豚ひき肉: 500,
  牛こま切れ: 800,
  牛ひき肉: 700,
  鮭: 400,
  さば: 300,
  さんま: 250,
  あじ: 350,
  いわし: 200,
  まぐろ: 600,
  えび: 800,
  いか: 500,
  卵: 250,
  豆腐: 100,
  納豆: 120,
  牛乳: 220,
  ヨーグルト: 180,
  チーズ: 400,
  米: 2000,
  パン: 200,
  パスタ: 300,
  うどん: 150,
  そば: 200,
};

function calculatePriceScore(basePrice: number, currentPrice: number): number {
  const ratio = currentPrice / basePrice;
  
  if (ratio <= 0.7) return 1;
  if (ratio <= 0.8) return 2;
  if (ratio <= 0.9) return 3;
  if (ratio <= 0.95) return 4;
  if (ratio <= 1.05) return 5;
  if (ratio <= 1.1) return 6;
  if (ratio <= 1.2) return 7;
  if (ratio <= 1.3) return 8;
  if (ratio <= 1.5) return 9;
  return 10;
}

function getSeasonalFactor(ingredient: string): number {
  const month = new Date().getMonth() + 1;
  
  const summerVegetables = ["トマト", "きゅうり", "なす", "ピーマン"];
  if (summerVegetables.includes(ingredient)) {
    if (month >= 6 && month <= 9) return 0.7;
    return 1.3;
  }
  
  const winterVegetables = ["キャベツ", "白菜", "大根", "ほうれん草"];
  if (winterVegetables.includes(ingredient)) {
    if (month >= 11 || month <= 2) return 0.7;
    return 1.2;
  }
  
  const autumnFish = ["さんま", "さば"];
  if (autumnFish.includes(ingredient)) {
    if (month >= 9 && month <= 11) return 0.6;
    return 1.4;
  }
  
  return 0.9 + Math.random() * 0.2;
}

export async function POST() {
  try {
    const prices: Record<string, MarketPriceEntry> = {};
    const now = serverTimestamp();

    for (const [ingredient, basePrice] of Object.entries(BASE_PRICES)) {
      const seasonalFactor = getSeasonalFactor(ingredient);
      const randomFactor = 0.95 + Math.random() * 0.1;
      const currentPrice = Math.round(basePrice * seasonalFactor * randomFactor);
      const priceScore = calculatePriceScore(basePrice, currentPrice);

      prices[ingredient] = {
        priceScore,
        updatedAt: now,
      } as MarketPriceEntry;
    }

    const marketPriceDoc: MarketPriceDocument = {
      prices,
      lastBatchRun: now,
    } as MarketPriceDocument;

    await setDoc(doc(db, "marketPrices", "latest"), marketPriceDoc);

    const cheapIngredients = Object.entries(prices)
      .filter(([, entry]) => entry.priceScore <= 3)
      .map(([name]) => name);

    return NextResponse.json({
      success: true,
      updatedCount: Object.keys(prices).length,
      cheapIngredients,
      message: "物価データを更新しました",
    });
  } catch (error: unknown) {
    console.error("Update market prices error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const docRef = doc(db, "marketPrices", "latest");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({
        success: true,
        cheapIngredients: [],
        message: "物価データがありません。POST で更新してください。",
      });
    }

    const data = docSnap.data() as MarketPriceDocument;
    
    const cheapIngredients = Object.entries(data.prices)
      .filter(([, entry]) => entry.priceScore <= 3)
      .map(([name]) => name);

    const expensiveIngredients = Object.entries(data.prices)
      .filter(([, entry]) => entry.priceScore >= 8)
      .map(([name]) => name);

    return NextResponse.json({
      success: true,
      cheapIngredients,
      expensiveIngredients,
      totalIngredients: Object.keys(data.prices).length,
    });
  } catch (error: unknown) {
    console.error("Get market prices error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
