// @/components/dashboard/DashboardLayout.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

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

  // Reset scroll & show header when navigating to a new page
  useEffect(() => {
    setHideMobileHeader(false);
    lastScrollTop.current = 0;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [pathname]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const st = el.scrollTop;
    const delta = st - lastScrollTop.current;

    if (st <= 16) {
      setHideMobileHeader(false);
    } else if (delta > 8 && st > 48) {
      setHideMobileHeader(true);
    } else if (delta < -6) {
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

      <div className="flex h-dvh w-full min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Auto-hiding branded mobile header (hidden on iPad/Desktop) */}
        <header
          className={`relative z-40 flex h-12 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 backdrop-blur-md transition-[margin,opacity] duration-200 ease-out md:hidden ${
            hideMobileHeader
              ? "-mt-12 pointer-events-none opacity-0"
              : "mt-0 opacity-100"
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
          className="min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain"
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