// @/components/dashboard/Sidebar.tsx
"use client";

import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { navItems, settingItems } from "./NavLinks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  pathname: string;
  isAdmin?: boolean;
  onOpenNotifications?: () => void;
}

// Subtle 3D icon tile themes for inactive nav items so the sidebar feels alive & gamified
const ICON_TILE_THEMES = [
  "border-sky-200 bg-sky-50 text-blue-600 group-hover/navitem:border-blue-700 group-hover/navitem:bg-gradient-to-b group-hover/navitem:from-sky-400 group-hover/navitem:to-blue-600 group-hover/navitem:text-white",
  "border-teal-200 bg-teal-50 text-teal-600 group-hover/navitem:border-teal-700 group-hover/navitem:bg-gradient-to-b group-hover/navitem:from-teal-400 group-hover/navitem:to-emerald-600 group-hover/navitem:text-white",
  "border-amber-200 bg-amber-50 text-amber-600 group-hover/navitem:border-orange-700 group-hover/navitem:bg-gradient-to-b group-hover/navitem:from-amber-300 group-hover/navitem:to-orange-500 group-hover/navitem:text-slate-950",
  "border-indigo-200 bg-indigo-50 text-indigo-600 group-hover/navitem:border-indigo-800 group-hover/navitem:bg-gradient-to-b group-hover/navitem:from-indigo-400 group-hover/navitem:to-indigo-600 group-hover/navitem:text-white",
  "border-emerald-200 bg-emerald-50 text-emerald-600 group-hover/navitem:border-emerald-700 group-hover/navitem:bg-gradient-to-b group-hover/navitem:from-emerald-400 group-hover/navitem:to-emerald-600 group-hover/navitem:text-white",
  "border-purple-200 bg-purple-50 text-purple-600 group-hover/navitem:border-purple-800 group-hover/navitem:bg-gradient-to-b group-hover/navitem:from-violet-500 group-hover/navitem:to-purple-700 group-hover/navitem:text-white",
];

