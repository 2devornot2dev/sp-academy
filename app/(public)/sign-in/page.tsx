import { SignInForm } from "./sign-in-form";
import Image from "next/image";
import Link from "next/link";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  // Only allow internal paths to prevent open redirects
  const callbackURL =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/dashboard";

  return (
    <div className="flex min-h-dvh bg-white">
      {/* Left Panel - Image & Branding (Hidden on small screens) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-zinc-900 lg:flex">
        <Image
          src="/sign-in-image.png"
          alt="Spoon Academy"
          fill
          className="object-cover opacity-50"
          priority
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/40" />

        {/* Top Left Branding */}
        <div className="relative z-10 flex items-center p-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
          >
            Spoon Academy
          </Link>
        </div>

        {/* Bottom Left Quote/Text */}
        <div className="relative z-10 p-10 text-white">
          <blockquote className="space-y-2">
            <p className="text-2xl font-medium leading-snug">
              &ldquo;Transform your learning experience with our cutting-edge
              AI-powered approach. Learning has never been this
              intuitive.&rdquo;
            </p>
            <footer className="text-sm text-zinc-300">
              — The Spoon Academy Team
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Panel - Sign In Form (centered at every breakpoint) */}
      <div className="flex min-h-dvh w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <SignInForm callbackURL={callbackURL} />
        </div>
      </div>
    </div>
  );
}