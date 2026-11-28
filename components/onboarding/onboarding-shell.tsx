"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { generateUsername } from "@/lib/username";
import {
  LANGUAGES,
  LEVELS,
  GOALS,
  EMAIL_RE,
  SpriteSlug,
  LANGUAGE_LOCALE_MAP,
} from "./constants";
import { normalizeUsername, validateUsername } from "@/lib/username-validation";
import { Question } from "./question";
import { SelectionCard } from "./selection-card";
import { AccountStep } from "./steps/account-step";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { Gender } from "@prisma/client";
import { SpriteStep } from "./steps/stripe-step";
import { invokeTrialBuilder } from "@/app/actions/invoke-trial-builder";
import { setUserGeneration } from "@/app/actions/set-user-generation";
import { sendOnboardingWelcomeEmail } from "@/lib/actions/send-welcome-email";
import { getLockedSpriteVoices } from "@/lib/sprites/voices";

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
  const [nativeVoiceId, setNativeVoiceId] = useState<string>("");

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

  // Preference State
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [sprite, setSprite] = useState<SpriteSlug>("vox");
  const [voiceId, setVoiceId] = useState<string>("");
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  const handleUsernameChange = (value: string) => {
    setUsername(normalizeUsername(value));
  };

  const shuffleUsername = () => {
    setUsername(generateUsername());
  };

  useEffect(() => {
    setUsername((prev) => prev || generateUsername());
  }, []);

  useEffect(() => {
    if (urlErrorCode) {
      if (urlErrorCode === "account_not_linked") {
        setError(
          "This email is already registered. Please sign in with your password or enable account linking.",
        );
      } else {
        setError(`Google sign in failed (${urlErrorCode}).`);
      }

      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("error");
      const newUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [urlErrorCode, searchParams, router]);

  // Only sign out stale sessions on initial mount at Step 1 when not OAuth or Stripe upgrade
  useEffect(() => {
    if (!isOAuth && !sessionId && step === 1 && !createdUserId) {
      authClient.signOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              : !!sprite;

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

  const handleCompleteOnboarding = async () => {
    let userId = createdUserId || session?.user?.id;

    if (!userId) {
      const fresh = await authClient.getSession();
      userId = fresh?.data?.user?.id ?? undefined;
    }

    if (!userId) {
      console.error("No user ID found");
      setError("User session not found. Please sign in again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const {
        spriteSlug: resolvedSpriteSlug,
        nativeVoiceId: resolvedNativeVoiceId,
        targetVoiceId: resolvedTargetVoiceId,
      } = getLockedSpriteVoices(sprite, nativeLanguage, targetLanguage);

      const commonPayload = {
        userId,
        firstName: firstName.trim(),
        gender: gender || Gender.M,
        spoon: 1,
        nativeLanguage,
        targetLanguage,
        levelBand: level.toLowerCase(),
        goal: goal.toLowerCase(),
        scriptComfort: "unspecified",
        type: "lang",
        isOnboarding: true,
        spriteSlug: resolvedSpriteSlug,
        nativeVoiceId: resolvedNativeVoiceId,
        targetVoiceId: resolvedTargetVoiceId,
      };

      const isPaid = Boolean(sessionId);
      const builderAction = isPaid
        ? invokeEduBuilder({ ...commonPayload, sessionId })
        : invokeTrialBuilder(commonPayload);

      const [builderRes, setupToken] = await Promise.all([
        builderAction,
        setUserGeneration({
          firstName: firstName.trim(),
          gender: gender || Gender.M,
          nativeLanguage,
          targetLanguage,
          level: level.toLowerCase(),
          goal,
          spriteSlug: resolvedSpriteSlug,
          nativeVoiceId: resolvedNativeVoiceId,
          targetVoiceId: resolvedTargetVoiceId,
        }),
        sendOnboardingWelcomeEmail({
          firstName: firstName.trim(),
          targetLanguage,
          isPaid,
        }),
      ]);

      if (builderRes && (builderRes as any).ok === false) {
        throw new Error(
          (builderRes as any).error ||
            "Failed to initialize your first lesson.",
        );
      }

      router.push(`/learning-hub?setup=${setupToken}`);
      router.refresh();
    } catch (err: any) {
      console.error("Failed to save onboarding:", err);
      setError(
        err?.message || "Failed to save your preferences. Please try again.",
      );
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
        const cleanUsername = normalizeUsername(username);

        if (hasAccount) {
          const { data, error } = await authClient.updateUser({
            name,
            firstName: first,
            lastName: last,
            username: cleanUsername,
          });
          if (error) throw error;
          if ((data as any)?.user?.id || session?.user?.id) {
            setCreatedUserId(
              (data as any)?.user?.id || session?.user?.id || null,
            );
          }
        } else {
          const { data, error } = await authClient.signUp.email({
            email: emailValue.trim(),
            password,
            name,
            firstName: first,
            lastName: last,
            username: cleanUsername,
          });
          if (error) throw error;
          if (data?.user?.id) {
            setCreatedUserId(data.user.id);
          }
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
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-slate-50 px-3.5 py-6 font-sans text-slate-900 selection:bg-sky-200 sm:px-6 sm:py-10">
      {/* =====================================================================
          PREMIUM VECTOR & MESH GRADIENT BACKDROP (Outside the Container)
          ===================================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.18),transparent_36rem),radial-gradient(circle_at_85%_25%,rgba(99,102,241,0.15),transparent_36rem),radial-gradient(circle_at_50%_90%,rgba(20,184,166,0.14),transparent_40rem)]"
      />

      {/* Subtle Architectural Vector Grid + Orbit Rings */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-55"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="spoon-onboarding-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(148, 163, 184, 0.16)"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="spoon-grid-mask" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="fade-mask">
            <rect width="100%" height="100%" fill="url(#spoon-grid-mask)" />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="url(#spoon-onboarding-grid)"
          mask="url(#fade-mask)"
        />

        {/* Subtle Decorative Vector Rings */}
        <circle
          cx="12%"
          cy="22%"
          r="140"
          fill="none"
          stroke="rgba(14, 165, 233, 0.14)"
          strokeWidth="1.5"
          strokeDasharray="8 8"
        />
        <circle
          cx="88%"
          cy="76%"
          r="180"
          fill="none"
          stroke="rgba(99, 102, 241, 0.12)"
          strokeWidth="1.5"
        />
      </svg>

      {/* =====================================================================
          ELEVATED 3D ONBOARDING CONTAINER CARD
          ===================================================================== */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[2.25rem] sm:p-10">
        {/* Header: Spoon Logo + Step Pill */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo1-nobg.png"
              alt="Spoon Academy"
              width={150}
              height={42}
              priority
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-black tracking-wider text-blue-700 uppercase">
            <span>
              Step {step} of {totalSteps}
            </span>
          </span>
        </div>

        {/* Spoon Primary Gradient Progress Bar */}
        <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-600 to-teal-400"
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
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
                    gender={gender}
                    setGender={setGender}
                    username={username}
                    setUsername={handleUsernameChange}
                    onShuffleUsername={shuffleUsername}
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
                          <span className="flex-1 font-bold text-slate-900">
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
                          <span className="flex-1 font-bold text-slate-900">
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
                            <p className="font-bold text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500">
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
                        <span className="font-bold text-slate-900">{item}</span>
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
                  description="Vox, Vivi, Dex, or Deva will brief you before every Spoon and coach you through the curriculum."
                >
                  <SpriteStep
                    nativeLanguage={nativeLanguage}
                    targetLanguage={targetLanguage}
                    selectedSprite={sprite}
                    setSelectedSprite={setSprite}
                    selectedNativeVoiceId={nativeVoiceId}
                    setSelectedNativeVoiceId={setNativeVoiceId}
                    selectedVoiceId={voiceId}
                    setSelectedVoiceId={setVoiceId}
                  />
                </Question>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={previousStep}
            disabled={step <= 2}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={nextStep}
            disabled={!canContinue || submitting}
            className="group flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:cursor-not-allowed disabled:border-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none sm:text-base"
          >
            {submitting
              ? "Saving…"
              : step === 1 && !hasAccount
                ? "Create account"
                : step === totalSteps
                  ? "Let's get started"
                  : "Continue"}

            {!submitting && (
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}