export const Sidebar = ({
  pathname,
  isAdmin = false,
  onOpenNotifications,
}: SidebarProps) => {
  const { state, isMobile } = useSidebar();
  const sidebarOpen = state === "expanded" || isMobile;
  const router = useRouter();
  const { unreadCount } = useNotifications();

  const [isInlineMenuOpen, setIsInlineMenuOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const user = session?.user;

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="border-r border-slate-200/80 bg-slate-50/70"
    >
      {/* =====================================================================
          1. TOP: 3D TACTILE USER PROFILE CARD & PUSH-DOWN ACCORDION
          ===================================================================== */}
      <SidebarHeader className="overflow-visible p-3">
        <SidebarMenu>
          <SidebarMenuItem className="relative">
            {sidebarOpen ? (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setIsInlineMenuOpen((prev) => !prev)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 p-2.5 text-left transition-all duration-150 outline-none select-none active:translate-y-0.5 active:border-b-2",
                    isInlineMenuOpen
                      ? "border-sky-400 border-b-blue-600 bg-white shadow-md"
                      : "border-slate-200/90 border-b-slate-300 bg-white shadow-2xs hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-sm"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 rounded-xl border-b-2 border-blue-800 shadow-2xs">
                      <AvatarImage
                        src={user?.image || undefined}
                        alt={user?.name || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 text-xs font-black text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>

                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-xs font-black text-slate-900">
                      {user?.name || "Loading..."}
                    </span>
                    <span className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                      {user?.email || ""}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-transform duration-300",
                      isInlineMenuOpen &&
                        "rotate-180 bg-sky-100 text-blue-600"
                    )}
                  >
                    <ChevronDown className="size-3.5" />
                  </div>
                </button>

                {/* Push-down drawer */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    isInlineMenuOpen
                      ? "pointer-events-auto mt-2 grid-rows-[1fr] opacity-100"
                      : "pointer-events-none mt-0 grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-1 rounded-2xl border-2 border-slate-200/80 bg-white p-2 shadow-sm">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenNotifications?.();
                          setIsInlineMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 transition-colors hover:bg-sky-50 hover:text-blue-700"
                      >
                        <span className="flex items-center gap-2.5">
                          <Bell className="size-4 text-sky-500" />
                          <span>Notifications</span>
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
                            {unreadCount}
                          </span>
                        )}
                      </button>

                      <Link
                        href="/account"
                        onClick={() => setIsInlineMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 transition-colors hover:bg-sky-50 hover:text-blue-700"
                      >
                        <Settings className="size-4 text-indigo-500" />
                        <span>Settings &amp; Account</span>
                      </Link>

                      <div className="my-0.5 h-px bg-slate-100" />

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-extrabold text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <LogOut className="size-4 text-rose-500" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* COLLAPSED ICON-ONLY MODE */
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="justify-center p-0! hover:bg-transparent"
                    >
                      <Avatar className="h-9 w-9 shrink-0 rounded-xl border-b-2 border-blue-800 shadow-xs">
                        <AvatarImage
                          src={user?.image || undefined}
                          alt={user?.name || "User"}
                        />
                        <AvatarFallback className="rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 text-xs font-black text-white">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </SidebarMenuButton>
                  }
                />

                <DropdownMenuContent
                  className="w-56 rounded-2xl border-2 border-slate-200/80 p-1.5 shadow-xl"
                  side="right"
                  align="start"
                  sideOffset={12}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2.5 px-2.5 py-2 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-xl">
                          <AvatarImage
                            src={user?.image || undefined}
                            alt={user?.name || "User"}
                          />
                          <AvatarFallback className="rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 text-xs font-black text-white">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left leading-tight">
                          <span className="truncate text-xs font-black text-slate-900">
                            {user?.name || "User"}
                          </span>
                          <span className="truncate text-[11px] font-semibold text-slate-400">
                            {user?.email || ""}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => onOpenNotifications?.()}
                      className="cursor-pointer gap-2 rounded-xl font-bold text-slate-700"
                    >
                      <Bell className="size-4 text-sky-500" />
                      <span>Notifications</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer gap-2 rounded-xl font-bold text-slate-700"
                      render={
                        <Link href={settingItems[0]?.href || "/account"}>
                          <Settings className="size-4 text-indigo-500" />
                          <span>Settings &amp; Account</span>
                        </Link>
                      }
                    />
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    variant="destructive"
                    className="cursor-pointer gap-2 rounded-xl font-bold"
                  >
                    <LogOut className="size-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* =====================================================================
          2. NAVIGATION MENU: 3D TACTILE PILLS & COLOR-CODED ICON TILES
          ===================================================================== */}
      <SidebarContent className="overflow-x-hidden px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-3 text-[11px] font-black tracking-widest text-slate-400 uppercase">
            <Sparkles className="mr-1.5 inline h-3 w-3 text-emerald-500" />
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((navItem, idx) => {
                const isActive = pathname.includes(navItem.href);
                const iconTileTheme =
                  ICON_TILE_THEMES[idx % ICON_TILE_THEMES.length];

                return (
                  <SidebarMenuItem key={navItem.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={navItem.label}
                      className={cn(
                        "group/navitem flex h-auto items-center gap-3.5 rounded-2xl p-2 transition-all duration-150 select-none group-data-[collapsible=icon]:justify-center",
                        isActive
                          ? "border-b-4 border-teal-800/80 bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-md shadow-sky-500/20 active:translate-y-0.5 active:border-b-0"
                          : "border-2 border-transparent text-slate-600 hover:-translate-y-0.5 hover:border-slate-200 hover:border-b-4 hover:border-b-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-2xs active:translate-y-0.5 active:border-b-2"
                      )}
                      render={
                        <Link href={navItem.href}>
                          {/* 3D Mini Squircle Icon Tile */}
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-b-[3px] transition-all duration-150 [&_svg]:size-4",
                              isActive
                                ? "border-white/30 bg-white/20 text-white shadow-inner"
                                : iconTileTheme
                            )}
                          >
                            {navItem.icon}
                          </div>

                          {sidebarOpen && (
                            <span
                              className={cn(
                                "truncate text-sm transition-transform duration-200 ease-out group-hover/navitem:translate-x-0.5",
                                isActive
                                  ? "font-black text-white drop-shadow-2xs"
                                  : "font-extrabold text-slate-700 group-hover/navitem:text-slate-900"
                              )}
                            >
                              {navItem.label}
                            </span>
                          )}
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* =====================================================================
          3. BOTTOM: 3D ADMIN BUTTON + SPOON LOGO
          ===================================================================== */}
      <SidebarFooter className="flex flex-col gap-4 overflow-hidden p-3">
        {isAdmin && sidebarOpen && (
          <Button
            variant="ghost"
            className="flex h-auto w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-purple-950 bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-600 py-3 text-xs font-black tracking-wide text-white uppercase shadow-md shadow-purple-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 hover:text-white active:translate-y-0.5 active:border-b-0"
            render={
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Center</span>
              </Link>
            }
          />
        )}

        <div className="relative flex h-11 w-full items-center justify-center overflow-hidden rounded-2xl bg-white/70 py-1 ring-1 ring-slate-200/60">
          <Image
            src="/logo1-up.png"
            width={1000}
            height={1000}
            alt="SPOON Logo"
            priority
            quality={100}
            className={cn(
              "absolute h-auto w-[150px] max-w-none object-contain transition-[opacity,transform]",
              sidebarOpen
                ? "scale-100 opacity-100 delay-200 duration-200 ease-out"
                : "pointer-events-none scale-90 opacity-0 delay-0 duration-75 ease-in"
            )}
          />

          <Image
            src="/logo1-min.png"
            width={1000}
            height={1000}
            alt="SPOON Mini Logo"
            priority
            quality={100}
            className={cn(
              "absolute h-auto w-8 object-contain transition-[opacity,transform]",
              !sidebarOpen
                ? "scale-100 opacity-100 delay-200 duration-200 ease-out"
                : "pointer-events-none scale-75 opacity-0 delay-0 duration-75 ease-in"
            )}
          />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
};