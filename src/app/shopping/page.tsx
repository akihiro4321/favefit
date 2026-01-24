"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShoppingCart,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getActivePlan } from "@/lib/plan";
import { getItemsByCategory, getShoppingList } from "@/lib/shoppingList";
import { ShoppingItem } from "@/lib/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ShoppingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [itemsByCategory, setItemsByCategory] = useState<
    Record<string, ShoppingItem[]>
  >({});
  const [itemsByWeek, setItemsByWeek] = useState<
    Record<string, Record<string, ShoppingItem[]>>
  >({});
  const [planId, setPlanId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [viewMode, setViewMode] = useState<"category" | "week">("category");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const plan = await getActivePlan(user.uid);
        if (plan) {
          setPlanId(plan.id);
          
          // カテゴリ別表示
          const items = await getItemsByCategory(plan.id);
          setItemsByCategory(items);
          setExpandedCategories(new Set(Object.keys(items)));

          // 週単位表示
          const shoppingList = await getShoppingList(plan.id);
          if (shoppingList && plan.days) {
            const weekItems: Record<string, Record<string, ShoppingItem[]>> = {};
            
            // プランの日付をソート
            const sortedDates = Object.keys(plan.days).sort();
            
            // 各日付を週に分類
            sortedDates.forEach((dateStr, index) => {
              const weekNumber = Math.floor(index / 7) + 1;
              const weekKey = `week${weekNumber}`;
              
              if (!weekItems[weekKey]) {
                weekItems[weekKey] = {};
              }
              
              // その日のレシピから食材を抽出
              const dayPlan = plan.days[dateStr];
              const dayIngredients = new Set<string>();
              
              Object.values(dayPlan.meals).forEach((meal) => {
                if (meal.ingredients && Array.isArray(meal.ingredients)) {
                  meal.ingredients.forEach((ing) => {
                    // 食材名を正規化（「鶏もも肉 200g」→「鶏もも肉」）
                    const normalizedIng = ing.split(/\s+/)[0].trim();
                    dayIngredients.add(normalizedIng);
                  });
                }
              });
              
              // 買い物リストから該当週の食材を抽出
              shoppingList.items.forEach((item) => {
                const normalizedItemIng = item.ingredient.split(/\s+/)[0].trim();
                if (dayIngredients.has(normalizedItemIng)) {
                  const category = item.category || "その他";
                  if (!weekItems[weekKey][category]) {
                    weekItems[weekKey][category] = [];
                  }
                  // 重複チェック（同じ食材が既に追加されていないか）
                  const exists = weekItems[weekKey][category].some(
                    (i) => i.ingredient === item.ingredient
                  );
                  if (!exists) {
                    weekItems[weekKey][category].push(item);
                  }
                }
              });
            });
            
            setItemsByWeek(weekItems);
            setExpandedWeeks(new Set(Object.keys(weekItems)));
          }
        }
      } catch (error) {
        console.error("Error fetching shopping list:", error);
      } finally {
        setFetching(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleToggle = async (
    category: string,
    index: number,
    checked: boolean
  ) => {
    if (!planId) return;

    // 楽観的更新
    setItemsByCategory((prev) => {
      const updated = { ...prev };
      updated[category] = [...updated[category]];
      updated[category][index] = { ...updated[category][index], checked };
      return updated;
    });

    // TODO: 実際のインデックスを計算してtoggleItemCheckを呼び出す
    // 現在は楽観的UIのみ
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (!user) return null;

  if (Object.keys(itemsByCategory).length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-4 animate-pop-in">
          <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">買い物リストがありません</h1>
          <p className="text-muted-foreground">
            プランを作成すると自動で買い物リストが生成されます
          </p>
        </div>
      </div>
    );
  }

  const totalItems = Object.values(itemsByCategory).flat().length;
  const checkedItems = Object.values(itemsByCategory)
    .flat()
    .filter((i) => i.checked).length;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            買い物リスト
          </h1>
          <p className="text-sm text-muted-foreground">
            {checkedItems}/{totalItems} アイテム購入済み
          </p>
        </div>
        {checkedItems === totalItems && totalItems > 0 && (
          <Badge variant="default" className="gap-1">
            <Check className="w-3 h-3" />
            Complete!
          </Badge>
        )}
      </div>

      {/* 表示モード切り替え */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "category" | "week")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="category">カテゴリ別</TabsTrigger>
          <TabsTrigger value="week">週単位</TabsTrigger>
        </TabsList>

        {/* カテゴリ別表示 */}
        <TabsContent value="category" className="space-y-4 mt-4">
        {Object.entries(itemsByCategory).map(([category, items]) => {
          const isExpanded = expandedCategories.has(category);
          const categoryChecked = items.filter((i) => i.checked).length;

          return (
            <Card key={category} className="overflow-hidden">
              <CardHeader
                className="pb-2 cursor-pointer select-none"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {category}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({categoryChecked}/{items.length})
                    </span>
                  </CardTitle>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <ul className="space-y-2">
                    {items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 py-2 border-b last:border-0"
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            handleToggle(category, idx, checked as boolean)
                          }
                        />
                        <span
                          className={`flex-1 ${
                            item.checked
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {item.ingredient}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
        </TabsContent>

        {/* 週単位表示 */}
        <TabsContent value="week" className="space-y-4 mt-4">
          {Object.keys(itemsByWeek).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>週単位のデータがありません</p>
            </div>
          ) : (
            Object.entries(itemsByWeek).map(([weekKey, categories]) => {
              const weekNumber = weekKey.replace("week", "");
              const isExpanded = expandedWeeks.has(weekKey);
              const weekTotalItems = Object.values(categories).flat().length;
              const weekCheckedItems = Object.values(categories)
                .flat()
                .filter((i) => i.checked).length;

              return (
                <Card key={weekKey} className="overflow-hidden">
                  <CardHeader
                    className="pb-2 cursor-pointer select-none"
                    onClick={() => {
                      setExpandedWeeks((prev) => {
                        const next = new Set(prev);
                        if (next.has(weekKey)) {
                          next.delete(weekKey);
                        } else {
                          next.add(weekKey);
                        }
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        第{weekNumber}週
                        <span className="text-xs text-muted-foreground font-normal">
                          ({weekCheckedItems}/{weekTotalItems})
                        </span>
                      </CardTitle>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 space-y-4">
                      {Object.entries(categories).map(([category, items]) => {
                        const categoryChecked = items.filter((i) => i.checked).length;
                        const isCategoryExpanded = expandedCategories.has(category);

                        return (
                          <div key={category} className="border-l-2 border-primary/20 pl-4">
                            <div
                              className="flex items-center justify-between cursor-pointer select-none py-2"
                              onClick={() => {
                                setExpandedCategories((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(category)) {
                                    next.delete(category);
                                  } else {
                                    next.add(category);
                                  }
                                  return next;
                                });
                              }}
                            >
                              <span className="text-sm font-medium">
                                {category}
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({categoryChecked}/{items.length})
                                </span>
                              </span>
                              {isCategoryExpanded ? (
                                <ChevronUp className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>

                            {isCategoryExpanded && (
                              <ul className="space-y-2 mt-2">
                                {items.map((item, idx) => {
                                  // グローバルインデックスを計算
                                  const globalIndex = Object.values(itemsByCategory)
                                    .flat()
                                    .findIndex((i) => i.ingredient === item.ingredient);

                                  return (
                                    <li
                                      key={idx}
                                      className="flex items-center gap-3 py-1 text-sm"
                                    >
                                      <Checkbox
                                        checked={item.checked}
                                        onCheckedChange={(checked) => {
                                          if (globalIndex >= 0) {
                                            handleToggle(category, globalIndex, checked as boolean);
                                          }
                                        }}
                                      />
                                      <span
                                        className={`flex-1 ${
                                          item.checked
                                            ? "line-through text-muted-foreground"
                                            : ""
                                        }`}
                                      >
                                        {item.ingredient}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {item.amount}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
