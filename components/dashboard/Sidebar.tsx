// @/components/dashboard/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Bell,
  Settings,
  LogOut,
  ChevronsUpDown,
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
      {/* TOP: User Badge & Dropdown (Base UI render pattern) */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                  >
                    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                      <AvatarImage
                        src={user?.image || undefined}
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback className="rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 font-bold text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>

                    {sidebarOpen && (
                      <>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold text-slate-800">
                            {user?.name || "Loading..."}
                          </span>
                          <span className="truncate text-xs text-slate-500">
                            {user?.email || ""}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4 text-slate-400" />
                      </>
                    )}
                  </SidebarMenuButton>
                }
              />

              <DropdownMenuContent
                className="w-(--anchor-width) min-w-56 rounded-xl"
                side={isMobile ? "bottom" : "right"}
                align="start"
                sideOffset={8}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          src={user?.image || undefined}
                          alt={user?.name || "User"}
                        />
                        <AvatarFallback className="rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 font-bold text-white">
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

                  {/* Base UI render prop for Link navigation */}
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
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={navItem.label}
                    className={cn(
                      "group group/navitem flex h-auto items-center gap-4 rounded-sm p-3 transition-all group-data-[collapsible=icon]:justify-center",
                      isActive
                        ? "bg-linear-to-r from-primary via-secondary to-accent  text-white  "
                        : "text-blue-500",
                    )}
                    render={
                      <Link href={navItem.href}>
                        <div
                          className={cn(
                            "shrink-0",
                            isActive ? "text-white" : "text-blue-400",
                          )}
                        >
                          {navItem.icon}
                        </div>
                        {sidebarOpen && (
                          <span
                            className={cn(
                              "truncate text-sm font-medium transition-transform duration-300 ease-out group-hover/navitem:translate-x-1",
                              isActive ? "text-white font-bold " : "text-blue-500",
                            )}
                          >
                            {navItem.label}
                          </span>
                        )}
                      </Link>
                    }
                  />
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

        {/* Both images stay `absolute` inside `overflow-hidden` so they never trigger a horizontal scrollbar! */}
        <div className="relative flex h-10 w-full items-center justify-center overflow-hidden">
          {/* Expanded Full Logo */}
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

          {/* Collapsed Mini Icon Logo */}
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
