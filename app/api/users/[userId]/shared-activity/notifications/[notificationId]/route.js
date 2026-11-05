import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function PUT(request, { params }) {
  try {
    // Authenticate the user
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Extract notification ID from URL parameters
    const { notificationId } = params;
    if (!notificationId) {
      return new NextResponse("Missing notification ID", { status: 400 });
    }

    // Mark the notification as read in the database
    await prisma.notification.update({
      where: { id: notificationId }, // Ensure the ID is parsed as an integer
      data: { isRead: true },
    });

    return NextResponse.json(
      { message: "Notification marked as read" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in PUT /notifications/:id:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
