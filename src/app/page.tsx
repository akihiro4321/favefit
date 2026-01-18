'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading, signInGuest, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/home');
    }
  }, [user, loading, router]);

  const handleGuestLogin = async () => {
    try {
      await signInGuest();
      router.push('/home');
    } catch (error) {
      console.error(error);
      alert('ゲストログインに失敗しました。');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push('/home');
    } catch (error) {
      console.error(error);
      alert('Googleログインに失敗しました。');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  // ユーザーが存在する場合はリダイレクト待ち
  if (user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md space-y-8 mt-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary">FaveFit</h1>
        <p className="text-muted-foreground text-xl">
          今の気分に合わせて、<br />あなたにぴったりのレシピを提案します。
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-center text-2xl">はじめる</CardTitle>
          <CardDescription className="text-center">利用方法を選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoogleLogin} className="w-full" size="lg">
            Googleでログインして開始
          </Button>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button onClick={handleGuestLogin} variant="outline" className="w-full" size="lg">
            ゲストとして試す
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-4 bg-muted/50 p-3 rounded">
            ※ゲスト利用の場合、ブラウザのキャッシュをクリアするとデータが消える可能性があります。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

