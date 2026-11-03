// @/components/dashboard/DashboardLayout.tsx
"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { Sidebar } from "./Sidebar"; 
import { NotificationsPanel } from "./NotificationsPanel";
import { Notification } from "@prisma/client";

export interface UserData {
  id: string;
  role: string;
  displayUserName?: string | null;
  image: string | null | undefined; // Explicitly accept both null and undefined
}
interface DashboardLayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
  userData: UserData;
  notifications: Notification[]; // Adjust the type based on your actual notification structure
}

export default function DashboardLayout({ children, isAdmin, userData, notifications }: DashboardLayoutProps) {
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar 
        pathname={pathname} 
        isAdmin={isAdmin} 
        onOpenNotifications={() => setShowNotifications(true)} 
      />

      <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-semibold text-slate-700">Dashboard</span>
        </header>

        <ScrollArea className="flex-1 w-full h-full">
          <main className="h-full w-full">
            {children}
          </main>
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