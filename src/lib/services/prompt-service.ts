import { Langfuse } from "langfuse";

/**
 * PromptService
 * Langfuseのマネージドプロンプトを取得するためのサービス
 */
export class PromptService {
  private static instance: PromptService;
  private langfuse: Langfuse;

  private constructor() {
    this.langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
      secretKey: process.env.LANGFUSE_SECRET_KEY || "",
      baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
    });

    // 開発中のエラー検知用
    this.langfuse.on("error", (error) => {
      console.error("[PromptService] Langfuse error:", error);
    });
  }

  public static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  /**
   * Langfuseのプロンプトオブジェクトを直接取得します（Chatプロンプト用）
   */
  public async getPrompt(name: string, label: string = "production") {
    return await this.langfuse.getPrompt(name, undefined, {
      label,
      cacheTtlSeconds: 300,
    });
  }

  /**
   * 指定された名前のプロンプトをLangfuseから取得します。
   */
  public async getInstructions(
    name: string,
    fallback?: string,
    label: string = "production"
  ): Promise<string> {
    try {
      const prompt = await this.getPrompt(name, label);

      // Chatプロンプトの場合はsystemメッセージを探す
      if (Array.isArray(prompt.prompt)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const systemMessage = (prompt.prompt as any[]).find(m => m.role === "system");
        if (systemMessage) return systemMessage.content;
      }

      return prompt.compile();
    } catch (error) {
      if (fallback !== undefined) {
        console.warn(`[PromptService] Failed to fetch prompt "${name}" (label: ${label}), using fallback.`, error);
        return fallback;
      }
      console.error(`[PromptService] Failed to fetch prompt "${name}" (label: ${label}) and no fallback provided.`, error);
      throw error;
    }
  }

  /**
   * 指定された名前のプロンプトをLangfuseから取得し、変数を埋め込んでコンパイルします。
   */
  public async getCompiledPrompt(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables: Record<string, any>,
    fallback?: string,
    label: string = "production"
  ): Promise<string> {
    try {
      const prompt = await this.getPrompt(name, label);
      const compiled = prompt.compile(variables);

      // Chatプロンプトの場合はuserメッセージを探す
      if (Array.isArray(compiled)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userMessage = (compiled as any[]).find(m => m.role === "user");
        if (userMessage) return userMessage.content;
      }

      return compiled as string;
    } catch (error) {
      if (fallback !== undefined) {
        console.warn(`[PromptService] Failed to fetch prompt "${name}" (label: ${label}), using fallback.`, error);
        
        let compiledFallback = fallback;
        Object.entries(variables).forEach(([key, value]) => {
          compiledFallback = compiledFallback.replaceAll(`{{${key}}}`, String(value));
        });
        return compiledFallback;
      }
      
      console.error(`[PromptService] Failed to fetch prompt "${name}" (label: ${label}) and no fallback provided.`, error);
      throw error;
    }
  }
}
