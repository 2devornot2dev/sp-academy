// components/account/general-settings.tsx
"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  Wand2,
  User,
  Save,
  Sparkles,
  X,
  CheckCircle2,
  Zap,
  Check,
  Bot,
  Lock,
  Mail,
  Send,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { updateAccountSettings, type UserDetails } from "@/lib/actions";
import { updateLanguageLevel } from "@/app/actions/update-language-level";
import { sendSupportRequest } from "@/app/actions/support-actions";
import {
  getLockedSpriteVoices,
  normalizeSpriteSlug,
  type SpriteSlug,
} from "@/lib/sprites/voices";

export interface GeneralSettingsValues {
  displayUsername: string;
  firstName: string;
  lastName: string;
  levelBand: "zero" | "beginner" | "intermediate";
  gender: string;
  spriteSlug: SpriteSlug;
}

interface SpriteRecord {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  persona: string | null;
}

interface GeneralSettingsProps {
  initialSettings: UserDetails;
  initialImageUrl?: string | null;
  initialLevelBand?: string;
  sprites?: SpriteRecord[];
  userId: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  "fr-FR": "🇫🇷 French",
  "es-ES": "🇪🇸 Spanish",
  "en-US": "🇺🇸 English",
  "de-DE": "🇩🇪 German",
  "it-IT": "🇮🇹 Italian",
};

const SPRITE_META: Record<
  SpriteSlug,
  {
    name: string;
    role: string;
    fallbackAvatar: string;
    desc: string;
    gradient: string;
  }
> = {
  vox: {
    name: "Vox",
    role: "Playful • Mic Master",
    fallbackAvatar: "/sprite-m.png",
    desc: "High-energy pronunciation coach who hypes up every win.",
    gradient: "from-sky-400 to-blue-600",
  },
  vivi: {
    name: "Vivi",
    role: "Warm • Expression Guide",
    fallbackAvatar: "/sprite-f.png",
    desc: "Calm, clear, audio-focused guide who breaks down tricky phrases.",
    gradient: "from-fuchsia-400 to-purple-600",
  },
  dex: {
    name: "Dex",
    role: "Young Adult • Sharp & Chill",
    fallbackAvatar: "/sprite-dex.png",
    desc: "Clever, calm strategist who gets you sounding smooth and natural.",
    gradient: "from-teal-400 to-emerald-600",
  },
  deva: {
    name: "Deva",
    role: "Young Adult • Bold & Playful",
    fallbackAvatar: "/sprite-deva.png",
    desc: "Confident hype coach who makes real-world speaking feel effortless.",
    gradient: "from-amber-400 to-orange-500",
  },
};

function normalizeLanguageSelect(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  const u = raw.trim().toUpperCase();
  if (u === "FRENCH" || u === "FR" || u === "FR-FR") return "fr-FR";
  if (u === "SPANISH" || u === "ES" || u === "ES-ES") return "es-ES";
  if (u === "ENGLISH" || u === "EN" || u === "EN-US") return "en-US";
  if (u === "GERMAN" || u === "DE" || u === "DE-DE") return "de-DE";
  if (u === "ITALIAN" || u === "IT" || u === "IT-IT") return "it-IT";
  return fallback;
}

function normalizeGenderSelect(raw: string | null | undefined): string {
  if (!raw) return "PREFER_NOT_TO_SAY";
  const u = raw.trim().toUpperCase();
  if (u === "M" || u === "MALE") return "MALE";
  if (u === "F" || u === "FEMALE") return "FEMALE";
  if (u === "NB" || u === "NON_BINARY") return "NON_BINARY";
  return "PREFER_NOT_TO_SAY";
}

function normalizeLevelBand(
  raw?: string | null,
): "zero" | "beginner" | "intermediate" {
  const l = (raw || "").trim().toLowerCase();
  if (l === "zero" || l === "0" || l === "a0") return "zero";
  if (l === "intermediate" || l === "b1" || l === "b2" || l === "a2") {
    return "intermediate";
  }
  return "beginner";
}

