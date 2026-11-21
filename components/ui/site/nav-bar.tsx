"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Menu,
  Home,
  Sparkles,
  Compass,
  Star,
  ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SpoonLogo } from "../misc/logo";

const NAV_LINKS = [
  {
    label: "Home",
    href: "#home",
    icon: Home,
    iconBg: "bg-blue-50 text-blue-500",
  },
  {
    label: "Features",
    href: "#features",
    icon: Sparkles,
    iconBg: "bg-emerald-50 text-emerald-500",
  },
  {
    label: "Possibilities",
    href: "#possibilities",
    icon: Compass,
    iconBg: "bg-purple-50 text-purple-500",
  },
  {
    label: "Testimonials",
    href: "#stats",
    icon: Star,
    iconBg: "bg-amber-50 text-amber-500",
  },
];

export default function NavigationBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="shrink-0 transition-transform hover:scale-105 active:scale-95">
            <Link href="/" onClick={() => setIsOpen(false)}>
              <SpoonLogo className="text-xl md:text-2xl" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-gray-700 transition-colors hover:text-blue-600"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center space-x-4 md:flex">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/sign-in" />}
            >
              Sign In
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl hover:bg-slate-100"
                    aria-label="Open menu"
                  />
                }
              >
                <Menu className="h-6 w-6 text-slate-800" />
              </SheetTrigger>

              <SheetContent
                side="right"
                className="flex w-[85%] max-w-[340px] flex-col justify-between overflow-hidden border-l-0 bg-white py-6 pr-6 pl-7 shadow-2xl"
              >
                {/* Slim 4-color SPOON gradient border along the left edge */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[4px] overflow-hidden"
                >
                  <div className="-my-4 -ml-2.5 flex h-[calc(100%+32px)] w-6 flex-col blur-[10px]">
                    <div className="flex-1 bg-primary" />
                    <div className="flex-1 bg-secondary" />
                    <div className="flex-1 bg-accent" />
                    <div className="flex-1 bg-tertiary" />
                  </div>
                </div>

                {/* Subtle ambient glow bleeding softly from the gradient edge */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 z-0 w-10 overflow-hidden opacity-[0.08]"
                >
                  <div className="-my-6 -ml-6 flex h-[calc(100%+48px)] w-12 flex-col blur-xl">
                    <div className="flex-1 bg-primary" />
                    <div className="flex-1 bg-secondary" />
                    <div className="flex-1 bg-accent" />
                    <div className="flex-1 bg-tertiary" />
                  </div>
                </div>

                <div className="relative z-10">
                  {/* Drawer Header */}
                  <div className="border-b border-slate-100 pb-4 pr-8">
                    <Link href="/" onClick={() => setIsOpen(false)}>
                      <SpoonLogo className="text-2xl" />
                    </Link>
                  </div>

                  {/* Staggered Nav Items */}
                  <div className="mt-6 flex flex-col gap-1.5">
                    {NAV_LINKS.map((link, index) => {
                      const Icon = link.icon;
                      return (
                        <motion.div
                          key={link.href}
                          initial={{ opacity: 0, x: 20 }}
                          animate={
                            isOpen
                              ? { opacity: 1, x: 0 }
                              : { opacity: 0, x: 20 }
                          }
                          transition={{
                            duration: 0.45,
                            delay: isOpen ? 0.08 + index * 0.06 : 0,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <Link
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center justify-between rounded-2xl p-2.5 transition-colors hover:bg-slate-50 active:bg-slate-100"
                          >
                            <div className="flex items-center gap-3.5">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${link.iconBg}`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-[16px] font-semibold text-[#0B192C] transition-colors group-hover:text-blue-600">
                                {link.label}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Auth Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={
                    isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
                  }
                  transition={{
                    duration: 0.45,
                    delay: isOpen ? 0.32 : 0,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative z-10 mt-auto flex flex-col gap-3 border-t border-slate-100 pt-5"
                >
                  <Button
                    className="h-12 w-full rounded-full bg-blue-500 text-base font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600"
                    nativeButton={false}
                    render={<Link href="/sign-up" />}
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up Free
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-full border-slate-200 text-base font-semibold text-slate-700 hover:bg-slate-50"
                    nativeButton={false}
                    render={<Link href="/sign-in" />}
                    onClick={() => setIsOpen(false)}
                  >
                    Sign In
                  </Button>
                </motion.div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}