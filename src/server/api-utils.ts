/**
 * FaveFit v2 - API バリデーション & エラーハンドリング
 * Spring Boot の Bean Validation + @RestControllerAdvice に相当
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError, ZodSchema } from "zod";

// ========================================
// エラーレスポンス型
// ========================================

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
  code?: string;
}

// ========================================
// 共通 HTTP エラー
// ========================================

export const HttpError = {
  badRequest: (message: string, details?: Record<string, string[]>) =>
    NextResponse.json(
      { error: message, details, code: "BAD_REQUEST" } as ApiErrorResponse,
      { status: 400 }
    ),

  unauthorized: (message = "認証が必要です") =>
    NextResponse.json(
      { error: message, code: "UNAUTHORIZED" } as ApiErrorResponse,
      { status: 401 }
    ),

  forbidden: (message = "アクセス権限がありません") =>
    NextResponse.json(
      { error: message, code: "FORBIDDEN" } as ApiErrorResponse,
      { status: 403 }
    ),

  notFound: (message = "リソースが見つかりません") =>
    NextResponse.json(
      { error: message, code: "NOT_FOUND" } as ApiErrorResponse,
      { status: 404 }
    ),

  internalError: (message = "サーバーエラーが発生しました") =>
    NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" } as ApiErrorResponse,
      { status: 500 }
    ),
};

// ========================================
// Zod エラーフォーマット
// ========================================

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "body";
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return details;
}

// ========================================
// 成功レスポンス
// ========================================

export function successResponse<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data });
}

// ========================================
// 🎯 宣言的 API ハンドラ (Spring Boot 風)
// ========================================

/**
 * バリデーション付き API ハンドラを作成
 * 
 * Spring Boot の @Valid @RequestBody に相当する機能を提供
 * コントローラー側でバリデーション処理を書く必要がなくなる
 * 
 * @example
 * // スキーマを定義（DTO に相当）
 * const MyRequestSchema = z.object({
 *   userId: z.string().min(1),
 *   data: z.object({ ... }),
 * });
 * 
 * // ハンドラを export（バリデーションは自動実行）
 * export const POST = withValidation(MyRequestSchema, async (data, req) => {
 *   // data は型安全（z.infer<typeof MyRequestSchema>）
 *   const { userId } = data;
 *   // ... ビジネスロジック
 *   return successResponse({ result: "ok" });
 * });
 */
export function withValidation<T extends ZodSchema>(
  schema: T,
  handler: (data: z.infer<T>, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 1. JSON パース
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return HttpError.badRequest("無効なJSONフォーマットです");
      }

      // 2. バリデーション（Spring Boot の @Valid に相当）
      const result = schema.safeParse(body);
      if (!result.success) {
        const details = formatZodErrors(result.error);
        return HttpError.badRequest("バリデーションエラー", details);
      }

      // 3. ハンドラ実行
      return await handler(result.data, req);
    } catch (error: unknown) {
      // 4. 例外ハンドリング（Spring Boot の @ExceptionHandler に相当）
      console.error("API Error:", error);
      return HttpError.internalError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };
}

// ========================================
// 共通リクエストスキーマ
// ========================================

export const AuthenticatedRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
});
