'use client';

import { useState } from 'react';
import { UserProfile, updateUserProfile } from '@/lib/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Loader2, CheckCircle2 } from 'lucide-react';

interface ProfileFormProps {
  profile: UserProfile;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    age: profile.age || 30,
    gender: profile.gender || 'male',
    height_cm: profile.height_cm || 170,
    weight_kg: profile.weight_kg || 65,
    activity_level: profile.activity_level || 'moderate',
    goal: profile.goal || 'lose',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      console.log('Sending data to AI agent:', formData);
      // 1. AIエージェントを呼び出して栄養目標を計算
      const response = await fetch('/api/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const nutritionData = await response.json();
      console.log('Received nutrition data:', nutritionData);
      if (nutritionData.error) throw new Error(nutritionData.error);

      // 2. Firestoreを更新
      const updatedData: Partial<UserProfile> = {
        ...formData,
        ...nutritionData,
        onboardingCompleted: true,
      };

      console.log('Updating Firestore for UID:', profile.uid, updatedData);
      await updateUserProfile(profile.uid, updatedData);
      console.log('Firestore update successful');
      
      setSuccess(true);
      onUpdate({ ...profile, ...updatedData });
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">身体情報とダイエット目標</CardTitle>
        <CardDescription>
          AIがあなたに最適な栄養プランを算出します。
        </CardDescription>
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
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">性別</Label>
              <select
                id="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
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
                onChange={(e) => setFormData({ ...formData, height_cm: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">体重 (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: Number(e.target.value) })}
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
              onChange={(e) => setFormData({ ...formData, activity_level: e.target.value as any })}
            >
              <option value="low">ほとんど動かない</option>
              <option value="moderate">週2-3回の運動</option>
              <option value="high">激しい運動 / 毎日運動</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">目標</Label>
            <select
              id="goal"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value as any })}
            >
              <option value="lose">痩せたい（減量）</option>
              <option value="maintain">維持したい</option>
              <option value="gain">筋肉をつけたい（増量）</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AIが計算中...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                更新完了
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4 fill-current" />
                AIプランを更新
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
