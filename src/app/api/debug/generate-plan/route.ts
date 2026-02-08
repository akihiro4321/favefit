import { NextRequest, NextResponse } from "next/server";
import { generateMealPlan, MealPlanWorkflowInput } from "@/server/ai";

/**
 * デバッグ用：食事プラン生成ワークフローを直接実行するAPI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 入力のバリデーション（簡易）
    if (!body.input || !body.mealTargets) {
      return NextResponse.json(
        { error: "Invalid input. 'input' and 'mealTargets' are required." },
        { status: 400 }
      );
    }

    const workflowInput: MealPlanWorkflowInput = body;

    console.log("[Debug API] Starting meal plan generation...");
    const startTime = Date.now();
    
    const result = await generateMealPlan(workflowInput);
    
    const executionTime = Date.now() - startTime;
    console.log(`[Debug API] Completed in ${executionTime}ms`);

    return NextResponse.json({
      ...result,
      debug: {
        executionTimeMs: executionTime,
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
