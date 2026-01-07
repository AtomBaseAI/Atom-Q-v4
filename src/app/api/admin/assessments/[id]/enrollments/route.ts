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

    const enrollments = await db.assessmentUser.findMany({
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(enrollments);
  } catch (error) {
    console.error("Error fetching assessment enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment enrollments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { userIds } = data;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs are required" },
        { status: 400 }
      );
    }

    // Check if assessment exists
    const assessment = await db.assessment.findUnique({
      where: { id: params.id },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Enroll users
    const enrollments = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const enrollment = await db.assessmentUser.create({
            data: {
              assessmentId: params.id,
              userId,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          return { success: true, enrollment };
        } catch (error) {
          // Handle duplicate enrollment
          const existingEnrollment = await db.assessmentUser.findFirst({
            where: {
              assessmentId: params.id,
              userId,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          return { success: false, error: "Already enrolled", enrollment: existingEnrollment };
        }
      })
    );

    return NextResponse.json(enrollments);
  } catch (error) {
    console.error("Error enrolling users:", error);
    return NextResponse.json(
      { error: "Failed to enroll users" },
      { status: 500 }
    );
  }
}