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

export const Sidebar = ({
  pathname,
  isAdmin = false,
  onOpenNotifications,
}: SidebarProps) => {
  const { state, isMobile } = useSidebar();
  const sidebarOpen = state === "expanded" || isMobile;
  const router = useRouter();
  const { unreadCount } = useNotifications();

  // State for the inline push-down accordion
  const [isInlineMenuOpen, setIsInlineMenuOpen] = useState(false);

  // Better Auth Session
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
    <ShadcnSidebar collapsible="icon">
      {/* TOP: User Profile & Push-Down Menu */}
      <SidebarHeader className="overflow-visible p-2">
        <SidebarMenu>
          <SidebarMenuItem className="relative">
            {sidebarOpen ? (
              /* ========================================================= */
              /* EXPANDED MODE: INLINE PUSH-DOWN ACCORDION                 */
              /* ========================================================= */
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setIsInlineMenuOpen((prev) => !prev)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all duration-200 outline-none select-none",
                    isInlineMenuOpen
                      ? "bg-slate-100 dark:bg-slate-800/80 shadow-xs"
                      : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/5 dark:ring-white/10">
                    <AvatarImage
                      src={user?.image || undefined}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 font-bold text-white text-xs">
                      {userInitials}
                    </AvatarFallback>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex h-2 w-2 items-center justify-center rounded-full bg-primary text-white text-xs">
                        {unreadCount}
                      </span>
                    )}
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                      {user?.name || "Loading..."}
                    </span>
                    <span className="truncate text-xs text-slate-400">
                      {user?.email || ""}
                    </span>
                  </div>

                  <ChevronDown
                    className={cn(
                      "size-4 text-slate-400 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      isInlineMenuOpen && "rotate-180 text-slate-700 dark:text-slate-200"
                    )}
                  />
                </button>

                {/* CSS Grid zero-scrollbar height transition */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    isInlineMenuOpen
                      ? "grid-rows-[1fr] opacity-100 mt-2 pointer-events-auto"
                      : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-0.5 bg-slate-50/60 p-1.5 shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/40">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenNotifications?.();
                          setIsInlineMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Bell className="size-4 text-slate-400" />
                        <span>Notifications</span>
                      </button>

                      <Link
                        href="/account"
                        onClick={() => setIsInlineMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Settings className="size-4 text-slate-400" />
                        <span>Settings & Account</span>
                      </Link>

                      <div className="my-1 h-px bg-slate-200/80 dark:bg-slate-800" />

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/20"
                      >
                        <LogOut className="size-4 text-rose-500" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================= */
              /* COLLAPSED MODE (Icon Only): FLOATING DROPDOWN             */
              /* ========================================================= */
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="justify-center p-0! hover:bg-transparent"
                    >
                      <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                        <AvatarImage
                          src={user?.image || undefined}
                          alt={user?.name || "User"}
                        />
                        <AvatarFallback className="rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 font-bold text-white text-xs">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </SidebarMenuButton>
                  }
                />

                <DropdownMenuContent
                  className="w-56 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800"
                  side="right"
                  align="start"
                  sideOffset={12}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage
                            src={user?.image || undefined}
                            alt={user?.name || "User"}
                          />
                          <AvatarFallback className="rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 font-bold text-white text-xs">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {user?.name || "User"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
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
                      className="cursor-pointer gap-2"
                    >
                      <Bell className="size-4 text-slate-500" />
                      <span>Notifications</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      render={
                        <Link href={settingItems[0]?.href || "/account"}>
                          <Settings className="size-4 text-slate-500" />
                          <span>Settings & Account</span>
                        </Link>
                      }
                    />
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    variant="destructive"
                    className="cursor-pointer gap-2"
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

      <SidebarContent className="overflow-x-hidden">
        {/* Menu Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="py-4 text-lg font-bold tracking-widest text-emerald-500">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((navItem) => {
                const isActive = pathname.includes(navItem.href);
                return (
                  <SidebarMenuItem key={navItem.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={navItem.label}
                      className={cn(
                        "group group/navitem flex h-auto items-center gap-4 rounded-sm p-3 transition-all group-data-[collapsible=icon]:justify-center",
                        isActive
                          ? "bg-linear-to-r from-primary via-secondary to-accent text-white"
                          : "text-blue-500"
                      )}
                      render={
                        <Link href={navItem.href}>
                          <div
                            className={cn(
                              "shrink-0",
                              isActive ? "text-white" : "text-blue-400"
                            )}
                          >
                            {navItem.icon}
                          </div>
                          {sidebarOpen && (
                            <span
                              className={cn(
                                "truncate text-sm font-medium transition-transform duration-300 ease-out group-hover/navitem:translate-x-1",
                                isActive
                                  ? "text-white font-bold"
                                  : "text-blue-500"
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

      {/* BOTTOM: Admin Button (if admin) + Dynamic Logo */}
      <SidebarFooter className="flex flex-col gap-4 overflow-hidden p-3">
        {isAdmin && sidebarOpen && (
          <div className="animate-gradient overflow-hidden rounded-lg bg-linear-to-r from-sky-400 via-emerald-400 to-violet-400 bg-[length:300%_300%] p-1 shadow-lg">
            <Button
              variant="ghost"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-transparent py-3 font-semibold text-white shadow-md transition-all hover:bg-black/10"
              render={
                <Link href="/admin">
                  <ShieldCheck className="h-5 w-5" />
                  <span>Admin Center</span>
                </Link>
              }
            />
          </div>
        )}

        <div className="relative flex h-10 w-full items-center justify-center overflow-hidden">
          <Image
            src="/logo1-up.png"
            width={1000}
            height={1000}
            alt="SPOON Logo"
            priority
            quality={100}
            className={cn(
              "absolute h-auto w-[160px] max-w-none object-contain transition-[opacity,transform]",
              sidebarOpen
                ? "opacity-100 scale-100 duration-200 delay-200 ease-out"
                : "pointer-events-none opacity-0 scale-90 duration-75 delay-0 ease-in"
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
                ? "opacity-100 scale-100 duration-200 delay-200 ease-out"
                : "pointer-events-none opacity-0 scale-75 duration-75 delay-0 ease-in"
            )}
          />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
};