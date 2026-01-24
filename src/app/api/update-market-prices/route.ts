/**
 * FaveFit v2 - 物価データ更新API
 * POST /api/update-market-prices
 * 
 * 注意: 本番環境では Cloud Functions 等でバッチ実行する想定
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { MarketPriceDocument, MarketPriceEntry } from "@/lib/schema";

// 食材の基準価格データ（仮実装）
// 本番環境では外部APIやスクレイピングで取得
const BASE_PRICES: Record<string, number> = {
  // 野菜（季節変動あり）
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
  
  // 肉類
  鶏むね肉: 400,
  鶏もも肉: 500,
  豚バラ肉: 600,
  豚ロース: 700,
  豚ひき肉: 500,
  牛こま切れ: 800,
  牛ひき肉: 700,
  
  // 魚介類
  鮭: 400,
  さば: 300,
  さんま: 250,
  あじ: 350,
  いわし: 200,
  まぐろ: 600,
  えび: 800,
  いか: 500,
  
  // その他
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

// priceScore の計算（1=安い、10=高い）
function calculatePriceScore(basePrice: number, currentPrice: number): number {
  const ratio = currentPrice / basePrice;
  
  if (ratio <= 0.7) return 1;  // 30%以上安い
  if (ratio <= 0.8) return 2;
  if (ratio <= 0.9) return 3;
  if (ratio <= 0.95) return 4;
  if (ratio <= 1.05) return 5;  // 基準価格付近
  if (ratio <= 1.1) return 6;
  if (ratio <= 1.2) return 7;
  if (ratio <= 1.3) return 8;
  if (ratio <= 1.5) return 9;
  return 10;  // 50%以上高い
}

// 季節変動をシミュレート
function getSeasonalFactor(ingredient: string): number {
  const month = new Date().getMonth() + 1; // 1-12
  
  // 夏野菜
  const summerVegetables = ["トマト", "きゅうり", "なす", "ピーマン"];
  if (summerVegetables.includes(ingredient)) {
    if (month >= 6 && month <= 9) return 0.7;  // 夏は安い
    return 1.3;  // それ以外は高い
  }
  
  // 冬野菜
  const winterVegetables = ["キャベツ", "白菜", "大根", "ほうれん草"];
  if (winterVegetables.includes(ingredient)) {
    if (month >= 11 || month <= 2) return 0.7;  // 冬は安い
    return 1.2;
  }
  
  // 秋の魚
  const autumnFish = ["さんま", "さば"];
  if (autumnFish.includes(ingredient)) {
    if (month >= 9 && month <= 11) return 0.6;  // 秋は安い
    return 1.4;
  }
  
  // ランダム変動（±10%）
  return 0.9 + Math.random() * 0.2;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  try {
    // 認証チェック（本番では管理者のみ実行可能にする）
    // const authHeader = req.headers.get("authorization");
    // if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const prices: Record<string, MarketPriceEntry> = {};
    const now = serverTimestamp();

    for (const [ingredient, basePrice] of Object.entries(BASE_PRICES)) {
      const seasonalFactor = getSeasonalFactor(ingredient);
      const randomFactor = 0.95 + Math.random() * 0.1; // ±5%のランダム変動
      const currentPrice = Math.round(basePrice * seasonalFactor * randomFactor);
      const priceScore = calculatePriceScore(basePrice, currentPrice);

      prices[ingredient] = {
        priceScore,
        updatedAt: now,
      } as MarketPriceEntry;
    }

    // Firestore に保存
    const marketPriceDoc: MarketPriceDocument = {
      prices,
      lastBatchRun: now,
    } as MarketPriceDocument;

    await setDoc(doc(db, "marketPrices", "latest"), marketPriceDoc);

    // 安価な食材リスト（priceScore <= 3）
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

// GET: 現在の安価食材リストを取得
export async function GET() {
  try {
    const { getDoc } = await import("firebase/firestore");
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
