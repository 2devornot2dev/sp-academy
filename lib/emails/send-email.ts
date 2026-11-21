import * as React from "react";
import { resend } from "../resend/config/client";
import { DEFAULT_REPLY_TO, EMAIL_FROM } from "./email-config";

export interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
  replyTo = DEFAULT_REPLY_TO,
}: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo,
      subject,
      react,
    });

    if (error) {
      console.error("[email] Resend returned error:", error);
      return { ok: false as const, error };
    }

    return { ok: true as const, id: data?.id };
  } catch (error) {
    console.error("[email] Failed to send email:", error);
    return { ok: false as const, error };
  }
}