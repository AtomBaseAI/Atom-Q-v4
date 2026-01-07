import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submissions = await db.assessmentAttempt.findMany({
      where: { assessmentId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            campus: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Error fetching assessment submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment submissions" },
      { status: 500 }
    );
  }
}