"use client";

import Link from "next/link";
import {
  Home,
  CalendarDays,
  ShoppingCart,
  Refrigerator,
  History,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, label: "ホーム" },
  { href: "/plan", icon: CalendarDays, label: "プラン" },
  { href: "/shopping", icon: ShoppingCart, label: "買い物" },
  { href: "/fridge", icon: Refrigerator, label: "冷蔵庫" },
  { href: "/history", icon: History, label: "履歴" },
];

export function BottomNav() {
  const pathname = usePathname();

  // トップページ（LP）やオンボーディングではナビゲーションを表示しない
  if (pathname === "/" || pathname.startsWith("/onboarding")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-primary/30 bg-gradient-to-r from-background via-background/98 to-background backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
      <div className="container flex h-16 items-center justify-around max-w-screen-md mx-auto px-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all rounded-full px-3 py-2 min-w-[60px]",
                isActive
                  ? "text-primary bg-primary/10 shadow-sm"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "animate-pop-in scale-110"
                )}
              />
              <span className={cn(
                "text-xs font-medium transition-all",
                isActive && "font-semibold"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
