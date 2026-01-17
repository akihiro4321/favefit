import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Home, Utensils, User } from "lucide-react";
import Link from "next/link";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FaveFit - Your Personalized Cooking Companion",
  description: "Find recipes based on your mood",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-background`}
      >
        <AuthProvider>
          <Header />

          <main className="flex-1 pb-20 container py-6 max-w-screen-md mx-auto">
            {children}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-around max-w-screen-md mx-auto">
              <Link href="/" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
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
        </AuthProvider>
      </body>
    </html>
  );
}
