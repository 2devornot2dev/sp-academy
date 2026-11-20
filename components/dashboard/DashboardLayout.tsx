// @/components/dashboard/DashboardLayout.tsx
"use client";

import React, { useState, useEffect } from "react";
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
        {/* Top bar only shows on small phones (<768px) when sidebar is in Sheet mode */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-black tracking-tight text-slate-800">
            Spoon Academy
          </span>
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