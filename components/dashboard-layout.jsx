"use client";

// import { UserButton } from "@clerk/nextjs";
import React, { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MenuDots, DoubleAltArrowLeft } from "solar-icon-set";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Home,
  Speech,
  BookMarked,
  GraduationCap,
  Settings,
  ScrollText,
} from "lucide-react";
import { Bell } from "lucide-react";
import NotificationCard from "./notifications/notification-card";
import { Button } from "./ui/button";

const navItems = [
  {
    label: "Home",
    href: "/home",
    icon: <Home strokeWidth={1.5} />,
  },

  // {
  //   label: "Lessons",
  //   href: "/lessons",
  //   icon: (
  //     <Sun2
  //       size={24}
  //       iconStyle="BoldDuotone"
  //       svgProps={{ width: "24px", height: "24px" }}
  //     />
  //   ),
  // },
  //  {
  //   label: "Schedule",
  //   href: "/schedule",
  //   icon: (
  //    <CalendarDate
  //     size={24}
  //     iconStyle="BoldDuotone"
  //     svgProps={{ width: "24px", height: "24px" }}
  //    />
  //   ),
  //  },
  {
    label: "Conversation",
    href: "/conversation",
    icon: <Speech strokeWidth={1.5} />,
  },
  //  {
  //   label: "Chat",
  //   href: "/chat",
  //   icon: <ChatDots size={24} iconStyle="BoldDuotone" />,
  //  },
  //  {
  //   label: "Achievements",
  //   href: "/achievements",
  //   icon: (
  //    <MedalRibbonStar
  //     size={24}
  //     iconStyle="BoldDuotone"
  //     svgProps={{ width: "24px", height: "24px" }}
  //    />
  //   ),
  //  },
  // {
  //   label: "Short Story",
  //   href: "/short-story",
  //   icon: <BookOpenText strokeWidth={1.5} />,
  // },
  // {
  //   label: "Courses",
  //   href: "/courses",
  //   icon: <ScrollText strokeWidth={1.5} />,
  // },
  {
    label: "Books",
    href: "/books",
    icon: <BookMarked strokeWidth={1.5} />,
  },
  {
    label: "Learning Hub",
    href: "/learning-hub",
    icon: <GraduationCap strokeWidth={1.5} />,
  },
];

const settingItems = [
  {
    label: "Account",
    href: "/account",
    icon: <Settings strokeWidth={1.5} />,
  },
  // {
  //   label: "Profile",
  //   href: "/profile",
  //   icon: (
  //     <UserCheck
  //       size={24}
  //       iconStyle="BoldDuotone"
  //       svgProps={{ width: "24px", height: "24px" }}
  //     />
  //   ),
  // },
];

const barNavItems = [...navItems];

