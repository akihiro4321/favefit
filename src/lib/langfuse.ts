/* eslint-disable @typescript-eslint/no-explicit-any */
import { Langfuse } from "langfuse";

// Langfuse クライアントの初期化
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
});

/**
 * ADK の実行を Langfuse でトレースするヘルパー
 */
export async function withLangfuseTrace<T>(
  traceName: string,
  userId: string,
  input: unknown,
  fn: (trace: any) => Promise<T>
): Promise<T> {
  const trace = langfuse.trace({
    name: traceName,
    userId: userId,
    input: input as any,
  });

  try {
    const result = await fn(trace);
    trace.update({
      output: result as any,
    });
    return result;
  } catch (error) {
    trace.update({
      output: { error: error instanceof Error ? error.message : String(error) } as any,
    });
    throw error;
  } finally {
    // サーバーレス環境での確実な送信のため
    await langfuse.flushAsync();
  }
}

export default langfuse;
