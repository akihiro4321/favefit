'use client';

import { MoodSelector } from '@/components/mood-selector';
import { Mood } from '@/types';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleMoodSubmit = (mood: Mood) => {
    console.log('Selected Mood:', mood);
    // 実際のアプリではここでクエリパラメータなどを渡すが、
    // 今回はプロトタイプなのでシンプルにレシピ一覧画面へ遷移する
    router.push('/recipes');
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">FaveFit</h1>
        <p className="text-muted-foreground">今の気分に合わせて、あなたにぴったりのレシピを提案します。</p>
      </div>

      <MoodSelector onSubmit={handleMoodSubmit} />
    </div>
  );
}

