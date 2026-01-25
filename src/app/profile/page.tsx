'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ProfileForm } from '@/components/profile-form';
import { PreferenceForm } from '@/components/preference-form';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, loading, linkGoogleAccount, signInWithGoogle, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  // デバッグ用: プロフィールの内容をコンソールに出力
  useEffect(() => {
    if (profile) {
      console.log('Current Profile Data:', profile);
    }
  }, [profile]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/');
  };

  const handleLinkGoogle = async () => {
    try {
      await linkGoogleAccount();
      alert('Googleアカウントと連携しました！');
    } catch (error: unknown) {
      console.error(error);
      const authError = error as { code?: string };
      if (authError.code === 'auth/credential-already-in-use') {
        alert('このGoogleアカウントはすでに他のアカウントで使用されています。');
      } else {
        alert('連携に失敗しました。');
      }
    }
  };

  const handleLoginGoogle = async () => {
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error) {
      console.error(error);
      alert('ログインに失敗しました。');
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 flex justify-center py-20">Loading...</div>;
  }

  // 未ログイン状態（ログアウト後など）
  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
            <CardDescription>アカウントにログインするか、ゲストとして開始してください。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleLoginGoogle} className="w-full">
              Googleでログイン
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">トップページへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md space-y-6 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>マイページ</CardTitle>
          <CardDescription>アカウント情報の確認と設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-secondary/10 rounded-lg">
            <h3 className="font-semibold mb-2">ログイン情報</h3>
            {user?.isAnonymous ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Guest User</p>
                <p className="text-xs text-muted-foreground">ID: {user.uid}</p>
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-sm mb-2">データを引き継ぐにはGoogleアカウントと連携してください。</p>
                  <Button onClick={handleLinkGoogle} variant="outline" className="w-full">
                    Googleアカウントと連携する
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="font-medium">
                  {user.displayName || user.providerData?.find(p => p.displayName)?.displayName || user.email || 'ユーザー'}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* オンボーディング未完了の場合のバナー */}
      {profile && !profile.onboardingCompleted && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-sm">初期設定を完了しましょう</h3>
                <p className="text-xs text-muted-foreground">
                  あなたに最適な食事プランを作成するために、身体情報や食の好みを設定してください。
                </p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/onboarding">
                    オンボーディングを開始
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {profile && (
        <div className="space-y-6">
          {/* 目標が表示可能で、かつ編集モードでない場合に表示 */}
          {profile.nutrition?.dailyCalories && !isEditing ? (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">現在の目標栄養素</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    編集
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center bg-background py-4 rounded-xl border border-primary/10 shadow-sm">
                  <p className="text-sm text-muted-foreground font-medium">1日の目標摂取量</p>
                  <p className="text-4xl font-black text-primary tracking-tighter">
                    {profile.nutrition.dailyCalories} <span className="text-lg font-normal">kcal</span>
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background p-3 rounded-xl border shadow-sm text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">P (タンパク質)</p>
                    <p className="text-lg font-bold">{profile.nutrition.pfc?.protein || 0}g</p>
                  </div>
                  <div className="bg-background p-3 rounded-xl border shadow-sm text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">F (脂質)</p>
                    <p className="text-lg font-bold">{profile.nutrition.pfc?.fat || 0}g</p>
                  </div>
                  <div className="bg-background p-3 rounded-xl border shadow-sm text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">C (炭水化物)</p>
                    <p className="text-lg font-bold">{profile.nutrition.pfc?.carbs || 0}g</p>
                  </div>
                </div>

                {profile.nutrition.strategySummary && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      &quot;{profile.nutrition.strategySummary}&quot;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <ProfileForm 
                userId={user.uid}
                profile={profile.profile} 
                nutritionPreferences={profile.nutrition?.preferences}
                onUpdate={async () => {
                  await refreshProfile();
                  setIsEditing(false);
                }} 
              />
              {isEditing && (
                <Button variant="ghost" className="w-full" onClick={() => setIsEditing(false)}>
                  キャンセル
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {profile && (
        <PreferenceForm 
          userId={user.uid} 
          profile={profile.profile}
          onUpdate={refreshProfile}
        />
      )}

      <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground">
        ログアウト
      </Button>
    </div>
  );
}
