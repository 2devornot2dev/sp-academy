// lib/schema/ladder-schema.ts
import { z } from "zod";

export const LadderItemSchema = z.object({
  id: z.string(),
  pairGroup: z.number().int().min(1).max(4),
  word: z.string(),
  gloss: z.string(),
  tag: z.string(), // e.g. "♂ Masculine", "Opposite", "Past"
  imageIndex: z.number().int().min(0).max(7),
  wordAudioS3Key: z.string().nullable().optional(),
  // Stage 2: 3-Rung Sentence Stack
  rung1: z.string(),
  rung2: z.string(),
  rung2Gloss: z.string(),
  rung2AudioS3Key: z.string().nullable().optional(),
  rung3: z.string(),
  rung3Gloss: z.string(),
  rung3AudioS3Key: z.string().nullable().optional(),
});

export const LadderFlipChallengeSchema = z.object({
  id: z.string(),
  cueNative: z.string(), // e.g. "Flip it to the OPPOSITE!"
  promptTarget: z.string(),
  promptNative: z.string(),
  promptAudioS3Key: z.string().nullable().optional(),
  targetAnswer: z.string(),
  targetAnswerNative: z.string(),
  targetAnswerAudioS3Key: z.string().nullable().optional(),
  acceptableAnswers: z.array(z.string()).min(1),
  distractors: z.array(z.string()).min(2),
});

export const LadderLocaleContentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  items: z.array(LadderItemSchema).min(4).max(8),
  flips: z.array(LadderFlipChallengeSchema).min(2).max(6),
});

export const LadderWebhookPayloadSchema = z.object({
  status: z.enum(["COMPLETED", "FAILED"]).default("COMPLETED"),
  slug: z.string(),
  rungOrder: z.number().int().min(1),
  tier: z.number().int().min(1).max(3).default(1),
  category: z.string(),
  icon: z.string().default("🪜"),
  accentColor: z.string().default("sky"),
  imageS3Keys: z.array(z.string()).min(4),
  translations: z.record(z.string(), LadderLocaleContentSchema),
  error: z.string().optional(),
});

export type LadderItem = z.infer<typeof LadderItemSchema>;
export type LadderFlipChallenge = z.infer<typeof LadderFlipChallengeSchema>;
export type LadderLocaleContent = z.infer<typeof LadderLocaleContentSchema>;
export type LadderWebhookPayload = z.infer<typeof LadderWebhookPayloadSchema>;