/**
 * FaveFit v2 - テストエージェントAPI (コントローラー)
 * POST /api/test-agent
 */

import { NextRequest } from "next/server";
import { testAgent } from "@/lib/services/test-agent-service";
import { HttpError, successResponse, withValidation } from "@/lib/api-utils";
import { z } from "zod";

const TestAgentRequestSchema = z.object({
  agentId: z.string().min(1),
  input: z.unknown(),
  userId: z.string().optional(),
});

/**
 * エージェントをテスト実行
 */
export const POST = withValidation(
  TestAgentRequestSchema,
  async (data: z.infer<typeof TestAgentRequestSchema>) => {
    try {
      const result = await testAgent({
        agentId: data.agentId,
        input: data.input,
        userId: data.userId,
      });
      return successResponse(result);
    } catch (error: unknown) {
      console.error("Agent execution error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return HttpError.internalError(message);
    }
  }
);
