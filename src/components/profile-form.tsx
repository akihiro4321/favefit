"use client";

import { useState } from "react";
import { UserProfile, updateUserProfile } from "@/lib/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, Loader2, CheckCircle2 } from "lucide-react";
import { NutritionPreferencesForm } from "@/components/nutrition-preferences-form";

interface ProfileFormProps {
  userId: string;
  profile: UserProfile;
  nutritionPreferences?: {
    lossPaceKgPerMonth?: number;
    maintenanceAdjustKcalPerDay?: number;
    gainPaceKgPerMonth?: number;
    gainStrategy?: "lean" | "standard" | "aggressive";
    macroPreset?: "balanced" | "lowfat" | "lowcarb" | "highprotein";
  };
  onUpdate: () => void;
}

export function ProfileForm({ userId, profile, nutritionPreferences, onUpdate }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    age: profile.age || 30,
    gender: profile.gender || "male",
    height_cm: profile.height_cm || 170,
    currentWeight: profile.currentWeight || 65,
    targetWeight: profile.targetWeight || 60,
    activity_level: profile.activity_level || "moderate",
    goal: profile.goal || "lose",
    lossPaceKgPerMonth: nutritionPreferences?.lossPaceKgPerMonth ?? 1,
    maintenanceAdjustKcalPerDay: nutritionPreferences?.maintenanceAdjustKcalPerDay ?? 0,
    gainPaceKgPerMonth: nutritionPreferences?.gainPaceKgPerMonth ?? 0.5,
    gainStrategy: nutritionPreferences?.gainStrategy || "lean",
    macroPreset: nutritionPreferences?.macroPreset || "balanced",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      // 1. 栄養目標を計算（Firestoreへの保存も行う）
      const response = await fetch("/api/user/calculate-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          profile: {
            age: formData.age,
            gender: formData.gender,
            height_cm: formData.height_cm,
            weight_kg: formData.currentWeight,
            activity_level: formData.activity_level,
            goal: formData.goal,
          },
          preferences: {
            lossPaceKgPerMonth: formData.lossPaceKgPerMonth,
            maintenanceAdjustKcalPerDay: formData.maintenanceAdjustKcalPerDay,
            gainPaceKgPerMonth: formData.gainPaceKgPerMonth,
            gainStrategy: formData.gainStrategy,
            macroPreset: formData.macroPreset,
          },
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // 2. プロファイルを更新（栄養情報はAPIで保存済み）
      const updatedProfile: Partial<UserProfile> = {
        ...formData,
      };

      await updateUserProfile(userId, updatedProfile);

      setSuccess(true);
      onUpdate();

      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: unknown) {
      console.error("Failed to update profile:", error);
      alert("更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">身体情報とダイエット目標</CardTitle>
        <CardDescription>入力内容に基づいて栄養プランを算出します。</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">年齢</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">性別</Label>
              <select
                id="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gender: e.target.value as "male" | "female" | "other",
                  })
                }
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">身長 (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height_cm}
                onChange={(e) =>
                  setFormData({ ...formData, height_cm: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">現在の体重 (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.currentWeight}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentWeight: Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWeight">目標体重 (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                value={formData.targetWeight}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetWeight: Number(e.target.value),
                  })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity">活動レベル</Label>
            <select
              id="activity"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.activity_level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  activity_level: e.target.value as "sedentary" | "light" | "moderate" | "active" | "very_active",
                })
              }
            >
              <option value="sedentary">ほぼ運動しない</option>
              <option value="light">軽い運動 週に1-2回運動</option>
              <option value="moderate">中度の運動 週に3-5回運動</option>
              <option value="active">激しい運動やスポーツ 週に6-7回運動</option>
              <option value="very_active">非常に激しい運動・肉体労働 1日に2回運動</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">目標</Label>
            <select
              id="goal"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.goal}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  goal: e.target.value as "lose" | "maintain" | "gain",
                })
              }
            >
              <option value="lose">痩せたい（減量）</option>
              <option value="maintain">維持したい</option>
              <option value="gain">筋肉をつけたい（増量）</option>
            </select>
          </div>

          <NutritionPreferencesForm
            goal={formData.goal}
            formData={formData}
            onFormChange={(updates) => setFormData({ ...formData, ...updates })}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                計算中...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                更新完了
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4 fill-current" />
                栄養プランを算出
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
