import { z } from "zod";

export const GraduationTaskMetadataSchema = z.object({
  graduationId: z.string().min(1),
  userId: z.string().min(1),
  courseId: z.string().min(1),
  milestoneIndex: z.number().int().positive(),
});

export const GraduationCanDoItemSchema = z.object({
  spoonNumber: z.number().int().positive(),
  title: z.string().min(1),
  canDoNative: z.string().min(1),
  targetSentence: z.string().min(1),
  nativeSentence: z.string().min(1),
  audioS3Key: z.string().nullable().optional(),
});

export const GraduationDataSchema = z.object({
  milestoneIndex: z.number().int().positive(),
  milestoneTheme: z.string().min(1),
  badgeTitle: z.string().min(1),
  spriteSlug: z.string().min(1),
  spriteName: z.string().min(1),
  speechNative: z.string().min(1),
  speechTarget: z.string().min(1),
  speechTargetGloss: z.string().min(1),
  nextMilestoneTeaser: z.string().min(1),
  coverImageS3Key: z.string().nullable().optional(),
  videoS3Key: z.string().nullable().optional(),
  audioNativeS3Key: z.string().nullable().optional(),
  audioTargetS3Key: z.string().nullable().optional(),
  canDoItems: z.array(GraduationCanDoItemSchema).min(1).max(3),
});

export const GraduationWebhookPayloadSchema = z.discriminatedUnion("status", [
  z.object({
    taskId: z.string().min(1),
    status: z.literal("COMPLETED"),
    data: z.object({
      graduationId: z.string().min(1),
      graduationData: GraduationDataSchema,
    }),
  }),
  z.object({
    taskId: z.string().min(1),
    status: z.literal("FAILED"),
    error: z.string().optional(),
  }),
]);

export type GraduationData = z.infer<typeof GraduationDataSchema>;
export type GraduationCanDoItem = z.infer<typeof GraduationCanDoItemSchema>;