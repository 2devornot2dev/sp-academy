// @/components/dashboard/DashboardLayout.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      // Landscape (>=1024px) -> expanded; Portrait tablet (<1024px) -> collapsed 3D icon rail
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
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <TabletSidebarAutoCollapse />

      <Sidebar
        pathname={pathname}
        isAdmin={isAdmin}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      <div className="flex h-dvh w-full min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Branded mobile-only header (hidden on iPad/Desktop where the 3D rail shows) */}
        <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 backdrop-blur-md md:hidden">
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

        <ScrollArea className="h-full w-full flex-1 [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:h-full">
          <main className="h-full w-full">{children}</main>
        </ScrollArea>
      </div>

      <NotificationsPanel
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        notifications={notifications}
      />
    </SidebarProvider>
  );
}