"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShoppingCart,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ShoppingItem } from "@/lib/schema";

export default function ShoppingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [itemsByCategory, setItemsByCategory] = useState<
    Record<string, ShoppingItem[]>
  >({});
  const [planId, setPlanId] = useState<string | null>(null);
  const [planDuration, setPlanDuration] = useState<number>(0);
  const [fetching, setFetching] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const fetchData = async (isPoll = false) => {
    if (!user) return;
    try {
      const planRes = await fetch("/api/plan/get-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const planData = await planRes.json();
      const plan = planData.data?.plan;

      if (plan) {
        setPlanId(plan.id);
        const daysCount = Object.keys(plan.days || {}).length;
        setPlanDuration(daysCount);

        // カテゴリ別表示用のアイテム取得
        const itemsRes = await fetch("/api/shopping/get-by-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id }),
        });
        const itemsData = await itemsRes.json();
        const items = itemsData.data?.items || {};
        setItemsByCategory(items);

        // 初回取得時にカテゴリを展開
        if (!isPoll) {
          setExpandedCategories(new Set(Object.keys(items)));
        }

        // リストが空なら作成中とみなす
        setIsCreating(Object.keys(items).length === 0);
      } else {
        setPlanId(null);
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Error fetching shopping list:", error);
    } finally {
      if (!isPoll) {
        setFetching(false);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // ポーリング: リスト作成中の場合は5秒ごとに再取得
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCreating && planId && user) {
      interval = setInterval(() => {
        fetchData(true);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCreating, planId, user]);

  const handleToggle = async (
    category: string,
    indexInItems: number,
    checked: boolean
  ) => {
    if (!planId) return;

    // 楽観的更新
    setItemsByCategory((prev) => {
      const updated = { ...prev };
      updated[category] = [...updated[category]];
      updated[category][indexInItems] = {
        ...updated[category][indexInItems],
        checked,
      };
      return updated;
    });

    try {
      // getShoppingList を使用して、全アイテムの中での正しいインデックスを見つける必要がある
      // もしくは toggleItemCheck をカテゴリベースのAPIにアップグレードするのが理想的だが、
      // ここでは既存のAPIに合わせて、全アイテム内のインデックスを計算する
      const listRes = await fetch("/api/shopping/get-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const listData = await listRes.json();
      const list = listData.data?.shoppingList;

      if (list) {
        const itemToUpdate = itemsByCategory[category][indexInItems];
        const globalIndex = list.items.findIndex(
          (i: ShoppingItem) =>
            i.ingredient === itemToUpdate.ingredient &&
            i.amount === itemToUpdate.amount
        );

        if (globalIndex !== -1) {
          await fetch("/api/shopping/toggle-item", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId, itemIndex: globalIndex, checked }),
          });
        }
      }
    } catch (error) {
      console.error("Error updating item status:", error);
      // エラー時は元の状態に戻す（シンプルにするため今回は省略）
    }
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
        {planId ? (
          <div className="text-center space-y-6 py-12 animate-pop-in">
            <div className="relative mx-auto w-24 h-24">
              <ShoppingCart className="w-24 h-24 text-muted-foreground/30" />
              <Loader2 className="w-12 h-12 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">
                買い物リストを作成しています
              </h1>
              <p className="text-muted-foreground max-w-sm mx-auto">
                プランの承認ありがとうございます！
                <br />
                現在、AIが最適な買い物リストを生成・正規化しています。数秒〜数十秒で完了します。
              </p>
            </div>
            <div className="flex justify-center gap-1">
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></span>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 py-12 animate-pop-in">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">買い物リストがありません</h1>
            <p className="text-muted-foreground">
              プランを作成すると自動で買い物リストが生成されます
            </p>
          </div>
        )}
      </div>
    );
  }

  const allItemsList = Object.values(itemsByCategory).flat();
  const totalItemsCount = allItemsList.length;
  const checkedItemsCount = allItemsList.filter((i) => i.checked).length;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            買い物リスト
            <Badge variant="secondary" className="ml-2">
              {planDuration}日分
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {checkedItemsCount}/{totalItemsCount} アイテム購入済み
          </p>
        </div>
        {checkedItemsCount === totalItemsCount && totalItemsCount > 0 && (
          <Badge variant="default" className="gap-1">
            <Check className="w-3 h-3" />
            Complete!
          </Badge>
        )}
      </div>

      {/* 買い物リスト メインコンテンツ */}
      <Card className="overflow-hidden animate-slide-up animation-delay-100">
        <CardContent className="p-4 space-y-4">
          {Object.entries(itemsByCategory)
            .sort(([catA], [catB]) => {
              const CATEGORY_ORDER = [
                "主食・穀類",
                "肉類",
                "魚介類",
                "野菜・ハーブ類",
                "果実類",
                "卵・乳製品",
                "大豆製品",
                "基本調味料・常備品 (お家にあれば購入不要)",
                "調味料・甘味料",
                "加工食品・その他",
              ];
              const indexA = CATEGORY_ORDER.indexOf(catA);
              const indexB = CATEGORY_ORDER.indexOf(catB);
              const orderA = indexA === -1 ? 999 : indexA;
              const orderB = indexB === -1 ? 999 : indexB;
              return orderA - orderB;
            })
            .map(([category, items]) => {
              const isExpanded = expandedCategories.has(category);
              const categoryChecked = items.filter((i) => i.checked).length;

              return (
                <div
                  key={category}
                  className="border-l-2 border-primary/20 pl-4 py-1"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer select-none py-2"
                    onClick={() => toggleCategory(category)}
                  >
                    <span className="font-medium">
                      {category}
                      <span className="text-xs text-muted-foreground ml-2 font-normal">
                        ({categoryChecked}/{items.length})
                      </span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {isExpanded && (
                    <ul className="space-y-3 mt-2 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-3 py-1 group"
                        >
                          <Checkbox
                            id={`item-${category}-${idx}`}
                            checked={item.checked}
                            onCheckedChange={(checked) =>
                              handleToggle(category, idx, checked as boolean)
                            }
                            className="w-5 h-5 border-2 border-primary/50 data-[state=checked]:border-primary"
                          />
                          <label
                            htmlFor={`item-${category}-${idx}`}
                            className={`flex-1 text-sm cursor-pointer ${
                              item.checked
                                ? "line-through text-muted-foreground"
                                : "text-foreground group-hover:text-primary transition-colors"
                            }`}
                          >
                            {item.ingredient}
                          </label>
                          <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded">
                            {item.amount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
