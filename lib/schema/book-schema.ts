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
  audioUrl: z.string().optional().nullable(), // Populated when presigned for frontend reader
  wordTimestamps: z.array(BookWordTimestampSchema).default([]),
});

export const BookPageCheckpointSchema = z.object({
  type: z.enum(["multiple_choice", "speak_phrase"]),
  questionNative: z.string(),
  targetPhrase: z.string().nullable().optional(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string(),
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
export type BookPageCheckpoint = z.infer<typeof BookPageCheckpointSchema>;
export type LocalizedBookPage = z.infer<typeof LocalizedBookPageSchema>;
export type LocalizedBookTranslation = z.infer<
  typeof LocalizedBookTranslationSchema
>;
export type SpoonBookWebhookPayload = z.infer<typeof SpoonBookWebhookSchema>;