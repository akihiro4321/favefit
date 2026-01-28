/**
 * FaveFit - Next.js Instrumentation
 * OpenTelemetry + Langfuse統合
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry
 * @see https://ai-sdk.dev/providers/observability/langfuse
 */

import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export function register() {
  registerOTel({
    serviceName: "favefit",
    traceExporter: new LangfuseExporter(),
  });
}
