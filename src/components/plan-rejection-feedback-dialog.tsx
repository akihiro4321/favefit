"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PlanRejectionFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (feedback: string) => void;
  onCancel?: () => void;
}

export function PlanRejectionFeedbackDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: PlanRejectionFeedbackDialogProps) {
  const [feedback, setFeedback] = React.useState("");

  const handleConfirm = () => {
    onConfirm(feedback.trim());
    setFeedback("");
    onOpenChange(false);
  };

  const handleCancel = React.useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    setFeedback("");
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  // ESCキーで閉じる
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <Card className="max-w-md w-full animate-pop-in">
        <CardHeader>
          <CardTitle>プランを拒否しますか？</CardTitle>
          <CardDescription>
            別のプランを生成できます。希望があれば教えてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback">フィードバック（任意）</Label>
            <Textarea
              id="feedback"
              placeholder="例: もっと和食中心にしてほしい、カロリーを少し減らしてほしい、など"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              フィードバックは任意です。空欄でも送信できます。
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            拒否する
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
