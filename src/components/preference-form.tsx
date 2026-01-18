'use client';

import { useState, useEffect } from 'react';
import { UserPreference, getPreference, updatePreference } from '@/lib/preference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, CheckCircle2, Save } from 'lucide-react';
import { UserProfile, updateUserProfile } from '@/lib/user';

interface PreferenceFormProps {
  userUid: string;
  userProfile?: UserProfile | null;
  onUpdate?: () => void;
}

export function PreferenceForm({ userUid, userProfile, onUpdate }: PreferenceFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [preference, setPreference] = useState<UserPreference | null>(null);

  // 入力フォームの一時的な状態
  const [inputFavorite, setInputFavorite] = useState('');
  const [inputDislike, setInputDislike] = useState('');
  const [inputAllergy, setInputAllergy] = useState('');

  useEffect(() => {
    const fetchPreference = async () => {
      setLoading(true);
      const data = await getPreference(userUid);
      setPreference(data);
      setLoading(false);
    };
    fetchPreference();
  }, [userUid]);

  const handleSave = async () => {
    if (!preference) return;
    setSaving(true);
    setSuccess(false);

    try {
      await updatePreference(userUid, {
        favoriteIngredients: preference.favoriteIngredients,
        dislikedIngredients: preference.dislikedIngredients,
        allergies: preference.allergies,
        cookingSkillLevel: preference.cookingSkillLevel,
        availableTime: preference.availableTime,
      });

      // オンボーディングが未完了の場合、これを機に完了とするロジックなどを追加可能
      // ここではプロフィールの onboardingCompleted が true になっていない場合に更新する例
      if (userProfile && !userProfile.onboardingCompleted) {
        await updateUserProfile(userUid, { onboardingCompleted: true });
      }

      setSuccess(true);
      if (onUpdate) onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preference:', error);
      alert('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (
    type: 'favorite' | 'dislike' | 'allergy',
    value: string,
    setter: (val: string) => void
  ) => {
    if (!value.trim() || !preference) return;
    const cleanValue = value.trim();
    
    // 重複チェック
    let list: string[] = [];
    if (type === 'favorite') list = preference.favoriteIngredients;
    if (type === 'dislike') list = preference.dislikedIngredients;
    if (type === 'allergy') list = preference.allergies;

    if (list.includes(cleanValue)) {
      setter('');
      return;
    }

    const newData = { ...preference };
    if (type === 'favorite') newData.favoriteIngredients = [...list, cleanValue];
    if (type === 'dislike') newData.dislikedIngredients = [...list, cleanValue];
    if (type === 'allergy') newData.allergies = [...list, cleanValue];

    setPreference(newData);
    setter('');
  };

  const removeTag = (type: 'favorite' | 'dislike' | 'allergy', index: number) => {
    if (!preference) return;
    const newData = { ...preference };
    
    if (type === 'favorite') {
      newData.favoriteIngredients = preference.favoriteIngredients.filter((_, i) => i !== index);
    } else if (type === 'dislike') {
      newData.dislikedIngredients = preference.dislikedIngredients.filter((_, i) => i !== index);
    } else if (type === 'allergy') {
      newData.allergies = preference.allergies.filter((_, i) => i !== index);
    }

    setPreference(newData);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    type: 'favorite' | 'dislike' | 'allergy',
    value: string,
    setter: (val: string) => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(type, value, setter);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (!preference) return null;

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
              onKeyDown={(e) => handleKeyDown(e, 'favorite', inputFavorite, setInputFavorite)}
              placeholder="例: 鶏むね肉, ブロッコリー"
            />
            <Button size="icon" variant="secondary" onClick={() => addTag('favorite', inputFavorite, setInputFavorite)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            {preference.favoriteIngredients.map((tag, i) => (
              <Badge key={i} variant="default" className="gap-1 pr-1 bg-green-600 hover:bg-green-700">
                {tag}
                <button onClick={() => removeTag('favorite', i)} className="hover:text-red-200">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {preference.favoriteIngredients.length === 0 && (
              <span className="text-xs text-muted-foreground">未登録</span>
            )}
          </div>
        </div>

        {/* 苦手な食材 */}
        <div className="space-y-2">
          <Label>苦手な食材 (避けるようにします)</Label>
          <div className="flex gap-2">
            <Input
              value={inputDislike}
              onChange={(e) => setInputDislike(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'dislike', inputDislike, setInputDislike)}
              placeholder="例: セロリ, パクチー"
            />
            <Button size="icon" variant="secondary" onClick={() => addTag('dislike', inputDislike, setInputDislike)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            {preference.dislikedIngredients.map((tag, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button onClick={() => removeTag('dislike', i)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* アレルギー */}
        <div className="space-y-2">
          <Label className="text-red-500">アレルギー (絶対に使用しません)</Label>
          <div className="flex gap-2">
            <Input
              value={inputAllergy}
              onChange={(e) => setInputAllergy(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'allergy', inputAllergy, setInputAllergy)}
              placeholder="例: そば, 卵"
              className="border-red-200 focus-visible:ring-red-500"
            />
            <Button size="icon" variant="secondary" onClick={() => addTag('allergy', inputAllergy, setInputAllergy)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            {preference.allergies.map((tag, i) => (
              <Badge key={i} variant="destructive" className="gap-1 pr-1">
                {tag}
                <button onClick={() => removeTag('allergy', i)}>
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
              value={preference.cookingSkillLevel}
              onChange={(e) => setPreference({ ...preference, cookingSkillLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
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
              value={preference.availableTime}
              onChange={(e) => setPreference({ ...preference, availableTime: e.target.value as 'short' | 'medium' | 'long' })}
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
