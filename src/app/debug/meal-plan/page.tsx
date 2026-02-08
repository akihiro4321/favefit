'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Code, Layout, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MealPlanWorkflowResult } from '@/server/ai';

// デバッグ用の拡張結果型
interface DebugWorkflowResult extends MealPlanWorkflowResult {
  debug?: {
    executionTimeMs: number;
  };
}

// テスト用のサンプルJSON
const SAMPLE_INPUT = {
  input: {
    targetCalories: 2000,
    pfc: { protein: 120, fat: 60, carbs: 245 },
    mealTargets: {
      breakfast: { calories: 400, protein: 20, fat: 10, carbs: 50 },
      lunch: { calories: 800, protein: 50, fat: 25, carbs: 95 },
      dinner: { calories: 800, protein: 50, fat: 25, carbs: 100 }
    },
    preferences: {
      cuisines: { "japanese": 10, "italian": 5 },
      flavorProfile: { "spicy": 2, "light": 8 },
      dislikedIngredients: ["レバー", "パクチー"]
    },
    favoriteRecipes: [],
    cheapIngredients: ["鶏むね肉", "もやし", "豆腐"],
    cheatDayFrequency: "weekly",
    startDate: "2026-02-07",
    currentDiet: {
      breakfast: "パンとコーヒー",
      lunch: "コンビニの弁当",
      dinner: "居酒屋で唐揚げとビール",
      snack: "チョコ"
    },
    mealSettings: {
      breakfast: { mode: "auto", text: "" },
      lunch: { mode: "fixed", text: "鶏むね肉のサラダ" },
      dinner: { mode: "auto", text: "" }
    }
  },
  mealTargets: {
    breakfast: { calories: 400, protein: 20, fat: 10, carbs: 50 },
    lunch: { calories: 800, protein: 50, fat: 25, carbs: 95 },
    dinner: { calories: 800, protein: 50, fat: 25, carbs: 100 }
  },
  dislikedIngredients: ["レバー", "パクチー"],
  userId: "debug-user-123"
};

export default function DebugMealPlanPage() {
  const [jsonInput, setJsonInput] = useState(JSON.stringify(SAMPLE_INPUT, null, 2));
  const [result, setResult] = useState<DebugWorkflowResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedInput = JSON.parse(jsonInput);
      const response = await fetch('/api/debug/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedInput),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meal Plan Debugger</h1>
          <p className="text-muted-foreground">Workflow: generateMealPlan (Anchor & Fill + Fix Loop)</p>
        </div>
        <Button 
          size="lg" 
          onClick={runTest} 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          Run Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            <Code className="w-4 h-4" /> Input JSON
          </div>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste your workflow input JSON here..."
            className="font-mono text-xs h-[600px] leading-relaxed resize-none border-2 focus-visible:ring-primary"
          />
        </div>

        {/* Right: Output */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            <Layout className="w-4 h-4" /> Result / Response
          </div>
          
          <div className="bg-muted/30 rounded-xl border-2 border-dashed min-h-[600px] p-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium animate-pulse text-muted-foreground">
                  AI is thinking and planning...
                </p>
              </div>
            )}

            {result && !isLoading && (
              <Tabs defaultValue="preview">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="h-9">
                    <TabsTrigger value="preview" className="text-xs px-3">Preview</TabsTrigger>
                    <TabsTrigger value="json" className="text-xs px-3">Raw JSON</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Badge variant={result.isValid ? "outline" : "destructive"}>
                      {result.isValid ? "All Valid" : `Invalid: ${result.invalidMealsCount}`}
                    </Badge>
                    <Badge variant="secondary">{result.debug?.executionTimeMs}ms</Badge>
                  </div>
                </div>

                <TabsContent value="preview" className="space-y-4 m-0">
                  {Object.entries(result.days).map(([date, day]) => (
                    <Card key={date} className="overflow-hidden border-primary/10">
                      <CardHeader className="bg-primary/5 py-3 px-4">
                        <CardTitle className="text-sm font-bold flex justify-between">
                          <span>{date}</span>
                          <span className="text-muted-foreground text-xs">{day.totalNutrition.calories} kcal</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/50 text-sm">
                          {Object.entries(day.meals).map(([type, meal]) => (
                            <div key={type} className="p-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                              <div className="space-y-1">
                                <div className="font-semibold text-primary/80 text-xs uppercase">{type}</div>
                                <div className="font-medium">{meal.title}</div>
                                <div className="flex gap-1 flex-wrap">
                                  {meal.tags?.map((tag) => (
                                    <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">#{tag}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right text-[11px] tabular-nums text-muted-foreground">
                                {meal.nutrition.calories} kcal<br/>
                                P:{meal.nutrition.protein} F:{meal.nutrition.fat} C:{meal.nutrition.carbs}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="json" className="m-0">
                  <pre className="bg-background border-2 p-4 rounded-lg overflow-auto max-h-[500px] text-[10px] leading-tight font-mono">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            )}

            {!result && !isLoading && !error && (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground opacity-50">
                <Play className="w-12 h-12 mb-4" />
                <p className="text-sm">Press &quot;Run Workflow&quot; to start simulation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
