'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading, linkGoogleAccount } = useAuth();
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
    } catch (error) {
      console.error(error);
      alert('連携に失敗しました。');
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
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
