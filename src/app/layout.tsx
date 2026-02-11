import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "FaveFit - Your Personalized Cooking Companion",
  description: "Find recipes based on your mood",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FaveFit",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${outfit.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-background`}
      >
        <AuthProvider>
          <Header />

          <main className="flex-1 pb-20 pt-0 container py-6 max-w-screen-md mx-auto px-4">
            {children}
          </main>

          <BottomNav />
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
