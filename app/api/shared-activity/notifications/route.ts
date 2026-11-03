//api/shared-activity/notifications/route.js

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: Request) {
  // try {
  //   const { userId } = await isUser // Ensure request is passed
  //   if (!userId) {
  //     return new NextResponse("Unauthorized", { status: 401 });
  //   }

  //   const user = await prisma.user.findFirst({ where: { userId } });
  //   if (!user) {
  //     return new NextResponse("User not found", { status: 404 });
  //   }
  //   const notifications = await prisma.notification.findMany({
  //     where: { userId: user.id },
  //     orderBy: { createdAt: "desc" },
  //   });
  //   return NextResponse.json(notifications, { status: 200 });
  // } catch (error) {
  //   console.error("Error in GET /notifications:", error);
  //   return new NextResponse("Internal Server Error", { status: 500 });
  // 
  return NextResponse.json({ message: "Not Implemented" }, { status: 501 });
  }

