// lib/telegram.ts

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ALERTS_CHAT_ID =
  process.env.TELEGRAM_ALERTS_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramPing(
  text: string,
  options?: { channel?: "default" | "alerts" },
): Promise<boolean> {
  const chatId =
    options?.channel === "alerts" ? ALERTS_CHAT_ID : DEFAULT_CHAT_ID;

  if (!BOT_TOKEN || !chatId) {
    console.warn("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(4000),
      },
    );

    if (!res.ok) {
      console.warn(
        `[Telegram] HTTP ${res.status}:`,
        (await res.text()).slice(0, 200),
      );
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Telegram] Failed to send ping:", err);
    return false;
  }
}

// Convenience low-data pings
export async function notifyNewTrial(targetLanguage?: string) {
  const langTag = targetLanguage ? ` (${targetLanguage})` : "";
  await sendTelegramPing(`🎉 1 New Trial User!${langTag}`);
}

export async function notifyNewSub(planLabel: string) {
  await sendTelegramPing(`💰 New Sub! ${planLabel}`);
}

export async function notifyLambdaError({
  lambdaName,
  stage,
  error,
  taskId,
}: {
  lambdaName: string;
  stage?: string;
  error: string;
  taskId?: string;
}) {
  const stagePart = stage ? ` [${stage}]` : "";
  const taskPart = taskId ? `\nTask: ${taskId}` : "";
  await sendTelegramPing(
    `🚨 Lambda Failed: ${lambdaName}${stagePart}\n${error.slice(0, 300)}${taskPart}`,
    { channel: "alerts" },
  );
}