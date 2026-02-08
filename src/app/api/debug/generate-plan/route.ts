import { NextRequest, NextResponse } from "next/server";
import { generateMealPlan, generateMealPlanV2, MealPlanWorkflowInput } from "@/server/ai";

/**
 * デバッグ用：食事プラン生成ワークフローを直接実行するAPI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { version, ...workflowInput } = body;
    
    // 入力のバリデーション（簡易）
    if (!workflowInput.input || !workflowInput.mealTargets) {
      return NextResponse.json(
        { error: "Invalid input. 'input' and 'mealTargets' are required." },
        { status: 400 }
      );
    }

    console.log(`[Debug API] Starting meal plan generation (Version: ${version || 'v1'})...`);
    const startTime = Date.now();
    
    const result = version === "v2" 
      ? await generateMealPlanV2(workflowInput as MealPlanWorkflowInput)
      : await generateMealPlan(workflowInput as MealPlanWorkflowInput);
    
    const executionTime = Date.now() - startTime;
    console.log(`[Debug API] Completed in ${executionTime}ms`);

    return NextResponse.json({
      ...result,
      debug: {
        executionTimeMs: executionTime,
        version: version || "v1"
      }
    });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
