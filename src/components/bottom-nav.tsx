'use client';

import Link from 'next/link';
import { Home, Utensils, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  // トップページ（LP）ではナビゲーションを表示しない
  if (pathname === '/') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-around max-w-screen-md mx-auto">
        <Link href="/home" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Home className="h-5 w-5" />
          <span className="text-xs">ホーム</span>
        </Link>
        <Link href="/recipes" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Utensils className="h-5 w-5" />
          <span className="text-xs">レシピ</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <User className="h-5 w-5" />
          <span className="text-xs">マイページ</span>
        </Link>
      </div>
    </nav>
  );
}
