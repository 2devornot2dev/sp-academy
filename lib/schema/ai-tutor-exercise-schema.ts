// lib/schema/ai-tutor-exercise-schema.ts
import { z } from "zod";

export const VisualMatchCardSchema = z.object({
  id: z.string(),
  word: z.string(),
  translation: z.string(),
  imagePrompt: z.string().optional(),
  imageS3Key: z.string().nullable().optional(),
  audioS3Key: z.string().nullable().optional(),
});

export const VisualMatchRoundSchema = z.object({
  type: z.literal("visual_match").default("visual_match"),
  title: z.string().default("Visual Match"),
  instruction: z.string(),
  cards: z.array(VisualMatchCardSchema).min(1),
});

export const SentenceDashForkSchema = z.object({
  correct: z.string(),
  trap: z.string(),
  whyTrap: z.string().optional().default(""),
});

export const SentenceDashItemSchema = z.object({
  id: z.string(),
  promptNative: z.string(),
  fullTarget: z.string(),
  audioS3Key: z.string().nullable().optional(),
  forks: z.array(SentenceDashForkSchema).min(1),
});

export const SentenceDashRoundSchema = z.object({
  type: z.literal("binary_sentence_dash").default("binary_sentence_dash"),
  title: z.string().default("Sentence Dash"),
  instruction: z.string(),
  items: z.array(SentenceDashItemSchema).min(1),
});

export const SpeechBurstRoundSchema = z.object({
  type: z.literal("speech_burst").default("speech_burst"),
  title: z.string().default("3x Voice Drill"),
  instruction: z.string(),
  targetPhrase: z.string(),
  translation: z.string(),
  phoneticHint: z.string().optional().nullable(),
  requiredReps: z.number().default(3),
  audioS3Key: z.string().nullable().optional(),
});

export const TutorExerciseContentSchema = z.object({
  visualMatch: VisualMatchRoundSchema,
  sentenceDash: SentenceDashRoundSchema,
  speechBurst: SpeechBurstRoundSchema,
});

export const TutorExerciseWebhookSchema = z.object({
  status: z.enum(["COMPLETED", "SUCCESS", "FAILED"]).optional().default("COMPLETED"),
  exerciseId: z.string().optional(),
  sessionId: z.string().optional(),
  reviewId: z.string().optional(),
  userId: z.string().optional(),
  content: TutorExerciseContentSchema.optional(),
  error: z.string().optional(),
});

export type TutorExerciseContent = z.infer<typeof TutorExerciseContentSchema>;
export type TutorExerciseWebhookPayload = z.infer<typeof TutorExerciseWebhookSchema>;