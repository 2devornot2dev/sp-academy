// lib/schemas/foundation-bridge.ts
import { z } from "zod";
import { wordAudioSchema } from "./lesson-schema";

const s3Key = z.string().min(1);

// Audio keys the Lambda can legitimately send as "": TTS failed (the frontend
// just skips playback), or no audio exists for that word (e.g. a target word
// with an article like "la porte" has no entry in wordAudio).
const optionalS3Key = z.string();

const provenanceSchema = z.object({
  nodeId: z.string(),
  sourceChunkIds: z.array(z.string()),
  pillar: z.string(),
  mechanic: z.string(),
});

// Fields every cooldown item shares
const cooldownBase = z.object({
  pillar: z.string(), // seen: lexical | morphosyntax | pragmatic (kept loose so a new pillar can't fail the webhook)
  provenance: provenanceSchema,
  itemId: z.string(), // arrives as "" today, so the handler assigns real ids (see notes)
  contextNative: z.string(),
  instructionNative: z.string(),
});

const wordCoupling = cooldownBase.extend({
  mechanic: z.literal("word_coupling"),
  targetWord: z.string(),
  options: z.array(z.string()).min(2),
  correct: z.array(z.string()).min(1), // ARRAY here...
  feedback: z.record(z.string(), z.string()),
});

const variableShift = cooldownBase.extend({
  mechanic: z.literal("variable_shift"),
  baseSentence: z.string(),
  expected: z.array(z.string()).min(1),
  expectedFolds: z.array(z.string()).min(1),
  rejectFeedback: z.record(z.string(), z.string()),
});

const contextClash = cooldownBase.extend({
  mechanic: z.literal("context_clash"),
  options: z.array(z.string()).min(2),
  correct: z.string(), // ...but a plain STRING here
  feedback: z.record(z.string(), z.string()),
});

// No `correct` field: the right answer is `targetWord`
const videoSpotlight = cooldownBase.extend({
  mechanic: z.literal("video_spotlight"),
  videoS3Key: s3Key,
  targetAudioS3Key: optionalS3Key, // "" when no audio exists for the target word
  targetWord: z.string(),
  options: z.array(z.string()).min(2),
});

export const cooldownItemSchema = z.discriminatedUnion("mechanic", [
  wordCoupling,
  variableShift,
  contextClash,
  videoSpotlight,
]);

export const bridgeSceneSchema = z.object({
  imageS3Key: s3Key,
  npcAudioS3Key: optionalS3Key, // "" when NPC TTS failed
  npcLine: z.string(),
  npcLineNative: z.string().optional(),
  altText: z.string(),
  videoS3Key: s3Key.optional(), // present in some runs, absent in others
});



export const vocabMomentItemSchema = z.object({
  word: z.string(),
  gloss: z.string(),
  audioS3Key: optionalS3Key, // "" when that word's TTS failed
  labelHint: z.string(),
  imageS3Key: z.string().nullable().optional(),
});

export const pronunciationCheckSchema = z.object({
  referenceText: z.string(),
  engine: z.string(), // "azure"
  focusSounds: z.array(z.object({ sound: z.string(), positions: z.array(z.number().int()) })),
});

export const handoffFragmentSchema = z.object({
  primedChunks: z.array(z.unknown()),        // always [] so far, shape unknown
  lingeringWeaknesses: z.array(z.unknown()), // same
  bridgeAssets: z.object({
    imageS3Key: s3Key,
    npcAudioS3Key: optionalS3Key, // same value as bridgeScene.npcAudioS3Key
    vocabMomentAudio: z.array(s3Key),
    videoS3Key: s3Key.optional(),
  }),
  unlockNext: z.boolean(),
  bridgeLexicon: z.array(z.string()),
  usedShiftIds: z.array(z.string()), // empty so far, string ids assumed
  wordAudio: wordAudioSchema.optional(), // duplicate of the top-level map
});

export const foundationBridgeWebhookSchema = z.object({
  meta: z.object({
    userId: z.string().min(1),
    courseId: z.string().min(1),
    bridgeIndex: z.number().int().min(1), // matches the lesson's orderIndex
    nativeLanguage: z.string(),
    targetLanguage: z.string(),
    firstName: z.string(),
    gender: z.string(), // "male" here, "M" in the lesson lambda
  }),
  bridgeScene: bridgeSceneSchema,
  vocabMoment: z.array(vocabMomentItemSchema).min(1),
  cooldown: z.array(cooldownItemSchema).min(1),
  pronunciationCheck: pronunciationCheckSchema,
  handoffFragment: handoffFragmentSchema,
  wordAudio: wordAudioSchema,
});

export type CooldownItem = z.infer<typeof cooldownItemSchema>;
export type BridgeScene = z.infer<typeof bridgeSceneSchema>;
export type VocabMomentItem = z.infer<typeof vocabMomentItemSchema>;
export type FoundationBridgeWebhook = z.infer<typeof foundationBridgeWebhookSchema>;