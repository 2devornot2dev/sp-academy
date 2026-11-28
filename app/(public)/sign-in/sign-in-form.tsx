"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

const NO_SUBSCRIPTION_MESSAGE =
  "We couldn't find an active subscription for that account. Purchase one first, then sign in with the same email.";

const ERROR_MESSAGES: Record<string, string> = {
  subscription_required: NO_SUBSCRIPTION_MESSAGE,
  unable_to_create_user: NO_SUBSCRIPTION_MESSAGE,
  unable_to_create_session: NO_SUBSCRIPTION_MESSAGE,
  signup_disabled: NO_SUBSCRIPTION_MESSAGE,
  access_denied: "Google sign-in was cancelled.",
};

function SignInFormInner({ callbackURL }: { callbackURL: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlErrorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (urlErrorCode) {
      const errorMessage =
        ERROR_MESSAGES[urlErrorCode] ??
        `Sign in failed (${urlErrorCode}). Please try again.`;

      toast.error("Access Denied", {
        description: errorMessage,
        duration: 6000,
      });

      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("error");
      const newUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [urlErrorCode, searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL,
    });

    if (error) {
      toast.error("Sign in failed", {
        description: error.message ?? "Something went wrong",
      });
      setLoading(false);
      return;
    }

    router.push(callbackURL);
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/sign-in",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      {/* Header: logo, "Academy", heading, subtitle — all centered */}
      <div className="flex flex-col items-center text-center">
        <img
          src="/logo1-nobg.png"
          alt="Spoon Academy"
          className="block h-14 sm:h-24 w-auto object-contain"
        />
        <p className="mt-1 pl-[0.1em] text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Academy
        </p>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email to sign in to your account
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="mt-2 flex w-full items-center justify-center rounded-md bg-black px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 disabled:opacity-50"
      >
        <FcGoogle className="h-5 w-5" />
        {googleLoading ? "Redirecting..." : "Google"}
      </button>
    </form>
  );
}

export function SignInForm({ callbackURL }: { callbackURL: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex w-full justify-center p-8 text-sm text-gray-500">
          Loading sign in...
        </div>
      }
    >
      <SignInFormInner callbackURL={callbackURL} />
    </Suspense>
  );
}