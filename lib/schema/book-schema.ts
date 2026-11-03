// lib/schema/book-schema.ts
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Sentences                                                                 */
/* -------------------------------------------------------------------------- */

export const WordTimestampSchema = z.object({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

export const BookSentenceSchema = z.object({
  sentenceIndex: z.number().int().min(0),
  textTarget: z.string(),
  textNative: z.string(),
  audioS3Key: z.string().default(""),
  wordTimestamps: z.array(WordTimestampSchema).default([]),
});

/* -------------------------------------------------------------------------- */
/*  Vocabulary definitions                                                    */
/* -------------------------------------------------------------------------- */

export const PageDefinitionSchema = z.object({
  word: z.string(),
  lemma: z.string().nullable().optional(),
  partOfSpeech: z.string().default("NOUN"),
  translation: z.string(),
  phonetic: z.string(),
  audioS3Key: z.string().default(""),
  audioUrl: z.string().nullable().optional(), // Populated when presigned for reader
});

/* -------------------------------------------------------------------------- */
/*  Checkpoints                                                               */
/* -------------------------------------------------------------------------- */

export const CheckpointOptionSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
  spriteMood: z.string().default("excited"),
  spriteReaction: z.string(),
});

export const SpeakChallengeSchema = z.object({
  targetPhrase: z.string(),
  phoneticGuide: z.string().nullable().optional(),
  successReaction: z.string(),
  successMood: z.string().default("excited"),
  retryHint: z.string(),
  retryMood: z.string().default("thinking"),
});

export const PageCheckpointSchema = z.object({
  type: z.enum(["multiple_choice", "speak_phrase"]),
  questionNative: z.string(),
  options: z.array(CheckpointOptionSchema).nullable().optional(),
  speakChallenge: SpeakChallengeSchema.nullable().optional(),
  explanationNative: z.string(),
});

/* -------------------------------------------------------------------------- */
/*  Pages & translations                                                      */
/* -------------------------------------------------------------------------- */

export const LocalizedPageSchema = z.object({
  pageNumber: z.number().int().min(1).max(20),
  sentences: z.array(BookSentenceSchema).min(1).max(8),
  definitions: z.array(PageDefinitionSchema).min(1).max(4),
  checkpoint: PageCheckpointSchema,
});

export const LocalizedBookTranslationSchema = z.object({
  title: z.string(),
  synopsis: z.string(),
  pages: z.array(LocalizedPageSchema).min(1).max(20),
});

/* -------------------------------------------------------------------------- */
/*  Webhook payload (Lambda -> Next.js)                                       */
/* -------------------------------------------------------------------------- */

export const SpoonBookWebhookSchema = z.object({
  slug: z.string().min(1),
  userId: z.string().nullable().optional(),
  characterName: z.string().min(1),
  characterAvatarUrl: z.string(),
  levelBand: z.string().default("beginner"),
  genre: z.string().default("story"),
  pageCount: z.number().int().min(1).max(20).optional(),
  coverImageS3Key: z.string().min(1),
  introVideoS3Key: z.string().nullable().optional(),
  pageImageS3Keys: z.array(z.string().min(1)).min(1).max(20),
  translations: z.record(z.string(), LocalizedBookTranslationSchema),
});

/* -------------------------------------------------------------------------- */
/*  Boss (separate feature)                                                   */
/* -------------------------------------------------------------------------- */

export const BossAvatarSchema = z.object({
  default: z.string().nullable().optional(),
  happy: z.string().nullable().optional(),
  sad: z.string().nullable().optional(),
  angry: z.string().nullable().optional(),
});

export const BossInfoSchema = z.object({
  name: z.string(),
  persona: z.string(),
  introMessage: z.string(),
  appearance: z.string(),
  sceneDescription: z.string(),
  coverUrl: z.string().nullable().optional(),
  avatar: BossAvatarSchema.nullable().optional(),
  introAudioKey: z.string().nullable().optional(),
  introVideoKey: z.string().nullable().optional(),
});

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type BookSentence = z.infer<typeof BookSentenceSchema>;
export type PageDefinition = z.infer<typeof PageDefinitionSchema>;
export type CheckpointOption = z.infer<typeof CheckpointOptionSchema>;
export type SpeakChallenge = z.infer<typeof SpeakChallengeSchema>;
export type PageCheckpoint = z.infer<typeof PageCheckpointSchema>;
export type LocalizedPage = z.infer<typeof LocalizedPageSchema>;
export type LocalizedBookTranslation = z.infer<typeof LocalizedBookTranslationSchema>;
export type SpoonBookWebhookPayload = z.infer<typeof SpoonBookWebhookSchema>;
export type BossAvatar = z.infer<typeof BossAvatarSchema>;
export type BossInfo = z.infer<typeof BossInfoSchema>;

/* -------------------------------------------------------------------------- */
/*  Legacy aliases (delete once imports are updated)                          */
/* -------------------------------------------------------------------------- */

export const BookWordTimestampSchema = WordTimestampSchema;
export const BookPageDefinitionSchema = PageDefinitionSchema;
export const BookPageCheckpointSchema = PageCheckpointSchema;
export const LocalizedBookPageSchema = LocalizedPageSchema;
export const PageDefinitionItemSchema = PageDefinitionSchema;
export const LocalizedPageContentSchema = LocalizedPageSchema;

export type BookWordTimestamp = WordTimestamp;
export type BookPageDefinition = PageDefinition;
export type BookPageCheckpoint = PageCheckpoint;
export type LocalizedBookPage = LocalizedPage;