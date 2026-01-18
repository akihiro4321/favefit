'use client';

import { useAuth } from '@/components/auth-provider';
import { MoodSelector } from '@/components/mood-selector';
import { Mood } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleMoodSubmit = (mood: Mood) => {
    console.log('Selected Mood:', mood);
    router.push('/recipes');
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!user) {
    return null; // リダイレクト待ち
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">FaveFit</h1>
        <p className="text-muted-foreground">今の気分は？</p>
      </div>

      <MoodSelector onSubmit={handleMoodSubmit} />
    </div>
  );
}