const SidebarContent = ({
  sidebarOpen,
  setSidebarOpen,
  pathname,
  notifications,
}) => (
  <div className="relative z-10 flex h-full flex-col">
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex w-full items-center justify-center gap-2 text-white">
        <Image
          src="/logo1.png"
          height={100}
          width={100}
          alt="logo"
          priority
          style={{ width: "auto", height: "auto" }}
          className="flex"
        />
      </div>

      <div
        className="hidden cursor-pointer text-blue-500 hover:animate-pulse lg:block"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <DoubleAltArrowLeft
          size={20}
          className="m-1"
          svgProps={{ width: "24px", height: "24px" }}
        />
      </div>
    </div>
    <div className="grow space-y-2 overflow-y-auto">
      {/* Sidebar Title */}
      <div className="flex px-4 py-2">
        <h1 className={`text-lg font-bold tracking-widest text-emerald-500`}>
          Menu
        </h1>
      </div>
      {/* Sidebar Nav */}
      {navItems.map((navItem, index) => (
        <div className="px-2" key={index}>
          <Link
            href={navItem.href}
            className={`group flex items-center gap-4 rounded-sm p-2 ${
              pathname.includes(navItem.href)
                ? "bg-linear-to-r from-blue-400 via-purple-400 to-indigo-400 text-white"
                : "text-blue-400"
            } hover:bg-linear-to-r hover:from-green-300 hover:via-amber-300 hover:to-purple-300 hover:text-white`}
          >
            {navItem.icon}
            <div
              className={`text-xs ${
                pathname.includes(navItem.href)
                  ? "text-white"
                  : "text-blue-500 group-hover:text-white"
              }`}
            >
              {navItem.label}
            </div>
          </Link>
        </div>
      ))}

      {/* Sidebar Title */}
      <div className="my-4 flex px-4 py-2">
        <h1 className={`text-lg font-bold tracking-widest text-emerald-500`}>
          Settings
        </h1>
      </div>
      {settingItems.map((settingItem, index) => (
        <div className="px-2" key={index}>
          <Link
            href={settingItem.href}
            className={`group flex items-center gap-4 rounded-sm p-2 ${
              settingItem.href === pathname
                ? "bg-linear-to-r from-blue-400 via-purple-400 to-indigo-400 text-white"
                : "text-blue-400"
            } hover:bg-linear-to-r hover:from-green-300 hover:via-amber-300 hover:to-purple-300 hover:text-white`}
          >
            {settingItem.icon}
            <span
              className={`text-xs ${
                pathname.includes(settingItem.href)
                  ? "text-white"
                  : "text-blue-500 group-hover:text-white"
              }`}
            >
              {settingItem.label}
            </span>
          </Link>
        </div>
      ))}
    </div>
  </div>
);

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isLoaded } = useUser();
  const pathname = usePathname();

  const handleMenuClick = () => {
    setSheetOpen(false); // Close the sheet
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications); // Toggle notifications
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar for large screens */}
      <div
        className={`${
          sidebarOpen ? "w-48" : "w-0"
        } hidden h-full shrink-0 overflow-hidden bg-white transition-[width] duration-300 lg:block`}
      >
        <div
          className={`h-full w-48 overflow-y-auto ${
            sidebarOpen ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300`}
        >
          <SidebarContent
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            pathname={pathname}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex h-full w-full grow flex-col transition-all duration-300 lg:w-[calc(100%-15rem)]">
        {/* Topbar */}
        <div className="flex h-[55px] w-full items-center justify-between px-4">
          <div className="flex items-center">
            {/* Logo and menu for small screens */}
            <div className="-ml-3 flex items-center gap-2 text-white lg:hidden">
              <Link href="/learning-hub">
                <Image
                  src="/logo1.png"
                  height={100}
                  width={100}
                  alt="logo"
                  priority
                  style={{ width: "auto", height: "auto" }}
                  className="ml-2"
                />
              </Link>
              {/* Sheet for sidebar on small screens */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger
                  render={
                    <button className="mt-2 ml-2 text-slate-800">
                      <MenuDots
                        className="animate-pulse"
                        iconStyle="BoldDuotone"
                        svgProps={{ width: "28px", height: "28px" }}
                      />
                    </button>
                  }
                />

                <SheetContent
                  side="left"
                  className="w-[200px] border-none bg-white p-0"
                  onClick={handleMenuClick}
                  aria-describedby={undefined}
                >
                  <SheetHeader>
                    <SheetTitle>
                      <p className="" alt="menu">
                        <span className="hidden">Menu</span>
                      </p>
                    </SheetTitle>
                  </SheetHeader>
                  <SidebarContent pathname={pathname} />
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo and menu for large screens */}
            {!sidebarOpen && (
              <div className="hidden items-center gap-2 text-white lg:flex">
                <Image
                  src="/logo1.png"
                  height={100}
                  width={100}
                  alt="logo"
                  priority
                  style={{ width: "auto", height: "auto" }}
                  className="-ml-2"
                />
                {/* Menu to open sidebar */}
                <button
                  className="mt-1 ml-2 text-slate-800"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <MenuDots
                    className="animate-pulse"
                    svgProps={{ width: "24px", height: "24px" }}
                  />
                </button>
              </div>
            )}

            {/* Top Menu Bar */}
            <div className="ml-4 hidden cursor-pointer gap-4 text-slate-500 md:flex">
              {barNavItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={`rounded-md px-2 py-1 text-sm ${
                    // Check if the current pathname includes the item.href
                    pathname.includes(item.href)
                      ? // Apply gradient background and white text for the active state
                        "bg-linear-to-r from-blue-400 via-purple-400 to-indigo-400 font-semibold text-white"
                      : // Default text color for non-active links
                        "text-blue-500"
                  } // Gradient background and white text on hover hover:bg-linear-to-r hover:from-green-300 hover:via-amber-300 hover:to-purple-300 hover:text-white`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleNotificationClick}
            >
              <Bell className="size-5" strokeWidth={1.5} />
            </Button>

            <UserButton />
          </div>
        </div>
        <div
          className={`z-50 transition-transform ${
            showNotifications ? "translate-x-0" : "translate-x-full"
          }`}
        ></div>
        {/* Main content */}
        <ScrollArea className="h-full w-full">
          {" "}
          {/* Ensure full height for ScrollArea */}
          <div className="h-full grow overflow-auto bg-white">{children}</div>
        </ScrollArea>
      </div>

      {/* Notifications Overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-opacity-50 fixed inset-0 z-50 bg-black"
              onClick={() => setShowNotifications(false)} // Close notifications when clicking outside
            />

            {/* Notifications Panel */}
            <motion.div
              key="notifications-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 right-0 z-50 h-full w-fit overflow-y-auto rounded-l-lg bg-white shadow-lg"
            >
              <NotificationCard
                handleNotificationClick={handleNotificationClick}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
