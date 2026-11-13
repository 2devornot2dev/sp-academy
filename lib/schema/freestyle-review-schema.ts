import { z } from "zod";

// Individual mistake — strict shape matching the evaluate-turn route
export const FreestyleMistakeSchema = z.object({
  category: z.enum(["GENDER", "GRAMMAR", "PRONUNCIATION", "VOCABULARY"]),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
  mistake: z.string().min(1), // Changed from 'original' to match your evaluate-turn prompt
  correction: z.string().min(1),
  explanation: z.string().min(1),
  context: z.string().optional(),
});

// Metrics — includes fluencyScore and overallScore
export const FreestyleMetricsSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  vocabScore: z.number().min(0).max(100),
  pronunciationScore: z.number().min(0).max(100).nullable(),
  fluencyScore: z.number().min(0).max(100),
});

// overallFeedback object
export const FreestyleOverallFeedbackSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string()).optional(),
  focusAreas: z.array(z.string()).optional(),
  encouragement: z.string().min(1),
  bestMoment: z
    .object({
      quote: z.string().min(1),
      compliment: z.string().min(1),
    })
    .nullable()
    .optional(),
});

// Grammar Analysis Schema
export const FreestyleGrammarAnalysisSchema = z.object({
  topWeakness: z.string().min(1),
  explanation: z.string().min(1),
});

// Vocabulary Upgrade Schema
export const FreestyleVocabUpgradeSchema = z.object({
  original: z.string().min(1),
  better: z.string().min(1),
  explanation: z.string().min(1),
});

// Sprite outro (must be declared before FreestyleReviewDataSchema uses it)
export const FreestyleSpriteOutroSchema = z.object({
  spriteName: z.string().optional(),
  nativeLine: z.string().min(1),
  targetLine: z.string().min(1),
  nativeAudioKey: z.string().nullable().optional(),
  targetAudioKey: z.string().nullable().optional(),
});

// The review data itself (single declaration)
export const FreestyleReviewDataSchema = z.object({
  metrics: FreestyleMetricsSchema,
  mistakes: z.array(FreestyleMistakeSchema), // No .max() so long sessions don't fail validation
  overallFeedback: FreestyleOverallFeedbackSchema,

  // Optional in case of partial failures
  grammarAnalysis: FreestyleGrammarAnalysisSchema.optional(),
  vocabUpgrades: z.array(FreestyleVocabUpgradeSchema).optional(),
  spriteOutro: FreestyleSpriteOutroSchema.nullable().optional(),
});

// Main webhook payload from Lambda
export const FreestyleReviewWebhookSchema = z.object({
  taskId: z.string(),
  sessionId: z.string(),
  status: z.enum(["SUCCESS", "FAILED"]),
  error: z.string().optional(),
  review: FreestyleReviewDataSchema.optional(),
});

// Types
export type FreestyleReviewWebhookPayload = z.infer<typeof FreestyleReviewWebhookSchema>;
export type FreestyleReviewData = z.infer<typeof FreestyleReviewDataSchema>;
export type FreestyleMistake = z.infer<typeof FreestyleMistakeSchema>;
export type FreestyleMetrics = z.infer<typeof FreestyleMetricsSchema>;
export type FreestyleGrammarAnalysis = z.infer<typeof FreestyleGrammarAnalysisSchema>;
export type FreestyleVocabUpgrade = z.infer<typeof FreestyleVocabUpgradeSchema>;
export type FreestyleSpriteOutro = z.infer<typeof FreestyleSpriteOutroSchema>;