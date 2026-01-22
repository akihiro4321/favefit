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
import { getItemsByCategory } from "@/lib/shoppingList";
import { ShoppingItem } from "@/lib/schema";

export default function ShoppingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [itemsByCategory, setItemsByCategory] = useState<
    Record<string, ShoppingItem[]>
  >({});
  const [planId, setPlanId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
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
          const items = await getItemsByCategory(plan.id);
          setItemsByCategory(items);
          // デフォルトで全カテゴリを展開
          setExpandedCategories(new Set(Object.keys(items)));
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

      {/* カテゴリ別リスト */}
      <div className="space-y-4">
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
      </div>
    </div>
  );
}
