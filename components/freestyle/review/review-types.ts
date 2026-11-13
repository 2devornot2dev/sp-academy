// ------------------------------
// TYPES
// ------------------------------
export interface ReviewMetrics {
  overallScore: number;
  grammarScore: number;
  vocabScore: number;
  pronunciationScore: number | null;
  fluencyScore: number;
}

export interface ReviewMistake {
  category: "GENDER" | "GRAMMAR" | "PRONUNCIATION" | "VOCABULARY";
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  mistake: string;
  correction: string;
  explanation: string;
  context?: string;
}

export interface ReviewOverallFeedback {
  summary: string;
  strengths?: string[];
  focusAreas?: string[];
  encouragement: string;
}

export interface GrammarAnalysis {
  topWeakness: string;
  explanation: string;
}

export interface VocabUpgrade {
  original: string;
  better: string;
  explanation: string;
}

export interface ReviewData {
  metrics: ReviewMetrics;
  mistakes: ReviewMistake[];
  overallFeedback: ReviewOverallFeedback;
  grammarAnalysis?: GrammarAnalysis;
  vocabUpgrades?: VocabUpgrade[];
}

export interface SessionData {
  id: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: string;
  mode: string;
  topic?: string | null;
  duration: number;
}

export interface SpriteOutro {
  spriteName?: string;
  nativeLine: string;
  targetLine: string;
  nativeAudioUrl?: string | null;
  targetAudioUrl?: string | null;
}

export interface ReviewData {
  metrics: ReviewMetrics;
  mistakes: ReviewMistake[];
  overallFeedback: ReviewOverallFeedback;
  grammarAnalysis?: GrammarAnalysis;
  vocabUpgrades?: VocabUpgrade[];
  spriteOutro?: SpriteOutro | null;
}