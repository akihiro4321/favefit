"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  PartyPopper,
  Sparkles,
  Pizza,
  IceCream,
  Beef,
} from "lucide-react";
import { getActivePlan } from "@/lib/plan";
import { DayPlan } from "@/lib/schema";
import confetti from "canvas-confetti";

export default function CheatDayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [todaysMeals, setTodaysMeals] = useState<DayPlan | null>(null);
  const [fetching, setFetching] = useState(true);

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
          const today = new Date().toISOString().split("T")[0];
          setTodaysMeals(plan.days[today] || null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setFetching(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    // チートデイなら紙吹雪を飛ばす
    if (todaysMeals?.isCheatDay) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f97316", "#a3e635", "#fbbf24"],
        });
      }, 500);
    }
  }, [todaysMeals]);

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // チートデイでない場合
  if (!todaysMeals?.isCheatDay) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-4 animate-pop-in">
          <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">今日はチートデイではありません</h1>
          <p className="text-muted-foreground">
            次のチートデイまで、もう少し頑張りましょう！
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/plan")}
            className="rounded-full"
          >
            プランを確認する
          </Button>
        </div>
      </div>
    );
  }

  // チートデイの場合
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8 pb-24">
      <div className="text-center space-y-6 animate-pop-in">
        <div className="relative">
          <PartyPopper className="w-24 h-24 mx-auto text-primary animate-bounce" />
          <Sparkles className="w-8 h-8 absolute top-0 right-1/3 text-secondary" />
          <Sparkles className="w-6 h-6 absolute bottom-0 left-1/3 text-secondary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            🎉 CHEAT DAY!
          </h1>
          <p className="text-xl text-muted-foreground">
            今日は好きなものを楽しむ日
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-secondary/20 to-primary/10 border-secondary/50">
        <CardContent className="pt-6 space-y-4">
          <p className="text-center font-medium">
            頑張った自分へのご褒美です。
            <br />
            罪悪感なく、食事を楽しんでください！
          </p>

          <div className="flex justify-center gap-6 py-4">
            <div className="text-center">
              <Pizza className="w-10 h-10 mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">ピザ</p>
            </div>
            <div className="text-center">
              <Beef className="w-10 h-10 mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">焼肉</p>
            </div>
            <div className="text-center">
              <IceCream className="w-10 h-10 mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">スイーツ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-bold text-center">💡 チートデイのコツ</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>✓ 水分をしっかり摂る（翌日のむくみ対策）</li>
            <li>✓ 翌日は通常モードに戻すことを意識</li>
            <li>✓ 食べすぎても自分を責めない</li>
            <li>✓ 次のチートデイを楽しみに頑張る！</li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => router.push("/home")}
          className="rounded-full"
        >
          ホームに戻る
        </Button>
      </div>
    </div>
  );
}
