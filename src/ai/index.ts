/**
 * FaveFit - AI Module Exports
 * Vercel AI SDK を使用したAI機能のエントリポイント
 */

// ============================================
// Config
// ============================================
export { google, geminiFlash, geminiPro } from "./config";

// ============================================
// Observability
// ============================================
export {
  getTelemetryConfig,
  isObservabilityEnabled,
} from "./observability";

// ============================================
// Common Types
// ============================================
export {
  NutritionValuesSchema,
  IngredientItemSchema,
  PreferencesProfileSchema,
  MealTypeSchema,
  SingleMealSchema,
  success,
  failure,
  type NutritionValues,
  type IngredientItem,
  type PreferencesProfile,
  type MealType,
  type SingleMeal,
  type AgentResult,
} from "./types/common";

// ============================================
// Helpers
// ============================================
export {
  runAgent,
  runAgentWithSchema,
  runTextAgent,
  parseJsonFromText,
  formatPreferences,
  formatArray,
  getModel,
  type ModelType,
  type AgentConfig,
} from "./utils/agent-helpers";

// ============================================
// Tools
// ============================================
export {
  nutritionCalculatorTool,
  CalculateMacroGoalsOutputSchema,
} from "./tools/nutrition-calculator";

// ============================================
// Agents
// ============================================
export {
  runNutritionPlanner,
  NutritionOutputSchema,
  type NutritionOutput,
} from "./agents/nutrition-planner";

export {
  runPlanGenerator,
  runPartialPlanGenerator,
  PlanGeneratorInputSchema,
  PlanGeneratorOutputSchema,
  PartialPlanOutputSchema,
  DEFAULT_PLAN_DURATION_DAYS,
  type PlanGeneratorInput,
  type PlanGeneratorOutput,
} from "./agents/plan-generator";

export {
  runRecipeCreator,
  RecipeOutputSchema,
  buildRecipePrompt,
  type Recipe,
} from "./agents/recipe-creator";

export {
  runMenuAdjuster,
  MenuAdjusterInputSchema,
  MenuAdjusterOutputSchema,
  type MenuAdjusterInput,
  type MenuAdjusterOutput,
} from "./agents/menu-adjuster";

export {
  runPreferenceLearner,
  PreferenceLearnerInputSchema,
  PreferenceLearnerOutputSchema,
  type PreferenceLearnerInput,
  type PreferenceLearnerOutput,
  type PreferenceAnalysis,
} from "./agents/preference-learner";

export {
  runBoredomAnalyzer,
  runSimpleBoredomAnalysis,
  runExplorationAnalysis,
  BoredomAnalyzerInputSchema,
  BoredomAnalyzerOutputSchema,
  SimpleBoredomAnalysisSchema,
  ExplorationProfileSchema,
  type BoredomAnalyzerInput,
  type BoredomAnalyzerOutput,
  type SimpleBoredomAnalysis,
  type ExplorationProfile,
} from "./agents/boredom-analyzer";

// ============================================
// Prompts
// ============================================
export {
  PLAN_GENERATOR_INSTRUCTIONS,
  getPlanGenerationPrompt,
  getSingleMealFixPrompt,
  getBatchMealFixPrompt,
} from "./agents/prompts/plan-generator";

// ============================================
// Workflows
// ============================================
export {
  generateMealPlan,
  type MealPlanWorkflowInput,
  type MealPlanWorkflowResult,
} from "./workflows/meal-plan-generation";
