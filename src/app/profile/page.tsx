'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading, linkGoogleAccount, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/');
  };

  const handleLinkGoogle = async () => {
    try {
      await linkGoogleAccount();
      alert('Googleアカウントと連携しました！');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/credential-already-in-use') {
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
    return <div className="container mx-auto p-4">Loading...</div>;
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
              <a href="/">トップページへ戻る</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
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
                <p className="font-medium">{user?.displayName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            )}
          </div>

          <Button onClick={handleLogout} variant="destructive" className="w-full">
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
