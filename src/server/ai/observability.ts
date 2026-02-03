/**
 * FaveFit - AI Observability Configuration
 * Langfuse統合による可観測性設定
 * 
 * OpenTelemetry統合は src/instrumentation.ts で設定
 * このファイルはテレメトリ設定のヘルパーを提供
 */

// ============================================
// 設定
// ============================================

const isLangfuseEnabled = Boolean(
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
);

// ============================================
// テレメトリ設定ヘルパー
// ============================================

/**
 * Vercel AI SDKのテレメトリ設定を取得
 * これを各generateObject/generateText呼び出しに渡す
 */
export function getTelemetryConfig(
  agentName: string,
  userId?: string,
  metadata?: Record<string, string | number | boolean>
) {
  const metadataParams: Record<string, string | number | boolean | null | undefined> = {
    agent: agentName,
    ...metadata,
  };

  if (userId) {
    metadataParams.userId = userId;
  }

  // Cast to specific type expected by AI SDK/OTel if needed, but simple Record should work if types match
  return {
    isEnabled: isLangfuseEnabled,
    functionId: `favefit-${agentName}`,
    metadata: metadataParams as Record<string, any>,
  };
}

/**
 * Langfuseが有効かどうか
 */
export function isObservabilityEnabled(): boolean {
  return isLangfuseEnabled;
}
