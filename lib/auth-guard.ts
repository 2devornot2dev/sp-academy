import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  return session.user;
}

// For API routes: returns { user } on success, or { error } with a NextResponse to return
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    return {
      error: NextResponse.json({ message: "Forbidden Request" }, { status: 403 }),
    };
  }

  return { user: dbUser };
}






export async function hasActiveAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      BillingInformation: { select: { isActive: true } },
    },
  });

  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true; // remove if admins should also need billing

  return user.BillingInformation?.isActive === true;
}

export async function isUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, displayUsername: true, image: true,  },
  });
}