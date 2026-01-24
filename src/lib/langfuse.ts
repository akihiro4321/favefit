/* eslint-disable @typescript-eslint/no-explicit-any */
import { Langfuse } from "langfuse";
import { Event, getFunctionCalls, getFunctionResponses, stringifyContent } from "@google/adk";

// Langfuse クライアントの初期化
// バッチングを無効化してよりリアルタイムに送信する場合は、flushAtやflushIntervalを設定
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
  // よりリアルタイムに送信するための設定（オプション）
  // flushAt: 1, // 1イベントごとに送信（パフォーマンスに影響する可能性）
  // flushInterval: 1000, // 1秒ごとに送信
});

/**
 * ADK の実行を Langfuse でトレースするヘルパー
 * 
 * 【役割】
 * - トレースの作成と管理（開始、終了、エラーハンドリング）
 * - 入力と出力の記録
 * - サーバーレス環境での確実な送信（flushAsync）
 * 
 * 【使い方】
 * 呼び出し時に使用し、関数内で`trace`オブジェクトを受け取って
 * `processAdkEventsWithTrace`などと組み合わせて使用します。
 * 
 * @param traceName トレース名（Langfuse上で表示される名前）
 * @param userId ユーザーID
 * @param input 入力データ（トレースの入力として記録）
 * @param fn 実行する関数（traceオブジェクトを受け取る）
 * @returns 関数の実行結果
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
    trace.end({
      output: result as any,
    });
    return result;
  } catch (error) {
    trace.end({
      output: { error: error instanceof Error ? error.message : String(error) } as any,
      level: "ERROR",
    });
    throw error;
  } finally {
    // サーバーレス環境での確実な送信のため
    await langfuse.flushAsync();
  }
}

/**
 * ADK のイベントストリームを処理しながら Langfuse に記録するヘルパー
 * 
 * 【役割】
 * - アウトプット（イベントストリーム）を処理しながら、その間のプロセス全てをトレース
 * - LLM呼び出しを`trace.generation()`で記録（プロンプト、レスポンス、トークン使用量）
 * - ツール呼び出しを`trace.span()`で記録（ツール名、引数、レスポンス）
 * - ストリーミング中のコンテンツ更新
 * 
 * 【注意】
 * - Langfuse SDKはデフォルトでバッチングを使用するため、トレースは処理完了後に送信されます
 * - よりリアルタイムに送信するには、`flushAt`や`flushInterval`を設定するか、
 *   コメントアウトされている`flushAsync()`を有効化してください（パフォーマンスに影響する可能性あり）
 * 
 * 【ADKとMastraの比較】
 * - Mastra: Langfuseとの統合が組み込まれており、よりシンプルに使用可能
 * - ADK: まだ新しいフレームワークで、Langfuseとの統合は公式には提供されていないため、
 *   手動で統合する必要があります（本実装がその例）
 * 
 * 【使い方】
 * `withLangfuseTrace`内で使用し、ADKのイベントストリームを処理しながら
 * 詳細なトレーサビリティを提供します。
 * 
 * @param trace `withLangfuseTrace`から受け取ったtraceオブジェクト
 * @param events ADKのイベントストリーム（runner.runAsyncの戻り値）
 * @param userMessage ユーザーメッセージ（オプション、generationのinputとして使用）
 * @returns イベントから抽出したテキストコンテンツの全体
 */
export async function processAdkEventsWithTrace(
  trace: any,
  events: AsyncGenerator<Event, void, undefined>,
  userMessage?: { role: string; parts: Array<{ text?: string }> }
): Promise<string> {
  let currentGeneration: any = null;
  const toolSpans: Map<string, any> = new Map();
  let accumulatedContent = "";
  let userPrompt = "";
  let fullText = "";

  // userMessageから初期プロンプトを抽出
  if (userMessage && userMessage.parts) {
    userPrompt = userMessage.parts
      .map((part) => part.text || "")
      .filter(Boolean)
      .join("\n");
  }

  for await (const event of events) {
    // ユーザーメッセージを記録
    if (event.author === "user") {
      const content = stringifyContent(event);
      if (content) {
        userPrompt = content;
      }
    }

    // LLM呼び出し（エージェントからのレスポンス）を記録
    if (event.author && event.author !== "user") {
      const content = stringifyContent(event);
      if (content) {
        accumulatedContent += content;
        fullText += content;

        // 新しいgenerationを開始（まだ開始していない場合）
        if (!currentGeneration) {
          currentGeneration = trace.generation({
            name: `llm-call-${event.author}`,
            model: event.author,
            input: userPrompt || "No input provided",
            metadata: {
              invocationId: event.invocationId,
              eventId: event.id,
            },
          });
        }

        // ストリーミング中のコンテンツを更新
        if (currentGeneration) {
          currentGeneration.update({
            output: accumulatedContent,
            usage: event.usageMetadata
              ? {
                  input: event.usageMetadata.promptTokenCount || 0,
                  output: event.usageMetadata.candidatesTokenCount || 0,
                  total: event.usageMetadata.totalTokenCount || 0,
                }
              : undefined,
          });
        }

        // ターンが完了した場合、generationを完了
        if (event.turnComplete && currentGeneration) {
          currentGeneration.end({
            output: accumulatedContent,
            usage: event.usageMetadata
              ? {
                  input: event.usageMetadata.promptTokenCount || 0,
                  output: event.usageMetadata.candidatesTokenCount || 0,
                  total: event.usageMetadata.totalTokenCount || 0,
                }
              : undefined,
          });
          accumulatedContent = "";
          currentGeneration = null;
          
          // よりリアルタイムに送信するために、完了時にflush（オプション）
          // パフォーマンスに影響する可能性があるため、必要に応じて有効化
          // await langfuse.flushAsync();
        }
      }
    }

    // ツール呼び出しを記録
    const functionCalls = getFunctionCalls(event);
    for (const funcCall of functionCalls) {
      const toolName = funcCall.name;
      if (toolName) {
        const toolSpan = trace.span({
          name: `tool-${toolName}`,
          input: {
            name: toolName,
            args: funcCall.args,
          },
          metadata: {
            invocationId: event.invocationId,
            eventId: event.id,
          },
        });
        toolSpans.set(toolName, toolSpan);
      }
    }

    // ツールレスポンスを記録
    const functionResponses = getFunctionResponses(event);
    for (const funcResponse of functionResponses) {
      const toolName = funcResponse.name;
      if (toolName) {
        const toolSpan = toolSpans.get(toolName);
        if (toolSpan) {
          toolSpan.end({
            output: funcResponse.response,
          });
          toolSpans.delete(toolName);
          
          // よりリアルタイムに送信するために、完了時にflush（オプション）
          // パフォーマンスに影響する可能性があるため、必要に応じて有効化
          // await langfuse.flushAsync();
        }
      }
    }
  }

  // 残っているgenerationを完了
  if (currentGeneration) {
    currentGeneration.end({
      output: accumulatedContent,
    });
  }

  // 残っているtool spanを完了
  for (const [, span] of toolSpans.entries()) {
    span.end();
  }

  return fullText;
}

export default langfuse;
