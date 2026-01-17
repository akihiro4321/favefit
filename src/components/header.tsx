'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { useAuth } from './auth-provider';

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 max-w-screen-md mx-auto">
        <Link href="/" className="font-bold text-xl text-primary tracking-tight">
          FaveFit
        </Link>
        
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium">
              <User className="h-3.5 w-3.5" />
              <span>ゲスト</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
