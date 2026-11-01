"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  Languages,
  Sparkles,
  UserRound,
  Volume2,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { generateUsername } from "@/lib/username"; // NEW
import {
  LANGUAGES,
  LEVELS,
  GOALS,
  EMAIL_RE,
  SPRITES,
  SPRITE_VOICES,
  SpriteSlug,
  LANGUAGE_LOCALE_MAP,
} from "./constants";
import { normalizeUsername, validateUsername } from "@/lib/username-validation";
import { Question } from "./question";
import { SelectionCard } from "./selection-card";
import { AccountStep } from "./steps/account-step";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { setUserGeneration } from "@/lib/upstash";
import { Gender } from "@prisma/client";
import { SpriteStep } from "./steps/stripe-step";
import { invokeTrialBuilder } from "@/app/actions/invoke-trial-builder";

// 🛡️ Guarantees plain English names always convert to valid BCP-47 locale codes

function getLanguageCode(item: any): string {
  if (item?.code && /^[a-z]{2,3}-[A-Z]{2,4}$/.test(item.code)) return item.code;
  if (item?.value && /^[a-z]{2,3}-[A-Z]{2,4}$/.test(item.value))
    return item.value;
  if (item?.name && LANGUAGE_LOCALE_MAP[item.name])
    return LANGUAGE_LOCALE_MAP[item.name];
  return item?.name ?? "";
}

