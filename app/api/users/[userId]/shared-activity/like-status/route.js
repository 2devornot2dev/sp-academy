//api/shared-activity/liked-status/route.js

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request) {
  const { userId } = auth();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id || !type || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({ where: { userId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check if the user has already liked this item
    const userLike = await prisma.like.findFirst({
      where: { userId: user.id, activityId: id, type },
    });

    // Get total like count
    const likeCount = await prisma.like.count({
      where: { activityId: id, type },
    });

    return NextResponse.json(
      { liked: !!userLike, likes: likeCount },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching like status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
