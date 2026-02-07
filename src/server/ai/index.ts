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
export { getTelemetryConfig } from "./observability";

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
  callModelWithSchema as runAgentWithSchema,
  formatPreferences,
  formatArray,
  getModel,
  type ModelType,
} from "./utils/agent-helpers";

// ============================================
// Agents
// ============================================

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

export { runAuditor, type AuditorOutput } from "./agents/auditor";

export { runDietBaselineEstimator } from "./agents/diet-baseline-estimator";

// ============================================
// Prompts
// ============================================
export {
  PLAN_GENERATOR_INSTRUCTIONS,
  getPlanGenerationPrompt,
  getSingleMealFixPrompt,
  getBatchMealFixPrompt,
} from "./agents/prompts/plan-generator";

export {
  RECIPE_CREATOR_INSTRUCTIONS,
  buildRecipePrompt,
} from "./agents/prompts/recipe-creator";

export {
  MENU_ADJUSTER_INSTRUCTIONS,
  getMenuAdjustmentPrompt,
} from "./agents/prompts/menu-adjuster";

export {
  PREFERENCE_LEARNER_INSTRUCTIONS,
  getPreferenceLearningPrompt,
} from "./agents/prompts/preference-learner";

export {
  AUDITOR_INSTRUCTIONS,
  getAuditorPrompt,
} from "./agents/prompts/auditor";

export {
  DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
  getDietBaselineEstimationPrompt,
} from "./agents/prompts/diet-baseline-estimator";

// ============================================
// Workflows
// ============================================
export {
  generateMealPlan,
  type MealPlanWorkflowInput,
  type MealPlanWorkflowResult,
} from "./workflows/meal-plan-generation";

export {
  generateRecipe,
  type RecipeGenerationWorkflowInput,
  type RecipeGenerationWorkflowResult,
} from "./workflows/recipe-generation";

export {
  learnPreferences,
  type PreferenceLearningWorkflowInput,
  type PreferenceLearningWorkflowResult,
} from "./workflows/preference-learning";

export {
  adjustMenu,
  type MenuAdjustmentWorkflowInput,
  type MenuAdjustmentWorkflowResult,
} from "./workflows/menu-adjustment";

export {
  analyzeCurrentIntake,
  type DietAnalysisWorkflowInput,
  type DietAnalysisWorkflowResult,
} from "./workflows/diet-analysis";
