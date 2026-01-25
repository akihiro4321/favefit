"use client";

import { useState } from "react";
import { UserProfile, updateUserProfile } from "@/lib/db/firestore/userRepository";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, CheckCircle2, Save } from "lucide-react";

interface PreferenceFormProps {
  userId: string;
  profile: UserProfile;
  onUpdate: () => void;
}

export function PreferenceForm({
  userId,
  profile,
  onUpdate,
}: PreferenceFormProps) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // 入力フォームの一時的な状態
  const [inputFavorite, setInputFavorite] = useState("");
  const [inputAllergy, setInputAllergy] = useState("");

  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      await updateUserProfile(userId, {
        favoriteIngredients: localProfile.favoriteIngredients || [],
        allergies: localProfile.allergies || [],
        cookingSkillLevel: localProfile.cookingSkillLevel || "intermediate",
        availableTime: localProfile.availableTime || "medium",
      });

      setSuccess(true);
      onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save preference:", error);
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const addTag = (type: "favorite" | "allergy", value: string, setter: (val: string) => void) => {
    if (!value.trim()) return;
    const cleanValue = value.trim();

    const currentList =
      type === "favorite"
        ? localProfile.favoriteIngredients || []
        : localProfile.allergies || [];

    if (currentList.includes(cleanValue)) {
      setter("");
      return;
    }

    setLocalProfile((prev) => ({
      ...prev,
      [type === "favorite" ? "favoriteIngredients" : "allergies"]: [
        ...currentList,
        cleanValue,
      ],
    }));
    setter("");
  };

  const removeTag = (type: "favorite" | "allergy", index: number) => {
    const currentList =
      type === "favorite"
        ? localProfile.favoriteIngredients || []
        : localProfile.allergies || [];

    setLocalProfile((prev) => ({
      ...prev,
      [type === "favorite" ? "favoriteIngredients" : "allergies"]: currentList.filter(
        (_, i) => i !== index
      ),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">好みの設定</CardTitle>
        <CardDescription>
          AIがレシピを提案する際の参考にします。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 好きな食材 */}
        <div className="space-y-2">
          <Label>好きな食材 (積極的に使います)</Label>
          <div className="flex gap-2">
            <Input
              value={inputFavorite}
              onChange={(e) => setInputFavorite(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("favorite", inputFavorite, setInputFavorite);
                }
              }}
              placeholder="例: 鶏むね肉, ブロッコリー"
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={() => addTag("favorite", inputFavorite, setInputFavorite)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            {(localProfile.favoriteIngredients || []).map((tag, i) => (
              <Badge
                key={i}
                variant="default"
                className="gap-1 pr-1 bg-green-600 hover:bg-green-700"
              >
                {tag}
                <button
                  onClick={() => removeTag("favorite", i)}
                  className="hover:text-red-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* アレルギー */}
        <div className="space-y-2">
          <Label className="text-red-500">
            アレルギー (絶対に使用しません)
          </Label>
          <div className="flex gap-2">
            <Input
              value={inputAllergy}
              onChange={(e) => setInputAllergy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("allergy", inputAllergy, setInputAllergy);
                }
              }}
              placeholder="例: そば, 卵"
              className="border-red-200 focus-visible:ring-red-500"
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={() => addTag("allergy", inputAllergy, setInputAllergy)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            {(localProfile.allergies || []).map((tag, i) => (
              <Badge key={i} variant="destructive" className="gap-1 pr-1">
                {tag}
                <button onClick={() => removeTag("allergy", i)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>料理の腕前</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={localProfile.cookingSkillLevel || "intermediate"}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  cookingSkillLevel: e.target.value as "beginner" | "intermediate" | "advanced",
                })
              }
            >
              <option value="beginner">初心者 (包丁慣れてない)</option>
              <option value="intermediate">中級者 (レシピ見れば作れる)</option>
              <option value="advanced">上級者 (アレンジできる)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>かけられる時間</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={localProfile.availableTime || "medium"}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  availableTime: e.target.value as "short" | "medium" | "long",
                })
              }
            >
              <option value="short">短め (15分以内)</option>
              <option value="medium">普通 (30分程度)</option>
              <option value="long">長め (1時間〜)</option>
            </select>
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              保存しました
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              好みを保存する
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
