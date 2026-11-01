// lib/schema/book-schema.ts
import { z } from "zod";

export const BookWordTimestampSchema = z.object({
  word: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
});

export const BookSentenceSchema = z.object({
  sentenceIndex: z.number().int().nonnegative(),
  textTarget: z.string(),
  textNative: z.string(),
  audioS3Key: z.string().min(1),
  audioUrl: z.string().optional().nullable(),
  wordTimestamps: z.array(BookWordTimestampSchema).default([]),
});

// 🟢 Universal Option Schema with Dedicated Sprite Feedback
export const CheckpointOptionSchema = z.object({
  text: z.string(), // Option text in target language
  isCorrect: z.boolean(),
  spriteMood: z.string().default("excited"), // "excited" | "thinking" | "curious" | "encouraging"
  spriteReaction: z.string(), // Dedicated feedback in learner's native language
});

export const SpeakChallengeSchema = z.object({
  targetPhrase: z.string(),
  phoneticGuide: z.string().nullable().optional(),
  successReaction: z.string(),
  successMood: z.string().default("excited"),
  retryHint: z.string(),
  retryMood: z.string().default("thinking"),
});

export const BookPageCheckpointSchema = z.object({
  type: z.enum(["multiple_choice", "speak_phrase"]),
  questionNative: z.string(),
  options: z.array(CheckpointOptionSchema).length(3).nullable().optional(),
  speakChallenge: SpeakChallengeSchema.nullable().optional(),
  explanationNative: z.string(),
});

export const LocalizedBookPageSchema = z.object({
  pageNumber: z.number().int().min(1).max(5),
  sentences: z.array(BookSentenceSchema).min(1),
  checkpoint: BookPageCheckpointSchema,
});

export const LocalizedBookTranslationSchema = z.object({
  title: z.string(),
  synopsis: z.string(),
  pages: z.array(LocalizedBookPageSchema).length(5),
});

export const SpoonBookWebhookSchema = z.object({
  slug: z.string().min(1),
  characterName: z.string().min(1),
  characterAvatarUrl: z.string().url(),
  levelBand: z.string().default("beginner"),
  genre: z.string().default("story"),
  coverImageS3Key: z.string().min(1),
  introVideoS3Key: z.string().nullable().optional(),
  pageImageS3Keys: z.array(z.string().min(1)).length(5),
  translations: z.record(z.string(), LocalizedBookTranslationSchema),
});

export type BookWordTimestamp = z.infer<typeof BookWordTimestampSchema>;
export type BookSentence = z.infer<typeof BookSentenceSchema>;
export type CheckpointOption = z.infer<typeof CheckpointOptionSchema>;
export type SpeakChallenge = z.infer<typeof SpeakChallengeSchema>;
export type BookPageCheckpoint = z.infer<typeof BookPageCheckpointSchema>;
export type LocalizedBookPage = z.infer<typeof LocalizedBookPageSchema>;
export type LocalizedBookTranslation = z.infer<
  typeof LocalizedBookTranslationSchema
>;
export type SpoonBookWebhookPayload = z.infer<typeof SpoonBookWebhookSchema>;