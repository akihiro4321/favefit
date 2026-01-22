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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-around max-w-screen-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon
                className={cn("h-5 w-5", isActive && "animate-pop-in")}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
