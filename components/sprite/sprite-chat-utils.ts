// components/sprite/sprite-chat-utils.ts
import type { UIMessage } from "ai";
import type {
  SpriteTurn,
  ContextCardData,
  SpriteAction,
  ChalkboardData,
} from "@/lib/schema/sprite-schema";

export type ActiveTab = "session" | "briefing" | "history";
export type ChatViewMode = "single" | "multi";

export interface ChatContextData {
  userName: string;
  nativeLang: string;
  targetLang: string;
  currentLessonTitle: string;
  currentFocusType?: "SPOON" | "BRIDGE" | "BOSS" | null;
  wakeCycleKey?: string;
  activeStepHref?: string;
  activeStepLabel?: string;
  topWord?: {
    word: string;
    translation?: string | null;
    avgSpokenScore?: number | null;
  } | null;
  topPhrase?: {
    word: string;
    translation?: string | null;
    avgSpokenScore?: number | null;
  } | null;
  recentWords?: {
    word: string;
    translation?: string | null;
    status: string;
  }[] | null;
  avgPronunciation: number;
}

export interface ParsedPayload {
  spokenText: string;
  isTranslationRequired: boolean;
  translation?: string | null;
  chalkboard?: ChalkboardData | null;
  contextCard?: ContextCardData | null;
  action?: SpriteAction | null;
}

export interface UIMessageTurn {
  id: string;
  userMessage?: UIMessage;
  assistantMessage?: UIMessage;
}

export function cleanDisplayString(str: string): string {
  return str
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[«»]/g, '"')
    .replace(/""+/g, '"')
    .trim();
}

export function getRawText(m?: UIMessage): string {
  if (!m) return "";
  return m.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function parseMessagePayload(m?: UIMessage): ParsedPayload {
  const raw = getRawText(m);
  if (!raw) {
    return {
      spokenText: "",
      isTranslationRequired: false,
      translation: null,
      chalkboard: null,
      contextCard: null,
      action: null,
    };
  }

  const [spokenPart, jsonPart] = raw.split("---JSON---");
  const spokenText = cleanDisplayString(spokenPart || "");

  if (!jsonPart) {
    return {
      spokenText,
      isTranslationRequired: false,
      translation: null,
      chalkboard: null,
      contextCard: null,
      action: null,
    };
  }

  try {
    const cleanedJson = jsonPart
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanedJson);

    const hasValidTranslation =
      parsed.translation &&
      parsed.translation !== "null" &&
      String(parsed.translation).trim().length > 0;

    const translation = hasValidTranslation
      ? cleanDisplayString(String(parsed.translation))
      : null;

    const isTranslationRequired = Boolean(translation);

    let resolvedChalkboard: ChalkboardData | null =
      parsed.chalkboard ??
      (parsed.newBoard && Array.isArray(parsed.newBoard.steps)
        ? {
            title: parsed.newBoard.title || "Lesson Board",
            status: "IN_PROGRESS",
            currentStepIndex: 0,
            steps: parsed.newBoard.steps.map((s: any, idx: number) => ({
              ...s,
              id: s.id || `step-${idx + 1}`,
            })),
            takeaway: parsed.newBoard.takeaway ?? null,
            lastFeedback: parsed.feedback ?? null,
          }
        : null);

    if (!resolvedChalkboard && (parsed.stepDecision || parsed.feedback)) {
      resolvedChalkboard = {
        title: "__STEP_UPDATE__",
        status:
          parsed.stepDecision === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
        currentStepIndex: parsed.stepDecision === "ADVANCE" ? 1 : 0,
        steps: [],
        lastFeedback: parsed.feedback ?? null,
      };
    }

    return {
      spokenText,
      isTranslationRequired,
      translation,
      chalkboard: resolvedChalkboard,
      contextCard: parsed.contextCard ?? null,
      action: parsed.action ?? null,
    };
  } catch {
    return {
      spokenText,
      isTranslationRequired: false,
      translation: null,
      chalkboard: null,
      contextCard: null,
      action: null,
    };
  }
}

export function turnsToUIMessages(
  turns: (SpriteTurn & {
    isTranslationRequired?: boolean;
    translation?: string | null;
    chalkboard?: ChalkboardData | null;
  })[],
): UIMessage[] {
  const msgs: UIMessage[] = [];
  for (const t of turns) {
    msgs.push({
      id: `${t.id}-user`,
      role: "user",
      parts: [{ type: "text", text: cleanDisplayString(t.userPrompt) }],
    });

    const rawAssistantText = `${cleanDisplayString(t.assistantReply)}\n---JSON---\n${JSON.stringify({
      isTranslationRequired: Boolean(t.isTranslationRequired ?? t.translation),
      translation: t.translation ?? null,
      chalkboard: t.chalkboard ?? null,
      contextCard: t.contextCard ?? null,
      action: t.action ?? null,
    })}`;

    msgs.push({
      id: `${t.id}-assistant`,
      role: "assistant",
      parts: [{ type: "text", text: rawAssistantText }],
    });
  }
  return msgs;
}

export function groupUIMessagesIntoTurns(messages: UIMessage[]): UIMessageTurn[] {
  const turns: UIMessageTurn[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      turns.push({ id: msg.id, userMessage: msg });
    } else if (msg.role === "assistant") {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn && !lastTurn.assistantMessage) {
        lastTurn.assistantMessage = msg;
      } else {
        turns.push({ id: msg.id, assistantMessage: msg });
      }
    }
  }
  return turns;
}