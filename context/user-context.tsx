// @/context/user-context.tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";

export interface UserData {
  id: string;
  role: string;
  displayUsername?: string | null;
  image?: string | null;
}

interface UserContextValue {
  user: UserData;
  userId: string;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  user: UserData;
  children: React.ReactNode;
}

export function UserProvider({ user, children }: UserProviderProps) {
  // Memoize value so consumers only re-render if user data actually changes
  const value = useMemo(
    () => ({
      user,
      userId: user.id,
    }),
    [user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Custom hook to consume the user data
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

// Optional shortcut hook if you just need the ID
export function useUserId() {
  const { userId } = useUser();
  return userId;
}