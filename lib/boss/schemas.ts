// lib/boss/schemas.ts
import { z } from "zod";

// ============================================================================
// 1. SYSTEM TASK METADATA SCHEMA
// ============================================================================
export const SpoonBossTaskMetadataSchema = z.object({
  seed: z.boolean().optional(),
  bossStageId: z.string().min(1),
  userId: z.string().min(1),
  courseId: z.string().min(1),
  milestoneIndex: z.number().int().positive(),
});

export type SpoonBossTaskMetadata = z.infer<typeof SpoonBossTaskMetadataSchema>;

// ============================================================================
// 2. SCENARIO DATA SCHEMAS (Boss, Exercises, Rules)
// ============================================================================
export const BossAvatarSchema = z.object({
  default: z.string().nullable().optional(),
  happy: z.string().nullable().optional(),
  sad: z.string().nullable().optional(),
  angry: z.string().nullable().optional(),
});

export type BossAvatar = z.infer<typeof BossAvatarSchema>;

export const BossPersonaSchema = z.object({
  name: z.string().min(1),
  persona: z.string().min(1),
  introMessage: z.string().min(1),
  appearance: z.string().nullable().optional(),
  sceneDescription: z.string().nullable().optional(),
  // Backwards-compatible if any older boss stages in the DB used avatarKey
  avatarKey: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  avatar: BossAvatarSchema.nullable().optional(),

  // Video and audio keys
  introAudioKey: z.string().nullable().optional(),
  introVideoKey: z.string().nullable().optional(),
  introVideoS3Key: z.string().nullable().optional(),
});

export type BossPersona = z.infer<typeof BossPersonaSchema>;

export const BossImageOptionSchema = z.object({
  label: z.string().min(1),
  imageKey: z.string().min(1),
});

export const BossExerciseTypeSchema = z.enum([
  "CONVERSATION",
  "MULTIPLE_CHOICE",
  "SENTENCE_BUILDER",
  "PRONUNCIATION",
  "LISTEN_SENTENCE_BUILDER",
  "LISTEN_PICTURE_SELECTOR",
]);

export const BossExerciseSchema = z
  .object({
    id: z.string().min(1),
    type: BossExerciseTypeSchema,
    instruction: z.string().min(1),
    sourceLessonId: z.string().nullable().optional(),
    question: z.string().nullable().optional(),
    options: z.array(z.string()).nullable().optional(),
    correctAnswer: z.union([z.string(), z.array(z.string())]).nullable().optional(),
    scrambledWords: z.array(z.string()).nullable().optional(),
    targetText: z.string().nullable().optional(),
    audioKey: z.string().nullable().optional(),
    imageOptions: z.array(BossImageOptionSchema).nullable().optional(),
  })
  .superRefine((ex, ctx) => {
    // Type-specific safety checks so broken exercises never reach the UI
    if (ex.type === "MULTIPLE_CHOICE") {
      if (!ex.options || ex.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `MULTIPLE_CHOICE (${ex.id}) requires at least 2 options`,
        });
      }
      if (typeof ex.correctAnswer !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `MULTIPLE_CHOICE (${ex.id}) requires string correctAnswer`,
        });
      }
    }

    if (
      ex.type === "SENTENCE_BUILDER" ||
      ex.type === "LISTEN_SENTENCE_BUILDER"
    ) {
      if (!ex.scrambledWords || ex.scrambledWords.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${ex.type} (${ex.id}) requires scrambledWords`,
        });
      }
      if (!Array.isArray(ex.correctAnswer) || ex.correctAnswer.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${ex.type} (${ex.id}) requires string[] correctAnswer`,
        });
      }
    }

    if (
      (ex.type === "PRONUNCIATION" || ex.type === "CONVERSATION") &&
      !ex.targetText
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ex.type} (${ex.id}) requires targetText`,
      });
    }

    if (ex.type === "LISTEN_PICTURE_SELECTOR") {
      if (!ex.imageOptions || ex.imageOptions.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `LISTEN_PICTURE_SELECTOR (${ex.id}) requires imageOptions`,
        });
      }
      if (!ex.audioKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `LISTEN_PICTURE_SELECTOR (${ex.id}) requires audioKey`,
        });
      }
    }
  });

export const BossRulesSchema = z.object({
  passingScore: z.number().int().nonnegative(),
  totalExercises: z.number().int().positive(),
});

export const BossScenarioDataSchema = z.object({
  boss: BossPersonaSchema,
  exerciseBank: z.array(BossExerciseSchema).min(1),
  rules: BossRulesSchema,
});

export type BossExercise = z.infer<typeof BossExerciseSchema>;
export type BossScenarioData = z.infer<typeof BossScenarioDataSchema>;

// ============================================================================
// 3. WEBHOOK PAYLOAD SCHEMA (Discriminated by status)
// ============================================================================
const BossWebhookCompletedSchema = z.object({
  taskId: z.string().min(1),
  status: z.literal("COMPLETED"),
  data: z.object({
    bossStageId: z.string().min(1),
    introVideoS3Key: z.string().nullable().optional(),
    scenarioData: BossScenarioDataSchema,
  }),
});

const BossWebhookFailedSchema = z.object({
  taskId: z.string().min(1),
  status: z.literal("FAILED"),
  error: z.string().optional(),
  data: z
    .object({
      bossStageId: z.string().optional(),
    })
    .optional(),
});

export const BossWebhookPayloadSchema = z.discriminatedUnion("status", [
  BossWebhookCompletedSchema,
  BossWebhookFailedSchema,
]);

export type BossWebhookPayload = z.infer<typeof BossWebhookPayloadSchema>;