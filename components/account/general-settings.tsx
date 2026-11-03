// @/components/account/general-settings.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectGroup,
  SelectLabel,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Bot,
} from "lucide-react";
import { updateAccountSettings, type UserDetails } from "@/lib/actions";

/* =========================================================================
   TypeScript Interfaces
   ========================================================================= */
export interface GeneralSettingsValues {
  displayUsername: string;
  firstName: string;
  lastName: string;
  nativeLanguage: string;
  targetLanguage: string;
  gender: string;
  spriteSlug: string;
  targetVoiceId: string;
}

interface GeneralSettingsProps {
  initialSettings: UserDetails;
  initialImageUrl?: string | null;
  userId: string;
}

/* =========================================================================
   Component
   ========================================================================= */
export function GeneralSettings({
  initialSettings,
  initialImageUrl = null,
  userId,
}: GeneralSettingsProps) {
  const router = useRouter();

  // Map state directly to the new Prisma User + SpriteProfile schema
  const [settings, setSettings] = useState<GeneralSettingsValues>({
    displayUsername:
      initialSettings?.displayUsername || initialSettings?.username || "",
    firstName: initialSettings?.firstName || "",
    lastName: initialSettings?.lastName || "",
    nativeLanguage:
      initialSettings?.nativeLanguage ||
      initialSettings?.spriteProfile?.nativeLanguage ||
      "ENGLISH",
    targetLanguage:
      initialSettings?.targetLanguage ||
      initialSettings?.spriteProfile?.targetLanguage ||
      "FRENCH",
    gender: initialSettings?.gender || "PREFER_NOT_TO_SAY",
    spriteSlug: initialSettings?.spriteProfile?.sprite?.slug || "vox",
    targetVoiceId:
      initialSettings?.spriteProfile?.targetVoiceId || "fr-FR-girl-01",
  });

  // Image & AI Avatar state
  const [imageUrl, setImageUrl] = useState<string | null>(
    initialImageUrl ?? initialSettings?.image ?? null,
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

  const spriteProfile = initialSettings?.spriteProfile;

  // 1. Handle general settings submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateAccountSettings(userId, {
        displayUsername: settings.displayUsername,
        firstName: settings.firstName,
        lastName: settings.lastName,
        nativeLanguage: settings.nativeLanguage,
        targetLanguage: settings.targetLanguage,
        gender: settings.gender,
        spriteSlug: settings.spriteSlug,
        targetVoiceId: settings.targetVoiceId,
      });
      router.refresh();
      toast.success("Profile & Sprite settings updated!");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update settings.";
      console.error("Failed to update settings:", error);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle manual photo upload
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
      await updateAccountSettings(userId, { image: data.url || null });
      toast.success("Profile picture updated successfully!");
      setUnsavedAvatar(false);
      router.refresh();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to upload image.";
      console.error("Failed to upload image:", error);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle AI Avatar generation
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
      toast.success("Avatar generated successfully!");
      setUnsavedAvatar(true);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to generate avatar.";
      console.error("Avatar generation error:", error);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Handle saving AI Avatar to user profile (`User.image`)
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
      await updateAccountSettings(userId, { image: urlToSave });
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
    <div className="space-y-10">
      {/* ========================================================= */}
      {/* 1. General Profile & Sprite Companion Settings            */}
      {/* ========================================================= */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              General Profile & Learning Preferences
            </h2>
            <p className="text-xs text-slate-500">
              Manage your identity, languages, and AI Sprite companion.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Display Username */}
            <div className="space-y-2">
              <Label
                htmlFor="displayUsername"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Display Username
              </Label>
              <Input
                id="displayUsername"
                value={settings.displayUsername}
                placeholder="e.g. paul_h"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    displayUsername: e.target.value,
                  }))
                }
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label
                htmlFor="gender"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Gender (Used for grammatical agreement)
              </Label>
              <Select
                value={settings.gender}
                onValueChange={(value) => {
                  if (value !== null) {
                    setSettings((prev) => ({ ...prev, gender: value }));
                  }
                }}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="NON_BINARY">Non-Binary</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                First Name
              </Label>
              <Input
                id="firstName"
                value={settings.firstName}
                placeholder="e.g. Paul"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Last Name
              </Label>
              <Input
                id="lastName"
                value={settings.lastName}
                placeholder="e.g. Hendricks"
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
            </div>

            {/* Native Language */}
            <div className="space-y-2">
              <Label
                htmlFor="nativeLanguage"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Native Language
              </Label>
              <Select
                value={settings.nativeLanguage}
                onValueChange={(value) => {
                 if (value !== null) {
             
                  setSettings((prev) => ({ ...prev, nativeLanguage: value }));
                }
              }}
              >
                <SelectTrigger id="nativeLanguage" className="w-full">
                  <SelectValue placeholder="Select native language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENGLISH">English</SelectItem>
                  <SelectItem value="FRENCH">French</SelectItem>
                  <SelectItem value="SPANISH">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Language */}
            <div className="space-y-2">
              <Label
                htmlFor="targetLanguage"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Target Learning Language
              </Label>
              <Select
                value={settings.targetLanguage}
                onValueChange={(value) => {
                  if (value !== null) {
                    setSettings((prev) => ({ ...prev, targetLanguage: value }));
                  }
                }}
              >
                <SelectTrigger id="targetLanguage" className="w-full">
                  <SelectValue placeholder="Select target language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRENCH">French</SelectItem>
                  <SelectItem value="SPANISH">Spanish</SelectItem>
                  <SelectItem value="ENGLISH">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ========================================================= */}
          {/* Sprite Companion Sub-Section                              */}
          {/* ========================================================= */}
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {spriteProfile?.sprite?.avatarUrl ? (
                  <img
                    src={spriteProfile.sprite.avatarUrl}
                    alt={spriteProfile.sprite.name}
                    className="h-10 w-10 rounded-full border border-indigo-200 bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    AI Sprite Companion
                  </h3>
                  <p className="text-xs text-slate-500">
                    {spriteProfile?.sprite?.persona ||
                      "Choose your interactive AI partner and voice."}
                  </p>
                </div>
              </div>

              {spriteProfile && (
                <div className="flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>
                    Energy: {spriteProfile.energy} / {spriteProfile.maxEnergy}
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Sprite Character Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="spriteSlug"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Companion Character
                </Label>
                <Select
                  value={settings.spriteSlug}
                  onValueChange={(value) => {
                    if (value !== null) {
                      setSettings((prev) => ({ ...prev, spriteSlug: value }));
                    }
                  }}
                >
                  <SelectTrigger
                    id="spriteSlug"
                    className="w-full bg-white dark:bg-slate-900"
                  >
                    <SelectValue placeholder="Select Sprite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vox">Vox (Male Companion)</SelectItem>
                    <SelectItem value="vivi">
                      Vivi (Female Companion)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Voice ID */}
              <div className="space-y-2">
                <Label
                  htmlFor="targetVoiceId"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Target Voice Persona
                </Label>
                <Select
                  value={settings.targetVoiceId}
                  onValueChange={(value) => {
                    if (value !== null) {
                      setSettings((prev) => ({ ...prev, targetVoiceId: value }));
                    }
                  }}
                >
                  <SelectTrigger
                    id="targetVoiceId"
                    className="w-full bg-white dark:bg-slate-900"
                  >
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr-FR-girl-01">
                      Vivi - French Female (Soft & Natural)
                    </SelectItem>
                    <SelectItem value="fr-FR-boy-01">
                      Vox - French Male (Clear & Articulate)
                    </SelectItem>
                    <SelectItem value="es-ES-girl-01">
                      Vivi - Spanish Female
                    </SelectItem>
                    <SelectItem value="es-ES-boy-01">
                      Vox - Spanish Male
                    </SelectItem>
                    <SelectItem value="en-US-girl-01">
                      Vivi - English Female
                    </SelectItem>
                    <SelectItem value="en-US-boy-01">
                      Vox - English Male
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2 bg-blue-600 text-white shadow-xs hover:bg-blue-700"
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
            </Button>
          </div>
        </div>
      </form>

      {/* ========================================================= */}
      {/* 2. Profile Picture & AI Avatar Studio                     */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Profile Avatar
            </h2>
            <p className="text-xs text-slate-500">
              Upload your own picture or generate a bespoke AI avatar.
            </p>
          </div>

          {!showAvatarGenerator && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAvatarGenerator(true)}
              className="gap-2 border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Avatar Studio</span>
            </Button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Current Avatar & File Upload */}
          <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-slate-200 p-6 dark:border-slate-800">
            <div className="relative flex aspect-square w-32 items-center justify-center overflow-hidden rounded-full shadow-inner ring-4 ring-slate-100 dark:ring-slate-800">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Profile Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <User className="h-12 w-12" />
                </div>
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
                className="block w-full cursor-pointer"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="pointer-events-none w-full gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-slate-500" />
                  )}
                  <span>Upload Image</span>
                </Button>
              </Label>
              <p className="text-[11px] text-slate-400">
                Supports JPG, PNG or WEBP (Max 5MB)
              </p>
            </div>
          </div>

          {/* AI Avatar Studio (Collapsible Panel) */}
          {showAvatarGenerator ? (
            <div className="relative col-span-2 flex flex-col gap-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/20 p-6 shadow-xs dark:border-indigo-900/50 dark:from-slate-900 dark:to-indigo-950/20 md:flex-row">
              <button
                type="button"
                onClick={() => setShowAvatarGenerator(false)}
                className="absolute top-3 right-3 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Controls */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Wand2 className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Generate with AI
                  </h3>
                  <span className="ml-auto rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {generationsRemaining} left
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Type
                    </Label>
                    <Select
                      value={avatarType}
                      onValueChange={(value) => {
                        if (value !== null) {
                          setAvatarType(value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Image Type</SelectLabel>
                          <SelectItem value="realistic_image">
                            Realistic Photo
                          </SelectItem>
                          <SelectItem value="digital_illustration">
                            Digital Illustration
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Aesthetic
                    </Label>
                    <Select
                      value={avatarStyle}
                      onValueChange={(value) => {
                        if (value !== null) {
                          setAvatarStyle(value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Art Style</SelectLabel>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="neon">Neon Glow</SelectItem>
                          <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                          <SelectItem value="low-poly">Low-Poly 3D</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Prompt Description
                  </Label>
                  <Textarea
                    placeholder="e.g. A smiling French teacher wearing round glasses in a cozy Parisian library..."
                    value={avatarDescription}
                    onChange={(e) => setAvatarDescription(e.target.value)}
                    className="min-h-[85px] resize-none text-xs"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateAvatar}
                  disabled={isGenerating || generationsRemaining <= 0}
                  className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                  size="sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Avatar...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create Avatar</span>
                    </>
                  )}
                </Button>
              </div>

              {/* AI Output Preview */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/60 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 md:w-44">
                <div className="relative flex aspect-square w-28 items-center justify-center overflow-hidden rounded-full shadow-md ring-2 ring-indigo-500/20">
                  {aiImageUrl ? (
                    <img
                      src={aiImageUrl}
                      alt="AI Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300 dark:bg-slate-800">
                      <Sparkles className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <span className="mt-2 text-[11px] font-medium text-slate-500">
                  {aiImageUrl ? "Generated Result" : "Waiting for prompt"}
                </span>

                {aiImageUrl && unsavedAvatar && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveAvatar}
                    disabled={isLoading}
                    className="mt-3 h-8 w-full gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>Set as Avatar</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Wand2 className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Want a custom illustrated persona?
              </h4>
              <p className="mt-0.5 mb-3 max-w-xs text-[11px] text-slate-400">
                Use AI Avatar Studio to create a unique character representing
                your learning journey.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarGenerator(true)}
                className="gap-2 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Open Studio</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
