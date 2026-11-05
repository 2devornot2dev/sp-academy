import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function PUT(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    console.log("User ID:", userId);

    const user = await prisma.user.findFirst({ where: { userId } });
    if (!user) {
      throw new Error("User not found");
    }
    await prisma.notification.updateMany({
      where: { userId: user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ message: "Activity updated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
