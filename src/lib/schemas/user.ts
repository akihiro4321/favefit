import { z } from "zod";
import { NutritionPreferencesSchema } from "@/lib/tools/calculateMacroGoals";

export const CalculateNutritionRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  profile: z.object({
    age: z
      .number({ required_error: "age は必須です" })
      .int("age は整数である必要があります")
      .min(1, "age は1以上である必要があります")
      .max(120, "age は120以下である必要があります"),
    gender: z.enum(["male", "female"], {
      required_error: "gender は必須です",
      invalid_type_error: "gender は male または female である必要があります",
    }),
    height_cm: z
      .number({ required_error: "height_cm は必須です" })
      .min(50, "height_cm は50以上である必要があります")
      .max(300, "height_cm は300以下である必要があります"),
    weight_kg: z
      .number({ required_error: "weight_kg は必須です" })
      .min(10, "weight_kg は10以上である必要があります")
      .max(500, "weight_kg は500以下である必要があります"),
    activity_level: z.enum(
      ["sedentary", "light", "moderate", "active", "very_active"],
      {
        required_error: "activity_level は必須です",
      }
    ),
    goal: z.enum(["lose", "maintain", "gain"], {
      required_error: "goal は必須です",
    }),
  }),
  preferences: NutritionPreferencesSchema.optional(),
});

export const UpdateNutritionPreferencesSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  preferences: NutritionPreferencesSchema,
});

export const LearnPreferenceRequestSchema = z.object({
  userId: z.string().min(1),
  recipeId: z.string().min(1),
  feedback: z.object({
    wantToMakeAgain: z.boolean(),
    comment: z.string().optional(),
  }),
});

export const UpdateLearnedPreferencesRequestSchema = z.object({
  userId: z.string().min(1),
  cuisineUpdates: z.record(z.number()).optional(),
  flavorUpdates: z.record(z.number()).optional(),
  newDisliked: z.array(z.string()).optional(),
});

export type CalculateNutritionRequest = z.infer<
  typeof CalculateNutritionRequestSchema
>;
export type UpdateNutritionPreferencesRequest = z.infer<
  typeof UpdateNutritionPreferencesSchema
>;
export type LearnPreferenceRequest = z.infer<
  typeof LearnPreferenceRequestSchema
>;
export type UpdateLearnedPreferencesRequest = z.infer<
  typeof UpdateLearnedPreferencesRequestSchema
>;
