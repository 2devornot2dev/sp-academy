// app/api/users/[userId]/notifications/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUser } from "@/lib/auth-guard";

interface Params {
    params: Promise<{ userId: string }>;
}

export async function GET(req: Request, { params }: Params) {
    const { userId } = await params;

    const user = await isUser(userId);

    if (!userId || !user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(notifications, { status: 200 });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}