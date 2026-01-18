'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestAgentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  // Nutrition Planner Test
  const [bodyInfo, setBodyInfo] = useState({
    age: 30,
    gender: 'male',
    height: 175,
    weight: 70,
    activityLevel: 'moderate',
    goal: 'maintenance'
  });

  // Recipe Creator Test
  const [recipeParams, setRecipeParams] = useState({
    mood: 'ガッツリした肉料理',
    targetNutrition: {
      calories: 600,
      protein: 30,
      fat: 20,
      carbs: 70
    }
  });

  const runAgent = async (agentId: string, input: Record<string, unknown>) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, input }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ error: 'Failed to run agent' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">Agent Test UI</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Nutrition Planner */}
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Planner Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Age</Label>
                <Input type="number" value={bodyInfo.age} onChange={e => setBodyInfo({...bodyInfo, age: Number(e.target.value)})} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={bodyInfo.weight} onChange={e => setBodyInfo({...bodyInfo, weight: Number(e.target.value)})} />
              </div>
            </div>
            <Button className="w-full" onClick={() => runAgent('nutrition-planner', bodyInfo)} disabled={loading}>
              Run Planner
            </Button>
          </CardContent>
        </Card>

        {/* Recipe Creator */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Creator Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Mood</Label>
              <Input value={recipeParams.mood} onChange={e => setRecipeParams({...recipeParams, mood: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <Label>Target Calories</Label>
                <Input type="number" value={recipeParams.targetNutrition.calories} onChange={e => setRecipeParams({...recipeParams, targetNutrition: {...recipeParams.targetNutrition, calories: Number(e.target.value)}})} />
              </div>
              <div>
                <Label>Target Protein</Label>
                <Input type="number" value={recipeParams.targetNutrition.protein} onChange={e => setRecipeParams({...recipeParams, targetNutrition: {...recipeParams.targetNutrition, protein: Number(e.target.value)}})} />
              </div>
            </div>
            <Button className="w-full" variant="secondary" onClick={() => runAgent('recipe-creator', recipeParams)} disabled={loading}>
              Run Recipe Creator
            </Button>
          </CardContent>
        </Card>
      </div>

      {loading && <div className="text-center py-8">Generating... (Gemini is thinking)</div>}

      {result && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-[500px] bg-black text-green-400 p-4 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}