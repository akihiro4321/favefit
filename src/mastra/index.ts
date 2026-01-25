/**
 * FaveFit - Mastra Instance
 * Mastraインスタンスとエージェントの登録
 */

import { Mastra } from "@mastra/core";
import { Observability } from "@mastra/observability";
import { LangfuseExporter } from "@mastra/langfuse";
import { nutritionPlannerAgent } from "./agents/nutrition-planner";
import { planGeneratorAgent } from "./agents/plan-generator";
import { recipeCreatorAgent } from "./agents/recipe-creator";
import { menuAdjusterAgent } from "./agents/menu-adjuster";
import { preferenceLearnerAgent } from "./agents/preference-learner";
import { boredomAnalyzerAgent } from "./agents/boredom-analyzer";
import { testPlanGeneratorWorkflow } from "./workflows/test-plan-generator";

/**
 * Mastraインスタンス
 */
export const mastra = new Mastra({
  agents: {
    nutritionPlanner: nutritionPlannerAgent,
    planGenerator: planGeneratorAgent,
    recipeCreator: recipeCreatorAgent,
    menuAdjuster: menuAdjusterAgent,
    preferenceLearner: preferenceLearnerAgent,
    boredomAnalyzer: boredomAnalyzerAgent,
  },
  workflows: {
    testPlanGenerator: testPlanGeneratorWorkflow,
  },
  observability: new Observability({
    configs: {
      langfuse: {
        serviceName: "favefit",
        exporters: [
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
            secretKey: process.env.LANGFUSE_SECRET_KEY || "",
            baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
            options: {
              environment: process.env.NODE_ENV,
            },
          }),
        ],
      },
    },
  }),
});
