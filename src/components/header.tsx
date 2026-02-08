'use client';

import Link from 'next/link';
import { User, Bug } from 'lucide-react';
import { useAuth } from './auth-provider';
import { usePathname } from 'next/navigation';

export function Header() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // トップページ（LP）ではヘッダーを表示しない
  if (pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b-4 border-primary/30 bg-gradient-to-r from-background via-background/98 to-background backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
      <div className="container flex h-16 items-center justify-between px-6 max-w-screen-md mx-auto">
        <Link href="/home" className="font-extrabold text-2xl text-primary tracking-tight hover:text-primary/80 transition-colors">
          FaveFit
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Debug Button */}
          <Link
            href="/debug/meal-plan"
            className="flex items-center justify-center w-10 h-10 bg-secondary/50 hover:bg-secondary border border-border/50 transition-all rounded-full text-secondary-foreground shadow-sm hover:shadow-md"
            title="Debug Meal Plan"
          >
            <Bug className="h-4 w-4" />
          </Link>

          {loading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 bg-muted/80 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all rounded-full text-sm font-semibold shadow-sm hover:shadow-md"
            >
              <User className="h-4 w-4" />
              <span>
                {user.isAnonymous 
                  ? 'ゲスト' 
                  : (user.displayName || user.providerData?.find(p => p.displayName)?.displayName || user.email || 'ユーザー')}
              </span>
            </Link>
          ) : (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-full text-sm font-semibold shadow-md hover:shadow-lg"
            >
              <User className="h-4 w-4" />
              <span>ログイン</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
