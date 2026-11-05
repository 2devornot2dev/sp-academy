import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

interface EmailParams {
  to: string;
  subject: string;
  reactComponent: React.ReactElement;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, reactComponent }: EmailParams) {
  try {
    const response = await getResend().emails.send({
      from: "your@email.com", // Use your verified sender email
      to,
      subject,
      react: reactComponent,
    });

    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}