// mark all notifications as read for a user
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUser } from "@/lib/auth-guard";

interface Params {
    params: Promise<{ userId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
    const { userId } = await params;

    const user = await isUser(userId);

    if (!userId || !user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const updatedNotifications = await prisma.notification.updateMany({
            where: { userId },
            data: { isRead: true },
        });
        return NextResponse.json(updatedNotifications, { status: 200 });
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
