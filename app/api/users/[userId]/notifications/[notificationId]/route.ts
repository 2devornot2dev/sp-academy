import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUser } from "@/lib/auth-guard";

interface Params {
    params: Promise<{ userId: string; notificationId: string }>;
}   

export async function GET(req: Request, { params }: Params) {
    const { userId, notificationId } = await params;

    const user = await isUser(userId);

    if (!userId || !user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            return NextResponse.json({ message: "Notification not found" }, { status: 404 });
        }
        return NextResponse.json(notification, { status: 200 });
    } catch (error) {
        console.error("Error fetching notification:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: Params) {
    const { userId, notificationId } = await params;

    const user = await isUser(userId);

    if (!userId || !user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            return NextResponse.json({ message: "Notification not found" }, { status: 404 });
        }
        await prisma.notification.delete({
            where: { id: notificationId },
        });
        return NextResponse.json({ message: "Notification deleted" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting notification:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }   
}

// patch will just mark notification as read

export async function PATCH(req: Request, { params }: Params) {
    const { userId, notificationId } = await params;

    const user = await isUser(userId);

    if (!userId || !user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            return NextResponse.json({ message: "Notification not found" }, { status: 404 });
        }

        const body = await req.json();
        const { read } = body;
        const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: read },
        });
        return NextResponse.json(updatedNotification, { status: 200 });
    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}