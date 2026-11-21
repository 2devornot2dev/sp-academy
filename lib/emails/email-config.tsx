import * as React from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

export {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
};

export type ProgramTier = "TRIAL" | "FOUNDER" | "UNLIMITED";

export const LOGO_URL =
  process.env.EMAIL_LOGO_URL || "PASTE_YOUR_CLOUDINARY_LOGO_URL_HERE";

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "Spoon Academy <hello@spoonacademy.com>";

export const DEFAULT_REPLY_TO =
  process.env.EMAIL_REPLY_TO || "hello@spoonacademy.com";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://spoonacademy.com";

export const EMAIL_STYLES = {
  main: {
    backgroundColor: "#f1f5f9",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: "32px 16px",
  } satisfies React.CSSProperties,
  card: {
    maxWidth: "560px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  } satisfies React.CSSProperties,
  header: {
    padding: "28px 32px 20px",
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,
  body: {
    padding: "32px",
  } satisfies React.CSSProperties,
  eyebrow: {
    margin: "0 0 8px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#2563eb",
  } satisfies React.CSSProperties,
  h1: {
    margin: "0 0 14px",
    fontSize: "24px",
    lineHeight: "1.25",
    fontWeight: 800,
    color: "#0f172a",
  } satisfies React.CSSProperties,
  paragraph: {
    margin: "0 0 16px",
    fontSize: "15px",
    lineHeight: "1.65",
    color: "#475569",
  } satisfies React.CSSProperties,
  box: {
    margin: "20px 0 24px",
    padding: "16px 20px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
  } satisfies React.CSSProperties,
  button: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 800,
    textDecoration: "none",
    padding: "14px 28px",
    borderRadius: "14px",
  } satisfies React.CSSProperties,
  footer: {
    padding: "20px 32px",
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,
  footerText: {
    margin: "0",
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#94a3b8",
  } satisfies React.CSSProperties,
};

export function SpoonEmailLayout({
  previewText,
  children,
}: {
  previewText: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={EMAIL_STYLES.main}>
        <Container style={EMAIL_STYLES.card}>
          <Section style={EMAIL_STYLES.header}>
            <Img
              src={LOGO_URL}
              alt="Spoon Academy"
              width="145"
              style={{ margin: "0 auto", display: "block", height: "auto" }}
            />
          </Section>

          <Section style={EMAIL_STYLES.body}>{children}</Section>

          <Section style={EMAIL_STYLES.footer}>
            <Text style={EMAIL_STYLES.footerText}>
              Spoon Academy &bull; Built for real spoken fluency.
              <br />
              Questions? Just hit reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}