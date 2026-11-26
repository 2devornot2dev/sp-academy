
import {
  APP_URL,
  Button,
  EMAIL_STYLES,
  Heading,
  Section,
  SKOOL_COMMUNITY_URL,
  SpoonEmailLayout,
  Text,
  type ProgramTier,
} from "../email-config";

export interface WelcomeEmailProps {
  name: string;
  program: ProgramTier;
  targetLanguageLabel?: string;
}

const PROGRAM_COPY: Record<ProgramTier, { badge: string; blurb: string }> = {
  TRIAL: {
    badge: "Free Trial Active",
    blurb: "Your trial access is live—jump into Spoon 1 and test your mic.",
  },
  FOUNDER: {
    badge: "Founder Member",
    blurb:
      "Thank you for backing Spoon Academy early! Your Founder perks are unlocked.",
  },
  UNLIMITED: {
    badge: "Unlimited Access",
    blurb:
      "You have full unlimited access to every Spoon, Vocab Bridge, Boss, and AI Tutor.",
  },
};

export function WelcomeEmailTemplate({
  name,
  program,
  targetLanguageLabel = "your new language",
}: WelcomeEmailProps) {
  const firstName = name.trim() || "there";
  const tier = PROGRAM_COPY[program] || PROGRAM_COPY.TRIAL;
  const isPaid = program === "FOUNDER" || program === "UNLIMITED";

  return (
    <SpoonEmailLayout previewText="Your first Spoon is ready — start speaking today.">
      <Text style={EMAIL_STYLES.eyebrow}>{tier.badge}</Text>

      <Heading style={EMAIL_STYLES.h1}>
        Hey {firstName}, welcome to Spoon Academy!
      </Heading>

      <Text style={EMAIL_STYLES.paragraph}>
        {tier.blurb} You&rsquo;re all set to start speaking{" "}
        <strong>{targetLanguageLabel}</strong> from Day 1&mdash;no endless
        scrolling, just short voice Spoons, real pronunciation feedback, and
        live roleplays.
      </Text>

      <Section style={EMAIL_STYLES.box}>
        <Text style={{ ...EMAIL_STYLES.paragraph, margin: "0 0 8px" }}>
          <strong>1. Complete Spoon 1</strong> &mdash; 8 quick voice &amp;
          listening stages (~5 mins)
        </Text>
        <Text style={{ ...EMAIL_STYLES.paragraph, margin: "0 0 8px" }}>
          <strong>2. Clear the Vocab Bridge</strong> &mdash; Lock in scene words
          with 5s video clips
        </Text>
        <Text style={{ ...EMAIL_STYLES.paragraph, margin: "0" }}>
          <strong>3. Challenge the Boss</strong> &mdash; Put it all together
          with 3 hearts
        </Text>
      </Section>

      {isPaid && SKOOL_COMMUNITY_URL && (
        <Section
          style={{
            ...EMAIL_STYLES.box,
            backgroundColor: "#eef2ff",
            borderColor: "#c7d2fe",
          }}
        >
          <Text
            style={{
              ...EMAIL_STYLES.eyebrow,
              color: "#4338ca",
              margin: "0 0 6px",
            }}
          >
            Members-Only Community
          </Text>
          <Text style={{ ...EMAIL_STYLES.paragraph, margin: "0 0 12px" }}>
            As a paid member, you have private access to our{" "}
            <strong>Spoon Academy Skool Community</strong>—drop questions,
            request features, and practice with fellow learners.
          </Text>
          <Button
            href={SKOOL_COMMUNITY_URL}
            style={{
              ...EMAIL_STYLES.button,
              backgroundColor: "#4f46e5",
              padding: "11px 22px",
              fontSize: "14px",
            }}
          >
            Join the Skool Community &rarr;
          </Button>
        </Section>
      )}

      <Section style={{ textAlign: "center" }}>
        <Button href={`${APP_URL}/learning-hub`} style={EMAIL_STYLES.button}>
          Open Your Learning Hub &rarr;
        </Button>
      </Section>
    </SpoonEmailLayout>
  );
}