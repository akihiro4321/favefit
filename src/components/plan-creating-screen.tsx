"use client";

import { Loader2 } from "lucide-react";

interface PlanCreatingScreenProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

/**
 * プラン作成中画面の共通コンポーネント
 * すべての画面で統一されたデザインを表示
 */
export function PlanCreatingScreen({
  showBackButton = false,
  onBack,
}: PlanCreatingScreenProps) {
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div className="text-center space-y-4 animate-pop-in">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <h1 className="text-2xl font-bold">プラン作成中...</h1>
        <p className="text-muted-foreground">
          AIが14日間の食事プランを生成しています。
          <br />
          作成には1〜2分かかります。
        </p>
        <div className="p-4 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground">
            このページを開いたままお待ちいただくか、
            <br />
            しばらくしてから再度アクセスしてください。
          </p>
        </div>
        {showBackButton && onBack && (
          <div className="pt-4">
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
