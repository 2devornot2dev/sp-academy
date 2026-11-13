// components/account/account-tabs.tsx
"use client";

import React, { useState } from "react";
import { User as UserIcon, Share2, Bell, CreditCard } from "lucide-react";

type TabId = "general" | "sharing" | "notifications" | "billing";

interface AccountTabsProps {
  generalContent: React.ReactNode;
  sharingContent: React.ReactNode;
  notificationsContent: React.ReactNode;
  billingContent: React.ReactNode;
}

const TABS = [
  { id: "general", label: "General", Icon: UserIcon },
  { id: "sharing", label: "Sharing", Icon: Share2 },
  { id: "notifications", label: "Alerts", Icon: Bell },
  { id: "billing", label: "Billing", Icon: CreditCard },
] as const;

export function AccountTabs({
  generalContent,
  sharingContent,
  notificationsContent,
  billingContent,
}: AccountTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <div className="w-full space-y-6">
      {/* 3D Tactile Tab Switcher Bar */}
      <div className="grid w-full grid-cols-2 gap-2 rounded-3xl border-2 border-b-[5px] border-slate-200 border-b-slate-300 bg-white p-2 shadow-sm sm:grid-cols-4">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black tracking-wide uppercase transition-all ${
                isActive
                  ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div className="w-full">
        {activeTab === "general" && generalContent}
        {activeTab === "sharing" && sharingContent}
        {activeTab === "notifications" && notificationsContent}
        {activeTab === "billing" && billingContent}
      </div>
    </div>
  );
}