import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";

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

          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