export function GeneralSettings({
  initialSettings,
  initialImageUrl = null,
  initialLevelBand = "beginner",
  sprites = [],
  userId,
}: GeneralSettingsProps) {
  const router = useRouter();

  const lockedTargetLang = normalizeLanguageSelect(
    initialSettings?.targetLanguage ||
      initialSettings?.spriteProfile?.targetLanguage,
    "fr-FR",
  );
  const lockedNativeLang = normalizeLanguageSelect(
    initialSettings?.nativeLanguage ||
      initialSettings?.spriteProfile?.nativeLanguage,
    "en-US",
  );
  const initSpriteSlug = normalizeSpriteSlug(
    initialSettings?.spriteProfile?.sprite?.slug,
  );

  const [settings, setSettings] = useState<GeneralSettingsValues>({
    displayUsername:
      initialSettings?.displayUsername || initialSettings?.username || "",
    firstName: initialSettings?.firstName || "",
    lastName: initialSettings?.lastName || "",
    levelBand: normalizeLevelBand(initialLevelBand),
    gender: normalizeGenderSelect(initialSettings?.gender),
    spriteSlug: initSpriteSlug,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(
    initialImageUrl ??
      initialSettings?.avatarUrl ??
      initialSettings?.image ??
      null,
  );
  const [generationsRemaining, setGenerationsRemaining] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [avatarDescription, setAvatarDescription] = useState<string>("");
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [avatarType, setAvatarType] = useState<string>("realistic_image");
  const [avatarStyle, setAvatarStyle] = useState<string>("default");
  const [showAvatarGenerator, setShowAvatarGenerator] =
    useState<boolean>(false);
  const [unsavedAvatar, setUnsavedAvatar] = useState<boolean>(false);
  const [brokenSprites, setBrokenSprites] = useState<Record<string, boolean>>(
    {},
  );

  // Language change email request modal (covers both native & target)
  const [showLangModal, setShowLangModal] = useState(false);
  const [desiredNative, setDesiredNative] = useState(lockedNativeLang);
  const [desiredTarget, setDesiredTarget] = useState(
    lockedTargetLang === "fr-FR" ? "es-ES" : "fr-FR",
  );
  const [langReason, setLangReason] = useState("");
  const [langSubmitting, setLangSubmitting] = useState(false);

  const spriteProfile = initialSettings?.spriteProfile;

  const spriteOptions = (["vox", "vivi", "dex", "deva"] as SpriteSlug[]).map(
    (slug) => {
      const dbMatch = sprites.find((s) => s.slug === slug);
      const meta = SPRITE_META[slug];
      return {
        slug,
        name: dbMatch?.name || meta.name,
        role: meta.role,
        avatar: dbMatch?.avatarUrl || meta.fallbackAvatar,
        desc: dbMatch?.persona || meta.desc,
        gradient: meta.gradient,
      };
    },
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const lockedVoices = getLockedSpriteVoices(
        settings.spriteSlug,
        lockedNativeLang,
        lockedTargetLang,
      );

      await Promise.all([
        updateAccountSettings(userId, {
          displayUsername: settings.displayUsername.trim(),
          firstName: settings.firstName.trim(),
          lastName: settings.lastName.trim(),
          nativeLanguage: lockedNativeLang,
          targetLanguage: lockedTargetLang,
          gender: settings.gender,
          spriteSlug: lockedVoices.spriteSlug,
          nativeVoiceId: lockedVoices.nativeVoiceId,
          targetVoiceId: lockedVoices.targetVoiceId,
        }),
        updateLanguageLevel({
          languageCode: lockedTargetLang,
          levelBand: settings.levelBand,
        }),
      ]);

      router.refresh();
      toast.success("Profile, Sprite & level settings saved!");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update settings.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitLanguageRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!langReason.trim() || langSubmitting) return;
    setLangSubmitting(true);
    try {
      const res = await sendSupportRequest({
        eyebrow: "Language Switch Request",
        subject: `Language Change Request (${lockedNativeLang}→${lockedTargetLang})`,
        message: `Current pair: Native ${lockedNativeLang} / Target ${lockedTargetLang}\nRequested pair: Native ${desiredNative} / Target ${desiredTarget}\n\nReason:\n${langReason.trim()}`,
      });
      if (res?.ok) {
        toast.success("Request sent! We'll follow up by email shortly.");
        setLangReason("");
        setShowLangModal(false);
      } else {
        toast.error("Could not send request—email hello@spoonacademy.com.");
      }
    } catch {
      toast.error("Could not send request—email hello@spoonacademy.com.");
    } finally {
      setLangSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const response = await fetch(
        `/api/users/${userId}/upload-profile-picture`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setImageUrl(data.url);
      await updateAccountSettings(userId, {
        image: data.url || null,
        avatarUrl: data.url || null,
      });
      toast.success("Profile picture updated!");
      setUnsavedAvatar(false);
      router.refresh();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to upload image.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAvatar = async () => {
    if (generationsRemaining <= 0) {
      toast.error("You've reached your monthly generation limit.");
      return;
    }

    if (!avatarDescription.trim()) {
      toast.error("Please provide a short description for your avatar.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/users/${userId}/generate/avatar-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: avatarDescription,
            type: avatarType,
            style: avatarStyle,
            userId,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate avatar");
      }

      setAiImageUrl(data.imageUrl);
      setGenerationsRemaining((prev) => Math.max(0, prev - 1));
      toast.success("Avatar generated!");
      setUnsavedAvatar(true);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to generate avatar.";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAvatar = async () => {
    const urlToSave = aiImageUrl;
    if (!urlToSave) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/users/${userId}/generate/avatar/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiImageUrl: urlToSave, userId }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to save AI avatar");

      setImageUrl(urlToSave);
      await updateAccountSettings(userId, {
        image: urlToSave,
        avatarUrl: urlToSave,
      });
      toast.success("AI avatar saved as your profile picture!");
      setUnsavedAvatar(false);
      router.refresh();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to save AI avatar.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* =========================================================
          1. GENERAL PROFILE & SPRITE COMPANION SETTINGS
          ========================================================= */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-sm sm:p-8"
      >
        <div className="space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 sm:pb-5">
            <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs">
              <User className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Profile Identity &amp; Learning Level
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
                Update your details, grammatical gender, and difficulty level.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {/* First Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="firstName"
                className="text-[11px] font-black tracking-wider text-slate-500 uppercase"
              >
                First Name
              </Label>
              <Input
                id="firstName"
                value={settings.firstName}
                placeholder="e.g. Paul"
                className="h-11 rounded-2xl border-2 border-slate-200 bg-slate-50/60 font-bold text-slate-900 focus:border-blue-500 focus:bg-white"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
              />
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="lastName"
                className="text-[11px] font-black tracking-wider text-slate-500 uppercase"
              >
                Last Name
              </Label>
              <Input
                id="lastName"
                value={settings.lastName}
                placeholder="e.g. Hendricks"
                className="h-11 rounded-2xl border-2 border-slate-200 bg-slate-50/60 font-bold text-slate-900 focus:border-blue-500 focus:bg-white"
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
            </div>

            {/* Display Username */}
            <div className="space-y-1.5">
              <Label
                htmlFor="displayUsername"
                className="text-[11px] font-black tracking-wider text-slate-500 uppercase"
              >
                Display Username
              </Label>
              <Input
                id="displayUsername"
                value={settings.displayUsername}
                placeholder="e.g. paul_h"
                className="h-11 rounded-2xl border-2 border-slate-200 bg-slate-50/60 font-bold text-slate-900 focus:border-blue-500 focus:bg-white"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    displayUsername: e.target.value,
                  }))
                }
              />
            </div>

            {/* Grammatical Gender */}
            <div className="space-y-1.5">
              <Label
                htmlFor="gender"
                className="text-[11px] font-black tracking-wider text-slate-500 uppercase"
              >
                Grammatical Gender
              </Label>
              <select
                id="gender"
                value={settings.gender}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, gender: e.target.value }))
                }
                className="h-11 w-full cursor-pointer rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-3.5 text-xs font-black text-slate-900 transition focus:border-blue-600 focus:bg-white focus:outline-none"
              >
                <option value="MALE">Male (Masculine forms)</option>
                <option value="FEMALE">Female (Feminine forms)</option>
                <option value="NON_BINARY">Non-Binary</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>

            {/* Current Level (Zero / Beginner / Intermediate) */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label
                htmlFor="levelBand"
                className="flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase"
              >
                <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                <span>Current Level</span>
              </Label>
              <select
                id="levelBand"
                value={settings.levelBand}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    levelBand: e.target.value as
                      | "zero"
                      | "beginner"
                      | "intermediate",
                  }))
                }
                className="h-11 w-full cursor-pointer rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-sky-50/40 px-3.5 text-xs font-black text-slate-900 transition focus:border-blue-600 focus:bg-white focus:outline-none"
              >
                <option value="zero">Zero — Starting from scratch</option>
                <option value="beginner">Beginner — Know some basics</option>
                <option value="intermediate">
                  Intermediate — Simple conversations
                </option>
              </select>
              <p className="text-[11px] font-semibold text-slate-400">
                Applies to your upcoming Spoons &amp; AI chats.
              </p>
            </div>

            {/* Locked Native & Target Language Pair */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase">
                <Lock className="h-3 w-3 text-slate-400" />
                <span>Language Track (Locked)</span>
              </Label>
              <div className="flex flex-col justify-between gap-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-black text-slate-800">
                  <span className="rounded-lg bg-white px-2.5 py-1 ring-1 ring-slate-200">
                    Native:{" "}
                    {LANGUAGE_LABELS[lockedNativeLang] || lockedNativeLang}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-blue-800 ring-1 ring-sky-200">
                    Learning:{" "}
                    {LANGUAGE_LABELS[lockedTargetLang] || lockedTargetLang}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLangModal(true)}
                  className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-black text-blue-600 shadow-2xs transition hover:bg-sky-50"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Request Change</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================
              4-SPRITE COMPANION 3D SELECTOR (Voices locked 1:1!)
              ========================================================= */}
          <div className="rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 bg-slate-50/70 p-4 sm:p-5">
            <div className="mb-3.5 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                  AI Sidekick &amp; Locked Voice
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Choose Your Sprite Companion
                </h3>
              </div>

              {spriteProfile && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                  <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  <span>
                    Energy: {spriteProfile.energy} / {spriteProfile.maxEnergy}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {spriteOptions.map((sp) => {
                const active = settings.spriteSlug === sp.slug;
                return (
                  <button
                    key={sp.slug}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, spriteSlug: sp.slug }))
                    }
                    className={`flex items-start gap-3 rounded-2xl border-2 border-b-4 p-3.5 sm:p-4 text-left transition-all ${
                      active
                        ? "border-blue-600 border-b-blue-800 bg-white shadow-sm"
                        : "border-slate-200 border-b-slate-300 bg-white/75 hover:border-sky-300 hover:bg-white"
                    }`}
                  >
                    {sp.avatar && !brokenSprites[sp.slug] ? (
                      <img
                        src={sp.avatar}
                        alt={sp.name}
                        onError={() =>
                          setBrokenSprites((prev) => ({
                            ...prev,
                            [sp.slug]: true,
                          }))
                        }
                        className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 object-cover object-top"
                      />
                    ) : (
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b text-white ${sp.gradient}`}
                      >
                        <Bot className="h-6 w-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {sp.name}
                        </span>
                        {active && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] font-extrabold text-blue-600 uppercase">
                        {sp.role}
                      </span>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-slate-500">
                        {sp.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] font-semibold text-slate-400">
              Each Sprite uses its own matched native &amp; target voice
              automatically.
            </p>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-7 py-3.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 sm:text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save General Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* =========================================================
          2. PROFILE PICTURE & AI AVATAR STUDIO
          ========================================================= */}
      <div className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Profile Avatar &amp; AI Studio
            </h2>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
              Upload your own photo or generate a custom illustrated persona.
            </p>
          </div>

          {!showAvatarGenerator && (
            <button
              type="button"
              onClick={() => setShowAvatarGenerator(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-[3px] border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>AI Avatar Studio</span>
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 sm:p-6">
            <div className="relative flex aspect-square w-24 sm:w-28 items-center justify-center overflow-hidden rounded-3xl border-2 border-b-4 border-sky-300 bg-white shadow-md">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Profile Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-slate-300" />
              )}
            </div>

            <div className="w-full space-y-2 text-center">
              <input
                type="file"
                id="profile-picture-input"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label
                htmlFor="profile-picture-input"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-2xs transition hover:border-sky-300 hover:bg-sky-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-blue-600" />
                )}
                <span>Upload Photo</span>
              </Label>
              <p className="text-[11px] font-semibold text-slate-400">
                JPG, PNG or WEBP (Max 5MB)
              </p>
            </div>
          </div>

          {showAvatarGenerator ? (
            <div className="relative flex flex-col gap-5 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 p-4 sm:p-5 md:col-span-2 md:flex-row">
              <button
                type="button"
                onClick={() => setShowAvatarGenerator(false)}
                className="absolute top-3 right-3 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 pr-8">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl border-b-2 border-indigo-800 bg-indigo-600 text-white">
                    <Wand2 className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-sm font-black text-slate-900">
                    Generate with AI
                  </h3>
                  <span className="ml-auto rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black text-indigo-700 uppercase">
                    {generationsRemaining} left
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                      Type
                    </Label>
                    <select
                      value={avatarType}
                      onChange={(e) => setAvatarType(e.target.value)}
                      className="h-9 w-full rounded-xl border-2 border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-900"
                    >
                      <option value="realistic_image">Realistic Photo</option>
                      <option value="digital_illustration">
                        Digital Illustration
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                      Aesthetic
                    </Label>
                    <select
                      value={avatarStyle}
                      onChange={(e) => setAvatarStyle(e.target.value)}
                      className="h-9 w-full rounded-xl border-2 border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-900"
                    >
                      <option value="default">Default</option>
                      <option value="neon">Neon Glow</option>
                      <option value="cyberpunk">Cyberpunk</option>
                      <option value="low-poly">Low-Poly 3D</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                    Prompt Description
                  </Label>
                  <Textarea
                    placeholder="e.g. A smiling French speaker wearing round glasses in a Parisian café..."
                    value={avatarDescription}
                    onChange={(e) => setAvatarDescription(e.target.value)}
                    className="min-h-[80px] resize-none rounded-xl border-2 border-slate-200 bg-white text-xs font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  disabled={isGenerating || generationsRemaining <= 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-3 text-xs font-black text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Avatar...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create AI Avatar</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 md:w-44">
                <div className="relative flex aspect-square w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-indigo-200 bg-slate-50 shadow-inner">
                  {aiImageUrl ? (
                    <img
                      src={aiImageUrl}
                      alt="AI Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Sparkles className="h-7 w-7 text-slate-300" />
                  )}
                </div>

                <span className="mt-2 text-[11px] font-bold text-slate-400">
                  {aiImageUrl ? "Generated Result" : "Preview"}
                </span>

                {aiImageUrl && unsavedAvatar && (
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={isLoading}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-b-2 border-emerald-700 bg-emerald-500 py-2 text-xs font-black text-white transition hover:bg-emerald-600"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>Use This Avatar</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center md:col-span-2">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border-b-2 border-indigo-800 bg-indigo-600 text-white shadow-xs">
                <Wand2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Want a custom AI-illustrated avatar?
              </h4>
              <p className="mt-0.5 mb-4 max-w-xs text-xs font-medium text-slate-500">
                Describe your vibe and generate a bespoke 3D or illustrated
                portrait for your profile and leaderboards.
              </p>
              <button
                type="button"
                onClick={() => setShowAvatarGenerator(true)}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-800 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Launch AI Studio</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Language Change Request Modal (Covers Native & Target) */}
      {showLangModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-black text-slate-900">
                    Request Language Switch
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLangModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-4 text-xs font-semibold leading-relaxed text-slate-500">
                Language tracks are locked after onboarding so your Spoons and
                Word Matrix stay consistent. Tell us what you&apos;d like to
                switch to and why, and we&apos;ll help you out.
              </p>

              <form
                onSubmit={handleSubmitLanguageRequest}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                      Native Language
                    </Label>
                    <select
                      value={desiredNative}
                      onChange={(e) => setDesiredNative(e.target.value)}
                      className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-2.5 text-xs font-black text-slate-900 focus:border-sky-400 focus:outline-none"
                    >
                      <option value="en-US">🇺🇸 English</option>
                      <option value="fr-FR">🇫🇷 French</option>
                      <option value="es-ES">🇪🇸 Spanish</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                      Target Language
                    </Label>
                    <select
                      value={desiredTarget}
                      onChange={(e) => setDesiredTarget(e.target.value)}
                      className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-2.5 text-xs font-black text-slate-900 focus:border-sky-400 focus:outline-none"
                    >
                      <option value="fr-FR">🇫🇷 French</option>
                      <option value="es-ES">🇪🇸 Spanish</option>
                      <option value="en-US">🇺🇸 English</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                    Why do you want to switch?
                  </Label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Picked the wrong language by mistake during signup..."
                    value={langReason}
                    onChange={(e) => setLangReason(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={langSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3 text-xs font-black text-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {langSubmitting ? "Sending..." : "Send Switch Request"}
                  </span>
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
