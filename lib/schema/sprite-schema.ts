// lib/schema/sprite-schema.ts
import { z } from "zod";

// 1A. Step-Based Chalkboard Schemas (1 Step = 100% of the Stage)
export const BoardStepTypeSchema = z.enum([
  "teach_concept",
  "multiple_choice",
  "write_response",
  "pronunciation",
  "see_it", 
]);

export const BoardFeedbackSchema = z.object({
  status: z.enum(["correct", "retry"]),
  correctionFrom: z.string().nullable().optional(),
  correctionTo: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const BoardStepSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  type: BoardStepTypeSchema.default("teach_concept"),
  badge: z.string().default("Step"),
  prompt: z.string(),
  targetPhrase: z.string().nullable().optional(),
  translation: z.string().nullable().optional(),
  formula: z.string().nullable().optional(),
  grammarTip: z.string().nullable().optional(),
  hint: z.string().nullable().optional(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  // 🟢 NEW: Visual Flashcard / Picture Prompt support on any Chalkboard step!
  imagePrompt: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),

  userAttempts: z.array(z.string()).default([]),
  struggled: z.boolean().default(false),
  correctionGiven: BoardFeedbackSchema.nullable().optional(),
  completedAt: z.string().nullable().optional(),
});

// Legacy item schema kept optional so old History sessions never fail validation
export const ChalkboardItemSchema = z.object({
  label: z.string(),
  target: z.string(),
  detail: z.string(),
  correctionFrom: z.string().nullable().optional(),
});

export const ChalkboardSchema = z.object({
  boardId: z.string().optional(),
  title: z.string(),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).default("IN_PROGRESS"),
  currentStepIndex: z.number().int().nonnegative().default(0),
  steps: z.array(BoardStepSchema).default([]),
  lastFeedback: BoardFeedbackSchema.nullable().optional(),
  takeaway: z.string().nullable().optional(),

  // Legacy fields (for backward compatibility with older saved turns)
  mode: z
    .enum(["lesson_notes", "correction", "progress_snapshot"])
    .optional(),
  items: z.array(ChalkboardItemSchema).optional(),
});

// 2. Context Card Schema
export const ContextCardSchema = z.object({
  title: z.string(),
  grammarRule: z.string(),
  examples: z.array(
    z.object({
      french: z.string(),
      english: z.string(),
    })
  ),
});

// 3. Progress Report Result Schema
export const ProgressReportResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  focusAreas: z.array(z.string()),
  recommendedWords: z.array(z.string()).optional(),
});

// 4. Action Payload Schema
export const SpriteActionSchema = z.object({
  type: z.enum(["START_DRILL", "PROGRESS_REPORT", "BOOKMARK_WORD"]),
  targetWord: z.string().optional(),
  systemTaskId: z.string().optional(),
});

// 5. Single 1-to-1 Turn inside a SpriteSession
export const SpriteTurnSchema = z.object({
  id: z.string(),
  userPrompt: z.string(),
  assistantReply: z.string(),
  isTranslationRequired: z.boolean().optional(),
  translation: z.string().nullable().optional(),
  chalkboard: ChalkboardSchema.nullable().optional(),
  contextCard: ContextCardSchema.nullable().optional(),
  progressReport: ProgressReportResultSchema.nullable().optional(),
  action: SpriteActionSchema.nullable().optional(),
  createdAt: z.string(),
});
export const SpriteSessionTurnsSchema = z.array(SpriteTurnSchema);

// 6. Full SpriteSession Payload Schema
export const SpriteSessionSchema = z.object({
  id: z.string(),
  spriteProfileId: z.string(),
  title: z.string(),
  lessonTitle: z.string().nullable().optional(),
  turns: SpriteSessionTurnsSchema.default([]),
  board: ChalkboardSchema.nullable().optional(), // <--- NEW: Saved Session Board!
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const SpriteFocusWordSchema = z.object({
  word: z.string(),
  translation: z.string().nullable(),
  reason: z.enum([
    "due_review",
    "weak_pronunciation",
    "low_recognition",
    "low_mastery",
  ]),
  masteryScore: z.number().min(0).max(100),
  recognitionAccuracy: z.number().int().min(0).max(100).nullable(),
  pronunciationAverage: z.number().int().min(0).max(100).nullable(),
  spokenAttempts: z.number().int().nonnegative(),
});

export const SpriteContextSchema = z.object({
  version: z.literal(2),
  userName: z.string(),
  nativeLang: z.string(),
  targetLang: z.string(),
  courseId: z.string().nullable(),
  currentLessonId: z.string().nullable(),
  currentLessonTitle: z.string().nullable(),
  avgPronunciation: z.number().int().min(0).max(100).nullable(),
  pronunciationWordCount: z.number().int().nonnegative(),
  pronunciationAttemptCount: z.number().int().nonnegative(),
  avgMastery: z.number().int().min(0).max(100).nullable(),
  masteryWordCount: z.number().int().nonnegative(),
  focusWords: z.array(SpriteFocusWordSchema),
  recentWords: z.array(z.string()),
  lastUpdated: z.string().datetime(),
});

// 🟢 7. Sprite Notification / Post Item Schema (Added here)
export const SpritePostItemSchema = z.object({
  nodeId: z.string().optional(),
  orderIndex: z.number().int(),
  header: z.string(),
  nativeBody: z.string(),
  targetBody: z.string(),
  action: z.string().nullable().optional(),
  nativeAudioUrl: z.string().nullable().optional(),
  targetAudioUrl: z.string().nullable().optional(),
  // Include the new video URL mapping from Lambda
  videoUrl: z.string().nullable().optional(),
});


export type BoardStepType = z.infer<typeof BoardStepTypeSchema>;
export type BoardStep = z.infer<typeof BoardStepSchema>;
export type BoardFeedback = z.infer<typeof BoardFeedbackSchema>;
export type ChalkboardData = z.infer<typeof ChalkboardSchema>;
export type SpriteFocusWord = z.infer<typeof SpriteFocusWordSchema>;
export type SpriteAIContext = z.infer<typeof SpriteContextSchema>;
export type ContextCardData = z.infer<typeof ContextCardSchema>;
export type ProgressReportResult = z.infer<typeof ProgressReportResultSchema>;
export type SpriteAction = z.infer<typeof SpriteActionSchema>;
export type SpriteTurn = z.infer<typeof SpriteTurnSchema>;
export type SpriteSessionData = z.infer<typeof SpriteSessionSchema>;
export type SpritePostItem = z.infer<typeof SpritePostItemSchema>; // 🟢 Type export