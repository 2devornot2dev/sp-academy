// @/components/dashboard/DashboardLayout.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { Sidebar } from "./Sidebar";
import { NotificationsPanel } from "./NotificationsPanel";
import { Notification } from "@prisma/client";

export interface UserData {
  id: string;
  role: string;
  displayUserName?: string | null;
  image: string | null | undefined;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
  userData: UserData;
  notifications: Notification[];
}

function TabletSidebarAutoCollapse() {
  const { setOpen, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = (e: MediaQueryList | MediaQueryListEvent) => {
      setOpen(e.matches);
    };
    sync(mql);
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [isMobile, setOpen]);

  return null;
}

export default function DashboardLayout({
  children,
  isAdmin,
  userData,
  notifications,
}: DashboardLayoutProps) {
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [hideMobileHeader, setHideMobileHeader] = useState(false);
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const directionAnchorTop = useRef(0);
  const lastDirection = useRef<"up" | "down" | null>(null);

  // Reset scroll & show header when navigating to a new page
  useEffect(() => {
    setHideMobileHeader(false);
    lastScrollTop.current = 0;
    directionAnchorTop.current = 0;
    lastDirection.current = null;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [pathname]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const st = Math.max(0, el.scrollTop);
    const maxScroll = el.scrollHeight - el.clientHeight;

    // Never hide if the page barely scrolls (< 64px overflow)
    if (maxScroll < 64) {
      if (hideMobileHeader) setHideMobileHeader(false);
      lastScrollTop.current = st;
      directionAnchorTop.current = st;
      return;
    }

    // Always show near the very top
    if (st <= 20) {
      if (hideMobileHeader) setHideMobileHeader(false);
      lastScrollTop.current = st;
      directionAnchorTop.current = st;
      lastDirection.current = "up";
      return;
    }

    // Ignore rubber-band bounce at the very bottom
    if (st >= maxScroll - 8) {
      lastScrollTop.current = st;
      return;
    }

    const stepDelta = st - lastScrollTop.current;
    if (Math.abs(stepDelta) < 2) return; // ignore sub-2px touch noise

    const dir: "up" | "down" = stepDelta > 0 ? "down" : "up";
    if (dir !== lastDirection.current) {
      lastDirection.current = dir;
      directionAnchorTop.current = lastScrollTop.current;
    }

    const distanceInDir = st - directionAnchorTop.current;

    // Require 28px of continuous downward scroll past 56px to hide
    if (dir === "down" && distanceInDir > 28 && st > 56 && !hideMobileHeader) {
      setHideMobileHeader(true);
    }
    // Require 22px of continuous upward scroll to reveal
    else if (dir === "up" && distanceInDir < -22 && hideMobileHeader) {
      setHideMobileHeader(false);
    }

    lastScrollTop.current = st;
  };

  return (
    <SidebarProvider>
      <TabletSidebarAutoCollapse />

      <Sidebar
        pathname={pathname}
        isAdmin={isAdmin}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      <div className="relative flex h-dvh w-full min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Fixed GPU-translated mobile header (zero layout shift on scrollRef) */}
        <header
          className={`fixed top-0 inset-x-0 z-40 flex h-12 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 backdrop-blur-md transition-transform duration-200 ease-out will-change-transform md:hidden ${
            hideMobileHeader
              ? "-translate-y-full pointer-events-none"
              : "translate-y-0"
          }`}
        >
          <SidebarTrigger className="h-8 w-8 rounded-xl border border-b-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100" />

          <Image
            src="/logo1-up.png"
            alt="Spoon Academy"
            width={120}
            height={36}
            priority
            className="pointer-events-none absolute left-1/2 h-6 w-auto -translate-x-1/2 object-contain"
          />

          <div className="w-8" aria-hidden="true" />
        </header>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain pt-12 md:pt-0"
        >
          <main className="min-h-full w-full">{children}</main>
        </div>
      </div>

      <NotificationsPanel
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        notifications={notifications}
      />
    </SidebarProvider>
  );
}