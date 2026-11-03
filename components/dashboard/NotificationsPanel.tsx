// @/components/dashboard/NotificationsPanel.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import NotificationCard from "../notifications/notification-card";
import { Notification } from "@prisma/client";

interface NotificationsPanelProps {
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  notifications: Notification[];
}

export const NotificationsPanel = ({
  showNotifications,
  setShowNotifications,
  notifications,
}: NotificationsPanelProps) => {
  return (
    <AnimatePresence>
      {showNotifications && (
        <>
          {/* 1. Subtle, Airy Frosted Backdrop (replaces ultra-black) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-slate-900/15 backdrop-blur-[2px] transition-colors"
            onClick={() => setShowNotifications(false)}
          />

          {/* 2. Styled Glass Panel with Ambient Glow & Vectors */}
          <motion.div
            key="notifications-panel"
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 h-screen w-full sm:w-[380px] overflow-hidden border-l border-white/70 bg-gradient-to-b from-slate-50/95 via-white/90 to-blue-50/30 shadow-[-16px_0_40px_rgba(15,23,42,0.07)] backdrop-blur-2xl dark:border-slate-800/80 dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-950"
          >
            {/* Soft Ambient Glow Orbs */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/15 via-indigo-400/10 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -left-20 top-1/2 h-60 w-60 rounded-full bg-gradient-to-tr from-emerald-300/15 via-teal-300/10 to-transparent blur-3xl" />

            {/* Subtle Vector Geometry Rings (Decorative Watermark) */}
            <svg
              className="pointer-events-none absolute -right-6 -top-6 h-56 w-56 opacity-[0.06] stroke-slate-900 dark:stroke-white"
              viewBox="0 0 100 100"
              fill="none"
            >
              <circle cx="100" cy="0" r="30" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="100" cy="0" r="60" strokeWidth="1" />
              <circle cx="100" cy="0" r="90" strokeWidth="1" strokeDasharray="4 4" />
            </svg>

            {/* Content Container */}
            <div className="relative z-10 flex h-full w-full flex-col">
              <NotificationCard
                handleNotificationClick={() => setShowNotifications(false)}
                notifications={notifications}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};