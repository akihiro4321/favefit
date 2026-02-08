/**
 * FaveFit - AI Module Exports
 * Vercel AI SDK を使用したAI機能のエントリポイント
 */

// ============================================
// Config
// ============================================
export {
  genAI,
  GEMINI_3_FLASH_MODEL,
  GEMINI_3_PRO_MODEL,
  GEMINI_2_5_FLASH_MODEL,
} from "./config";

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

export { runPlanGeneratorV2 } from "./agents/plan-generator-v2";

// ============================================
// Functions
// ============================================
export {
  generateRecipeData,
  RecipeOutputSchema,
  type Recipe,
} from "./functions/recipe-generator";

export {
  generateMenuSuggestions,
  MenuAdjusterInputSchema,
  MenuAdjusterOutputSchema,
  type MenuAdjusterInput,
  type MenuAdjusterOutput,
} from "./functions/menu-suggester";

export {
  analyzePreferenceData,
  PreferenceLearnerInputSchema,
  PreferenceLearnerOutputSchema,
  type PreferenceLearnerInput,
  type PreferenceLearnerOutput,
  type PreferenceAnalysis,
} from "./functions/preference-analyzer";

export { estimateDailyDietBaseline } from "./functions/diet-estimator";
export { auditPlanAnchors, type AuditorOutput } from "./functions/plan-auditor";
export { generatePlanSkeleton } from "./functions/plan-skeleton-generator";
export { generateChunkDetails } from "./functions/chunk-detail-generator";

// ============================================
// Prompts
// ============================================

// Agents
export {
  PLAN_GENERATOR_INSTRUCTIONS,
  getPlanGenerationPrompt,
  getSingleMealFixPrompt,
  getBatchMealFixPrompt,
} from "./prompts/agents/plan-generator";

// Functions
export {
  AUDITOR_INSTRUCTIONS,
  getAuditorPrompt,
} from "./prompts/functions/plan-auditor";

export {
  RECIPE_CREATOR_INSTRUCTIONS,
  buildRecipePrompt,
} from "./prompts/functions/recipe-generator";

export {
  MENU_ADJUSTER_INSTRUCTIONS,
  getMenuAdjustmentPrompt,
} from "./prompts/functions/menu-suggester";

export {
  PREFERENCE_LEARNER_INSTRUCTIONS,
  getPreferenceLearningPrompt,
} from "./prompts/functions/preference-analyzer";

export {
  DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
  getDailyDietBaselinePrompt,
} from "./prompts/functions/diet-estimator";

export {
  PLAN_SKELETON_GENERATOR_INSTRUCTIONS,
  getPlanSkeletonPrompt,
} from "./prompts/functions/plan-skeleton-generator";

export {
  CHUNK_DETAIL_GENERATOR_INSTRUCTIONS,
  getChunkDetailPrompt,
} from "./prompts/functions/chunk-detail-generator";

// ============================================
// Workflows
// ============================================
export {
  generateMealPlan,
  type MealPlanWorkflowInput,
  type MealPlanWorkflowResult,
} from "./workflows/meal-plan-generation";

export { generateMealPlanV2 } from "./workflows/meal-plan-generation-v2";