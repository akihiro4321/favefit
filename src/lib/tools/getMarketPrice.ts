/**
 * FaveFit v2 - 物価取得 Tool
 * marketPrices/latest から食材の物価スコアを取得
 */

import { z } from "zod";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { MarketPriceDocument } from "../schema";

// 入力スキーマ
export const GetMarketPriceInputSchema = z.object({
  ingredients: z.array(z.string()).describe("物価を調べたい食材の配列"),
});

// 出力型
export interface MarketPriceResult {
  prices: Record<
    string,
    {
      priceScore: number;
      isAvailable: boolean;
    }
  >;
  averageScore: number;
  cheapIngredients: string[];
  expensiveIngredients: string[];
}

/**
 * 物価情報を取得
 */
export const getMarketPrice = async (
  input: z.infer<typeof GetMarketPriceInputSchema>
): Promise<MarketPriceResult> => {
  const { ingredients } = input;

  try {
    const priceRef = doc(db, "marketPrices", "latest");
    const priceSnap = await getDoc(priceRef);

    const result: MarketPriceResult = {
      prices: {},
      averageScore: 5,
      cheapIngredients: [],
      expensiveIngredients: [],
    };

    if (!priceSnap.exists()) {
      // データがない場合はデフォルト値を返す
      ingredients.forEach((ing) => {
        result.prices[ing] = { priceScore: 5, isAvailable: false };
      });
      return result;
    }

    const priceData = priceSnap.data() as MarketPriceDocument;
    let totalScore = 0;
    let count = 0;

    ingredients.forEach((ing) => {
      const entry = priceData.prices[ing];
      if (entry) {
        result.prices[ing] = {
          priceScore: entry.priceScore,
          isAvailable: true,
        };
        totalScore += entry.priceScore;
        count++;

        if (entry.priceScore <= 3) {
          result.cheapIngredients.push(ing);
        } else if (entry.priceScore >= 8) {
          result.expensiveIngredients.push(ing);
        }
      } else {
        result.prices[ing] = { priceScore: 5, isAvailable: false };
      }
    });

    result.averageScore = count > 0 ? Math.round(totalScore / count) : 5;

    return result;
  } catch (error) {
    console.error("Error getting market prices:", error);

    // エラー時はデフォルト値を返す
    const result: MarketPriceResult = {
      prices: {},
      averageScore: 5,
      cheapIngredients: [],
      expensiveIngredients: [],
    };

    ingredients.forEach((ing) => {
      result.prices[ing] = { priceScore: 5, isAvailable: false };
    });

    return result;
  }
};

/**
 * 安価な食材を取得（プラン生成時に優先）
 */
export const getCheapIngredients = async (
  limit: number = 20
): Promise<string[]> => {
  try {
    const priceRef = doc(db, "marketPrices", "latest");
    const priceSnap = await getDoc(priceRef);

    if (!priceSnap.exists()) {
      return [];
    }

    const priceData = priceSnap.data() as MarketPriceDocument;

    const sorted = Object.entries(priceData.prices)
      .sort((a, b) => a[1].priceScore - b[1].priceScore)
      .slice(0, limit)
      .map(([name]) => name);

    return sorted;
  } catch (error) {
    console.error("Error getting cheap ingredients:", error);
    return [];
  }
};