export default function OnboardingShell({
  sessionId,
  email,
}: {
  sessionId?: string;
  email?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlErrorCode = searchParams.get("error");

  const { data: session, isPending } = authClient.useSession();
  const isOAuth = searchParams.get("oauth") === "1";
  const hasAccount = isOAuth && !!session?.user;

  // Wipe any existing session when arriving on onboarding unless returning from Google click
  useEffect(() => {
    if (!isOAuth) {
      authClient.signOut();
    }
  }, [isOAuth]);

  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Account State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>(Gender.M);
  const [username, setUsername] = useState("");
  const [emailValue, setEmailValue] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preference State (Guaranteed to be "en-US", "fr-FR", etc.)
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [sprite, setSprite] = useState<SpriteSlug>("vox");
  const [voiceId, setVoiceId] = useState<string>("");

  // NEW: user typing goes through this so it's always lowercase
  const handleUsernameChange = (value: string) => {
    setUsername(normalizeUsername(value));
  };

  // NEW: shuffle button handler
  const shuffleUsername = () => {
    setUsername(generateUsername());
  };

  // NEW: suggest a username once on mount, never overwrite what the user typed
  useEffect(() => {
    setUsername((prev) => prev || generateUsername());
  }, []);

  // Check for URL errors (like account_not_linked) and display them in the UI
  useEffect(() => {
    if (urlErrorCode) {
      if (urlErrorCode === "account_not_linked") {
        setError(
          "This email is already registered. Please sign in with your password or enable account linking.",
        );
      } else {
        setError(`Google sign in failed (${urlErrorCode}).`);
      }

      // Clean the error from the URL
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("error");
      const newUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [urlErrorCode, searchParams, router]);

  useEffect(() => {
    if (!isOAuth || !session?.user) return;

    const [first, ...rest] = (session.user.name ?? "").split(" ");

    setFirstName((prev) => prev || first || "");
    setLastName((prev) => prev || rest.join(" "));
    setEmailValue((prev) => prev || session.user.email || "");
  }, [isOAuth, session?.user]);

  const usernameError = username ? validateUsername(username) : null;

  const accountValid =
    !isPending &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    validateUsername(username) === null &&
    (gender === Gender.M || gender === Gender.F) &&
    (hasAccount || (EMAIL_RE.test(emailValue.trim()) && password.length >= 8));

  const canContinue =
    step === 1
      ? accountValid
      : step === 2
        ? !!nativeLanguage
        : step === 3
          ? !!targetLanguage && targetLanguage !== nativeLanguage
          : step === 4
            ? !!level
            : step === 5
              ? !!goal
              : !!sprite && !!voiceId;

  const signInWithGoogle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setError(null);

    const params = new URLSearchParams();
    params.set("oauth", "1");
    if (sessionId) params.set("session_id", sessionId);
    const currentUrl = `/onboarding?${params.toString()}`;

    try {
      const { error: signInError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: currentUrl,
        errorCallbackURL: currentUrl,
      });

      if (signInError) {
        setError(signInError.message || "Failed to connect to Google.");
      }
    } catch (err) {
      console.error("Google OAuth error:", err);
      setError("An unexpected error occurred connecting to Google.");
    }
  };

  // 2. Replace handleCompleteOnboarding (lines 166-206) with this:
  const handleCompleteOnboarding = async () => {
    const userId = session?.user?.id;

    if (!userId) {
      console.error("No user ID found");
      setError("User session not found. Please try refreshing the page.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const voiceSuffix =
        voiceId.split("-").slice(2).join("-") ||
        (sprite === "vivi" ? "girl-01" : "boy-01");

      const resolvedNativeVoiceId = `${nativeLanguage}-${voiceSuffix}`;
      const resolvedTargetVoiceId =
        voiceId || `${targetLanguage}-${voiceSuffix}`;

      const commonPayload = {
        userId,
        firstName,
        gender: gender || Gender.M,
        spoon: 1,
        nativeLanguage,
        targetLanguage,
        levelBand: level.toLowerCase(),
        goal: goal.toLowerCase(),
        scriptComfort: "unspecified",
        type: "lang",
        isOnboarding: true,
        spriteSlug: sprite,
        nativeVoiceId: resolvedNativeVoiceId,
        targetVoiceId: resolvedTargetVoiceId,
      };

      // 🟢 BRANCH: Paid with Stripe vs. Free Trial Milestone 1
      const isPaid = Boolean(sessionId);
      const builderAction = isPaid
        ? invokeEduBuilder({ ...commonPayload, sessionId })
        : invokeTrialBuilder(commonPayload);

      const [_, setupToken] = await Promise.all([
        builderAction,
        setUserGeneration({
          firstName: firstName.trim(),
          gender: gender || Gender.M,
          nativeLanguage,
          targetLanguage,
          level: level.toLowerCase(),
          goal,
          spriteSlug: sprite,
          nativeVoiceId: resolvedNativeVoiceId,
          targetVoiceId: resolvedTargetVoiceId,
        }),
      ]);

      router.push(`/learning-hub?setup=${setupToken}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to save onboarding:", err);
      setError("Failed to save your preferences. Please try again.");
      setSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (!canContinue || submitting) return;

    if (step === 1) {
      setSubmitting(true);
      setError(null);

      try {
        const first = firstName.trim();
        const last = lastName.trim();
        const name = `${first} ${last}`;
        const cleanUsername = normalizeUsername(username); // NEW

        if (hasAccount) {
          const { error } = await authClient.updateUser({
            name,
            firstName: first,
            lastName: last,
            username: cleanUsername, // CHANGED
          });
          if (error) throw error;
        } else {
          const { error } = await authClient.signUp.email({
            email: emailValue.trim(),
            password,
            name,
            firstName: first,
            lastName: last,
            username: cleanUsername, // CHANGED
          });
          if (error) throw error;
        }
        setStep(2);
      } catch (err) {
        setError(
          (err as { message?: string })?.message ??
            "Something went wrong. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step < totalSteps) {
      setStep((current) => current + 1);
    } else {
      await handleCompleteOnboarding();
    }
  };

  const previousStep = () => {
    if (step > 2) setStep((current) => current - 1);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8F9FC] font-sans selection:bg-violet-200">
      {/* Background Blurs */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute -left-40 top-40 -z-10 h-[400px] w-[400px] rounded-full bg-teal-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-40 top-80 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-400/10 blur-[100px]" />

      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            SPOON ACADEMY
          </span>
          <span className="text-sm font-bold text-gray-400">
            {step} / {totalSteps}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-12 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500"
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Dynamic Step Content */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <Question
                  key="account"
                  icon={<UserRound className="h-5 w-5" />}
                  eyebrow="Welcome to Spoon"
                  title={
                    hasAccount ? "Finish your profile" : "Create your account"
                  }
                  description={
                    hasAccount
                      ? "Just a couple of details and you're in."
                      : "Sign up to save your progress and pick up where you left off."
                  }
                >
                  <AccountStep
                    hasAccount={hasAccount}
                    isPending={isPending}
                    lockedEmail={email}
                    firstName={firstName}
                    setFirstName={setFirstName}
                    lastName={lastName}
                    setLastName={setLastName}
                    gender={gender} // <-- NEW
                    setGender={setGender} // <-- NEW
                    username={username}
                    setUsername={handleUsernameChange} // CHANGED
                    onShuffleUsername={shuffleUsername} // NEW
                    email={emailValue}
                    setEmail={setEmailValue}
                    password={password}
                    setPassword={setPassword}
                    error={error}
                    onGoogleSignIn={signInWithGoogle}
                    usernameError={usernameError}
                  />
                </Question>
              )}

              {/* Step 2: Native Language */}
              {step === 2 && (
                <Question
                  key="native"
                  icon={<Globe2 className="h-5 w-5" />}
                  eyebrow="First things first"
                  title="What's your native language?"
                  description="We'll use this to personalize translations and explanations."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {LANGUAGES.map((item) => {
                      const langCode = getLanguageCode(item);

                      return (
                        <SelectionCard
                          key={item.name}
                          selected={nativeLanguage === langCode}
                          onClick={() => setNativeLanguage(langCode)}
                        >
                          <span className="text-2xl">{item.flag}</span>
                          <span className="flex-1 font-bold text-gray-900">
                            {item.name}
                          </span>
                        </SelectionCard>
                      );
                    })}
                  </div>
                </Question>
              )}

              {/* Step 3: Target Language */}
              {step === 3 && (
                <Question
                  key="target"
                  icon={<Sparkles className="h-5 w-5" />}
                  eyebrow="Your learning journey"
                  title="What language do you want to learn?"
                  description="Choose the language you want to start mastering."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {LANGUAGES.filter(
                      (item) => getLanguageCode(item) !== nativeLanguage,
                    ).map((item) => {
                      const langCode = getLanguageCode(item);

                      return (
                        <SelectionCard
                          key={item.name}
                          selected={targetLanguage === langCode}
                          onClick={() => setTargetLanguage(langCode)}
                        >
                          <span className="text-2xl">{item.flag}</span>
                          <span className="flex-1 font-bold text-gray-900">
                            {item.name}
                          </span>
                        </SelectionCard>
                      );
                    })}
                  </div>
                </Question>
              )}

              {/* Step 4: Level */}
              {step === 4 && (
                <Question
                  key="level"
                  icon={<Languages className="h-5 w-5" />}
                  eyebrow="Know yourself"
                  title="What's your current level?"
                  description="Don't worry about getting this perfect. You can change it later."
                >
                  <div className="grid gap-3">
                    {LEVELS.map((item) => {
                      const levelValue =
                        (item as any).value ??
                        (item as any).id ??
                        item.name.toLowerCase();

                      return (
                        <SelectionCard
                          key={item.name}
                          selected={level === levelValue}
                          onClick={() => setLevel(levelValue)}
                        >
                          <div>
                            <p className="font-bold text-gray-900">
                              {item.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-500">
                              {item.description}
                            </p>
                          </div>
                        </SelectionCard>
                      );
                    })}
                  </div>
                </Question>
              )}

              {/* Step 5: Goal */}
              {step === 5 && (
                <Question
                  key="goal"
                  icon={<Sparkles className="h-5 w-5" />}
                  eyebrow="Make it yours"
                  title="What do you want to focus on?"
                  description="We'll tailor your experience around what matters most to you."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {GOALS.map((item) => (
                      <SelectionCard
                        key={item}
                        selected={goal === item}
                        onClick={() => setGoal(item)}
                      >
                        <span className="font-bold text-gray-900">{item}</span>
                      </SelectionCard>
                    ))}
                  </div>
                </Question>
              )}

              {/* Step 6: Sprite & Voice */}
              {step === 6 && (
                <Question
                  key="sprite"
                  icon={<Volume2 className="h-5 w-5" />}
                  eyebrow="Your AI Companion"
                  title="Choose your guide & voice"
                  description="Vox or Vivi will brief you before every Spoon and coach you through the curriculum."
                >
                  <SpriteStep
                    targetLanguage={targetLanguage}
                    selectedSprite={sprite}
                    setSelectedSprite={setSprite}
                    selectedVoiceId={voiceId}
                    setSelectedVoiceId={setVoiceId}
                  />
                </Question>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 flex items-center justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={step <= 2}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 transition hover:bg-white hover:text-gray-900 disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={nextStep}
            disabled={!canContinue || submitting}
            className="group flex items-center gap-2 rounded-2xl bg-gray-900 px-7 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-gray-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-900"
          >
            {submitting
              ? "Saving…"
              : step === 1 && !hasAccount
                ? "Create account"
                : step === totalSteps
                  ? "Let's get started"
                  : "Continue"}

            {!submitting && (
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
