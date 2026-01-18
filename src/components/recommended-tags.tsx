'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getPreference } from '@/lib/preference';
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
      const pref = await getPreference(user.uid);
      if (!pref) return;

      const profile = pref.learnedProfile;
      const candidates: { tag: string; score: number }[] = [];

      // 各カテゴリからスコアの高いものを抽出
      const extractTop = (record: Record<string, number>) => {
        Object.entries(record).forEach(([tag, score]) => {
          if (score > 0.1) { // 閾値
            candidates.push({ tag, score });
          }
        });
      };

      extractTop(profile.preferredCuisines);
      extractTop(profile.preferredFlavors);
      extractTop(profile.preferredIngredients);

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
