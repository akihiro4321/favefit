'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getOrCreateUser } from '@/lib/user';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface RecommendedTagsProps {
  onSelect: (tag: string) => void;
}

export function RecommendedTags({ onSelect }: RecommendedTagsProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchTags = async () => {
      const userDoc = await getOrCreateUser(user.uid);
      if (!userDoc) return;

      const prefs = userDoc.learnedPreferences;
      const candidates: { tag: string; score: number }[] = [];

      // 各カテゴリからスコアの高いものを抽出
      const extractTop = (record?: Record<string, number>) => {
        if (!record) return;
        Object.entries(record).forEach(([tag, score]) => {
          if (score > 1) { // 閾値調整 (V2では整数スコアを想定)
            candidates.push({ tag, score });
          }
        });
      };

      extractTop(prefs.cuisines);
      extractTop(prefs.flavorProfile);

      // スコア順にソートして上位5件を表示
      const topTags = candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(c => c.tag);

      setTags(topTags);
    };

    fetchTags();
  }, [user]);

  if (tags.length === 0) return null;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <span>あなたへのおすすめ</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors px-3 py-1"
            onClick={() => onSelect(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
