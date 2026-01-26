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
   * 指定された名前のプロンプトをLangfuseから取得します。
   * 取得に失敗した場合は fallback を返します。
   * 
   * @param name プロンプト名
   * @param fallback フォールバック文字列
   * @param tag プロンプトラベル（デフォルト: production）
   * @returns コンパイルされたプロンプト文字列
   */
  public async getInstructions(
    name: string,
    fallback?: string,
    label: string = "production"
  ): Promise<string> {
    try {
      const prompt = await this.langfuse.getPrompt(name, undefined, {
        label,
        cacheTtlSeconds: 300, 
      });

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
   * 
   * @param name プロンプト名
   * @param variables 埋め込む変数
   * @param fallback フォールバック文字列（任意）
   * @param label プロンプトラベル（デフォルト: production）
   * @returns コンパイルされたプロンプト文字列
   */
  public async getCompiledPrompt(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables: Record<string, any>,
    fallback?: string,
    label: string = "production"
  ): Promise<string> {
    try {
      const prompt = await this.langfuse.getPrompt(name, undefined, {
        label,
        cacheTtlSeconds: 300,
      });

      return prompt.compile(variables);
    } catch (error) {
      if (fallback !== undefined) {
        console.warn(`[PromptService] Failed to fetch prompt "${name}" (label: ${label}), using fallback.`, error);
        
        // フォールバック文字列内の {{variable}} を簡易的に置換
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
