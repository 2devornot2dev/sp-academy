import * as React from "react";
import {
  EMAIL_STYLES,
  Heading,
  Section,
  SpoonEmailLayout,
  Text,
} from "../email-config";

export interface SupportEmailProps {
  userName: string;
  userEmail: string;
  userId: string;
  subject: string;
  message: string;
  eyebrow?: string;
}

export function SupportEmailTemplate({
  userName,
  userEmail,
  userId,
  subject,
  message,
  eyebrow = "Spoon Academy Support",
}: SupportEmailProps) {
  return (
    <SpoonEmailLayout previewText={`${eyebrow} from ${userEmail}`}>
      <Text style={EMAIL_STYLES.eyebrow}>{eyebrow}</Text>

      <Heading style={EMAIL_STYLES.h1}>{subject}</Heading>

      <Section style={EMAIL_STYLES.box}>
        <Text style={{ ...EMAIL_STYLES.paragraph, margin: "0 0 4px" }}>
          <strong>From:</strong> {userName} ({userEmail})
        </Text>
        <Text style={{ ...EMAIL_STYLES.paragraph, margin: "0" }}>
          <strong>User ID:</strong> {userId}
        </Text>
      </Section>

      <Text style={{ ...EMAIL_STYLES.paragraph, whiteSpace: "pre-wrap" }}>
        {message}
      </Text>
    </SpoonEmailLayout>
  );
}