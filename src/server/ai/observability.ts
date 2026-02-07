import { LangfuseSpanProcessor, ShouldExportSpan } from '@langfuse/otel';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

// Optional: filter out Next.js infra spans
const shouldExportSpan: ShouldExportSpan = span => {
  return span.otelSpan.instrumentationScope.name !== 'next.js';
};

export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  shouldExportSpan,
});

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
});

tracerProvider.register();


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
export function getTelemetryConfig(options: {
  agentName: string;
  userId?: string;
  processName?: string;
  metadata?: Record<string, string | number | boolean>;
}) {
  const { agentName, userId, processName, metadata } = options;

  const metadataParams: Record<string, string | number | boolean> = {
    agent: agentName,
    ...metadata,
  };

  if (userId) {
    metadataParams.userId = userId;
  }

  if (processName) {
    metadataParams.process = processName;
  }

  // functionIdを "favefit-[processName]-[agentName]" の形式にする
  const functionId = processName 
    ? `favefit-${processName}-${agentName}`
    : `favefit-${agentName}`;

  return {
    isEnabled: isLangfuseEnabled,
    functionId,
    metadata: metadataParams,
  };
}
