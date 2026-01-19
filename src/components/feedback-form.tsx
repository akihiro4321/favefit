'use client';

import { useState } from 'react';
import { saveFeedback, FeedbackRatings } from '@/lib/feedback';
import { updateRecipeFeedbackId } from '@/lib/recipe';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';

interface FeedbackFormProps {
  userId: string;
  recipeId: string;
  onComplete: () => void;
}

export function FeedbackForm({ userId, recipeId, onComplete }: FeedbackFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooked, setCooked] = useState<boolean>(true);
  const [ratings, setRatings] = useState<FeedbackRatings>({
    overall: 0,
    taste: 0,
    ease: 0,
    satisfaction: 0,
  });
  const [repeatPreference, setRepeatPreference] = useState<'definitely' | 'sometimes' | 'never'>('definitely');
  const [comment, setComment] = useState('');

  const handleRate = (key: keyof FeedbackRatings, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (cooked && ratings.overall === 0) {
      alert('総合評価を入力してください');
      return;
    }
    setLoading(true);
    try {
      const feedbackId = await saveFeedback(userId, {
        recipeId,
        cooked,
        ratings,
        repeatPreference,
        comment,
      });

      await updateRecipeFeedbackId(userId, recipeId, feedbackId);

      // AI学習のトリガー
      try {
        await fetch('/api/learn-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, recipeId, feedbackId }),
        });
      } catch (e) {
        console.error('Learning request failed', e);
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('フィードバックの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-green-500 bg-green-50">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
          <p className="text-xl font-bold text-green-800">Thank you!</p>
          <p className="text-green-700">あなたの好みを学習しました。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ごちそうさまでした！</CardTitle>
        <p className="text-sm text-muted-foreground">
          感想を教えてください。次回の提案がより自分好みになります。
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Cooked Toggle */}
        <div className="flex items-center gap-4">
          <Label>実際に作りましたか？</Label>
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${cooked ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              onClick={() => setCooked(true)}
            >
              はい
            </button>
            <button
              className={`px-4 py-2 text-sm ${!cooked ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              onClick={() => setCooked(false)}
            >
              いいえ（保存のみ）
            </button>
          </div>
        </div>

        {cooked && (
          <>
            <div className="space-y-4">
              <StarRating 
                label="総合評価" 
                value={ratings.overall} 
                onChange={(v) => handleRate('overall', v)} 
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StarRating 
                  label="味の好み" 
                  value={ratings.taste} 
                  onChange={(v) => handleRate('taste', v)} 
                  size="sm"
                />
                <StarRating 
                  label="作りやすさ" 
                  value={ratings.ease} 
                  onChange={(v) => handleRate('ease', v)} 
                  size="sm"
                />
                <StarRating 
                  label="満足感" 
                  value={ratings.satisfaction} 
                  onChange={(v) => handleRate('satisfaction', v)} 
                  size="sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>また作りたいですか？</Label>
              <div className="flex gap-2">
                {[
                  { value: 'definitely', label: 'ぜひ作りたい' },
                  { value: 'sometimes', label: 'たまになら' },
                  { value: 'never', label: 'もういいかな' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={repeatPreference === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRepeatPreference(option.value as 'definitely' | 'sometimes' | 'never')}
                    className="flex-1"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>コメント・メモ (任意)</Label>
              <Textarea 
                placeholder="例: もう少し塩気が欲しかった。鶏肉を豚肉に変えても美味しそう。" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" /> : null}
          {cooked ? '評価を送信する' : '保存して終了'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function StarRating({ 
  label, 
  value, 
  onChange, 
  size = 'md', 
  required = false 
}: { 
  label: string, 
  value: number, 
  onChange: (v: number) => void,
  size?: 'sm' | 'md',
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className={size === 'sm' ? 'text-xs text-muted-foreground' : 'font-bold'}>{label}</Label>
        {required && value === 0 && <span className="text-xs text-red-500">必須</span>}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star 
              className={`
                ${size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'} 
                ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              `} 
            />
          </button>
        ))}
      </div>
    </div>
  );
}
