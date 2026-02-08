'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Code, Layout, AlertCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MealPlanWorkflowResult } from '@/server/ai';
import { cn } from '@/lib/utils';

// デバッグ用の拡張結果型
interface DebugWorkflowResult extends MealPlanWorkflowResult {
  debug?: {
    executionTimeMs: number;
    version: string;
  };
}

interface Scenario {
  id: string;
  name: string;
  json: string;
  result: DebugWorkflowResult | null;
  isLoading: boolean;
  error: string | null;
}

// 初期サンプルデータ
const INITIAL_SAMPLE = {
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
      breakfast: "納豆卵かけご飯(ご飯100~120g)、味噌汁",
      lunch: "コンビニの弁当",
      dinner: "居酒屋で唐揚げとビール",
      snack: "チョコ"
    },
    mealSettings: {
      breakfast: { mode: "fixed", text: "納豆卵かけご飯(ご飯100~120g)、味噌汁" },
      lunch: { mode: "auto", text: "" },
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
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: '1',
      name: 'Scenario 1',
      json: JSON.stringify(INITIAL_SAMPLE, null, 2),
      result: null,
      isLoading: false,
      error: null
    }
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('1');
  const [version, setVersion] = useState<'v1' | 'v2'>('v2');

  const addScenario = () => {
    const newId = Date.now().toString();
    setScenarios([...scenarios, {
      id: newId,
      name: `Scenario ${scenarios.length + 1}`,
      json: scenarios[scenarios.length - 1].json, // 前のスロットをコピー
      result: null,
      isLoading: false,
      error: null
    }]);
    setActiveScenarioId(newId);
  };

  const removeScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    const newScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(newScenarios);
    if (activeScenarioId === id) {
      setActiveScenarioId(newScenarios[0].id);
    }
  };

  const updateScenarioJson = (id: string, json: string) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, json } : s));
  };

  const runSingleScenario = async (id: string) => {
    const scenario = scenarios.find(s => s.id === id);
    if (!scenario) return;

    setScenarios(prev => prev.map(s => s.id === id ? { ...s, isLoading: true, error: null, result: null } : s));

    try {
      const parsedInput = JSON.parse(scenario.json);
      const response = await fetch('/api/debug/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsedInput, version }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate');
      
      setScenarios(prev => prev.map(s => s.id === id ? { ...s, result: data, isLoading: false } : s));
    } catch (err) {
      setScenarios(prev => prev.map(s => s.id === id ? { ...s, error: err instanceof Error ? err.message : 'Error', isLoading: false } : s));
    }
  };

  const runAllScenarios = async () => {
    await Promise.all(scenarios.map(s => runSingleScenario(s.id)));
  };

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];

  return (
    <div className="container py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Scenario Debugger</h1>
          <p className="text-muted-foreground">
            Test and compare different input patterns. Current version: {version.toUpperCase()}
          </p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-muted p-1 rounded-lg">
            <Button 
              variant={version === 'v1' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setVersion('v1')}
              className="text-xs h-8"
            >
              V1 (Batch)
            </Button>
            <Button 
              variant={version === 'v2' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setVersion('v2')}
              className="text-xs h-8"
            >
              V2 (2-Stage)
            </Button>
          </div>
          
          <Button variant="outline" onClick={addScenario} className="gap-2">
            <Plus className="w-4 h-4" /> Add Slot
          </Button>

          <Button 
            size="lg" 
            onClick={runAllScenarios} 
            disabled={scenarios.some(s => s.isLoading)}
            className="gap-2 bg-primary text-primary-foreground"
          >
            <Play className="w-4 h-4 fill-current" />
            Run All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Scenario Sidebar - Narrower */}
        <div className="col-span-12 lg:col-span-2 space-y-2 border-r pr-4">
          <div className="font-semibold text-xs text-muted-foreground mb-4 px-2 uppercase tracking-widest">Scenarios</div>
          {scenarios.map((s) => (
            <div 
              key={s.id}
              className={cn(
                "group flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer",
                activeScenarioId === s.id 
                  ? "border-primary bg-primary/5 shadow-sm" 
                  : "border-transparent hover:border-border bg-muted/30"
              )}
              onClick={() => setActiveScenarioId(s.id)}
            >
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="text-xs font-bold truncate">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  {s.isLoading ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                  ) : s.result ? (
                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                  ) : s.error ? (
                    <AlertCircle className="w-2.5 h-2.5 text-destructive" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  )}
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {s.result ? `${s.result.debug?.executionTimeMs}ms` : s.isLoading ? 'RUN' : 'READY'}
                  </span>
                </div>
              </div>
              {scenarios.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeScenario(s.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Input Editor - Smaller Width */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground tracking-tighter">
              <Code className="w-3.5 h-3.5" /> Input JSON
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-6 text-[9px] px-2"
              onClick={() => runSingleScenario(activeScenario.id)} 
              disabled={activeScenario.isLoading}
            >
              Run This
            </Button>
          </div>
          <Textarea
            value={activeScenario.json}
            onChange={(e) => updateScenarioJson(activeScenario.id, e.target.value)}
            className="font-mono text-[10px] h-[750px] leading-tight resize-none border-2 bg-muted/5 shadow-inner p-3"
          />
        </div>

        {/* Result Preview - Maximized Width */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground tracking-tighter px-1">
            <Layout className="w-3.5 h-3.5" /> Result ({activeScenario.name})
          </div>
          
          <div className="bg-muted/20 rounded-2xl border-2 border-dashed min-h-[750px] p-6 overflow-auto max-h-[850px] shadow-inner">
            {activeScenario.error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Failed to Generate</p>
                  <p className="text-xs font-mono break-all">{activeScenario.error}</p>
                </div>
              </div>
            )}

            {activeScenario.isLoading && (
              <div className="flex flex-col items-center justify-center h-[600px] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                <p className="text-sm font-bold animate-pulse text-muted-foreground">AI is brainstorming...</p>
              </div>
            )}

            {activeScenario.result && !activeScenario.isLoading && (
              <Tabs defaultValue="preview" className="w-full">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-transparent py-2 backdrop-blur-sm z-10">
                  <TabsList className="bg-background shadow-sm border h-8">
                    <TabsTrigger value="preview" className="text-[10px] px-4 h-6">Preview</TabsTrigger>
                    <TabsTrigger value="json" className="text-[10px] px-4 h-6">Raw JSON</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Badge variant={activeScenario.result.isValid ? "outline" : "destructive"} className="text-[10px]">
                      {activeScenario.result.isValid ? "Valid" : `Fix: ${activeScenario.result.invalidMealsCount}`}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono">{activeScenario.result.debug?.executionTimeMs}ms</Badge>
                  </div>
                </div>

                <TabsContent value="preview" className="space-y-8 m-0">
                  {Object.entries(activeScenario.result.days).map(([date, day]: [string, any]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-foreground/80">{date}</span>
                        <div className="h-px flex-1 bg-border" />
                        <div className="flex gap-3 text-[10px] font-mono font-bold text-muted-foreground">
                          <span className="bg-muted px-2 py-0.5 rounded">CAL: {day.totalNutrition.calories}</span>
                          <span className="bg-muted px-2 py-0.5 rounded">P: {day.totalNutrition.protein}g</span>
                          <span className="bg-muted px-2 py-0.5 rounded">F: {day.totalNutrition.fat}g</span>
                          <span className="bg-muted px-2 py-0.5 rounded">C: {day.totalNutrition.carbs}g</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        {Object.entries(day.meals).map(([type, meal]: [string, any]) => (
                          <div key={type} className="bg-background border-2 border-border/50 rounded-xl p-3 shadow-sm hover:border-primary/30 transition-all group relative">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest">{type}</span>
                              <Badge variant="secondary" className="text-[8px] h-4 px-1 font-mono">
                                {meal.nutrition.calories} kcal
                              </Badge>
                            </div>
                            <div className="text-xs font-bold leading-snug mb-2 group-hover:text-primary transition-colors min-h-[2.5em] line-clamp-2">
                              {meal.title}
                            </div>
                            
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {meal.tags?.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-[8px] bg-secondary/30 text-secondary-foreground px-1.5 py-0.5 rounded-md">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="flex justify-between text-[9px] font-mono text-muted-foreground border-t pt-1.5 mt-2">
                                <span>P:{meal.nutrition.protein}g</span>
                                <span>F:{meal.nutrition.fat}g</span>
                                <span>C:{meal.nutrition.carbs}g</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="json" className="m-0">
                  <pre className="bg-background border p-4 rounded-xl overflow-auto max-h-[700px] text-[10px] leading-tight font-mono shadow-inner">
                    {JSON.stringify(activeScenario.result, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            )}

            {!activeScenario.result && !activeScenario.isLoading && !activeScenario.error && (
              <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground opacity-20">
                <Play className="w-12 h-12 mb-4" />
                <p className="text-xs font-bold tracking-widest uppercase">Awaiting Execution</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}