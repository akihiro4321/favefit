/**
 * FaveFit - Chunk Detail Generator Function
 */

import { callModelWithSchema } from "../utils/agent-helpers";
import { ChunkDetailedPlan, ChunkDetailedPlanSchema } from "../types/plan";
import {
  CHUNK_DETAIL_GENERATOR_INSTRUCTIONS,
  getChunkDetailPrompt,
  ChunkDetailPromptInput,
} from "../prompts/functions/chunk-detail-generator";
import { SMART_MODEL } from "../config";

/**
 * チャンク（複数日）の詳細な献立を一括生成
 */
export async function generateChunkDetails(
  input: ChunkDetailPromptInput
): Promise<ChunkDetailedPlan> {
  const prompt = getChunkDetailPrompt(input);

  return await callModelWithSchema(
    CHUNK_DETAIL_GENERATOR_INSTRUCTIONS,
    prompt,
    ChunkDetailedPlanSchema,
    SMART_MODEL
  );
}
