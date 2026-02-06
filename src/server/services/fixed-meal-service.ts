/**
 * Fixed Meal Service (FixedMealResolver)
 * ユーザー指定の「固定メニュー」を解析し、具体的な栄養価を持つ MealSlot に変換する。
 * AI生成前にこれらを確定（ロック）することで、AIが勝手にメニューを変更するのを防ぐ。
 */

import { MealSlot, UserProfile } from "@/lib/schema";

// 簡易的な食品データベース（モック）
// TODO: 本番環境ではより詳細なDBやAPIを使用することを検討
const FOOD_DATABASE: Record<string, { calories: number; protein: number; fat: number; carbs: number }> = {
  "プロテイン": { calories: 120, protein: 24, fat: 1, carbs: 3 },
  "納豆ご飯": { calories: 350, protein: 12, fat: 5, carbs: 60 },
  "ゆで卵": { calories: 80, protein: 7, fat: 5, carbs: 0.5 },
  "サラダチキン": { calories: 120, protein: 25, fat: 2, carbs: 0 },
  "オートミール": { calories: 110, protein: 4, fat: 2, carbs: 19 },
  "コーヒー": { calories: 10, protein: 0.5, fat: 0, carbs: 1 },
  "トースト": { calories: 200, protein: 6, fat: 3, carbs: 35 },
  "ヨーグルト": { calories: 60, protein: 4, fat: 3, carbs: 5 },
  "バナナ": { calories: 86, protein: 1, fat: 0.2, carbs: 22 },
};

export class FixedMealService {
  /**
   * テキストベースの固定メニューを栄養価付きのMealSlotに解決する
   */
  async resolveFixedMeals(profile: UserProfile): Promise<{
    breakfast?: MealSlot;
    lunch?: MealSlot;
    dinner?: MealSlot;
  }> {
    const fixedSettings = profile.lifestyle.fixedMeals;
    if (!fixedSettings) return {};

    const resolved: { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot } = {};

    if (fixedSettings.breakfast && fixedSettings.breakfast.title) {
      resolved.breakfast = await this.resolveMeal(fixedSettings.breakfast.title);
    }

    if (fixedSettings.lunch && fixedSettings.lunch.title) {
      resolved.lunch = await this.resolveMeal(fixedSettings.lunch.title);
    }

    if (fixedSettings.dinner && fixedSettings.dinner.title) {
      resolved.dinner = await this.resolveMeal(fixedSettings.dinner.title);
    }

    return resolved;
  }

  /**
   * メニュー名から栄養価を推定・解決する
   */
  private async resolveMeal(title: string): Promise<MealSlot> {
    // 1. 完全一致でDB検索
    if (FOOD_DATABASE[title]) {
      const nutrition = FOOD_DATABASE[title];
      return {
        title,
        status: "planned",
        nutrition: {
          calories: nutrition.calories,
          protein: nutrition.protein,
          fat: nutrition.fat,
          carbs: nutrition.carbs,
        },
        tags: ["fixed"],
      };
    }

    // 2. 部分一致検索（簡易）
    for (const [key, val] of Object.entries(FOOD_DATABASE)) {
      if (title.includes(key)) {
        return {
          title,
          status: "planned",
          nutrition: {
            calories: val.calories,
            protein: val.protein,
            fat: val.fat,
            carbs: val.carbs,
          },
          tags: ["fixed"],
        };
      }
    }

    // 3. 解決できない場合は「不明」として仮の値を設定
    // ※後続のAIプロセスで、この「不明」ステータスを見て補完することも可能だが、
    // 今回は「ロック」が目的なので、AIには変更させず、栄養価だけ概算で埋めておく方針。
    return {
      title,
      status: "planned",
      nutrition: {
        calories: 0, // 0の場合は後でAIに推定させるか、無視される
        protein: 0,
        fat: 0,
        carbs: 0,
      },
      tags: ["fixed"],
    };
  }
}

export const fixedMealService = new FixedMealService();
