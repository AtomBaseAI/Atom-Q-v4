import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch enrollments
    const enrollments = await db.assessmentUser.findMany({
      where: { assessmentId: id },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch user details separately for each enrollment
    const enrollmentResults = await Promise.all(
      enrollments.map(async (enrollment) => {
        const user = await db.user.findUnique({
          where: { id: enrollment.userId },
          select: {
            id: true,
            name: true,
            email: true,
            campus: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
            section: true,
          },
        });

        return {
          id: enrollment.id,
          assessmentId: enrollment.assessmentId,
          userId: enrollment.userId,
          createdAt: enrollment.createdAt,
          user,
        };
      })
    );

    return NextResponse.json(enrollmentResults);
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Check if assessment exists
    const assessment = await db.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Enroll users
    const results = await Promise.all(
      userIds.map(async (userId) => {
        try {
          await db.assessmentUser.create({
            data: {
              assessmentId: id,
              userId,
            },
          });
          return { success: true, userId };
        } catch (error) {
          return { success: false, error: "Already enrolled", userId };
        }
      })
    );

    const successfulEnrollments = results.filter((r: any) => r.success);
    const duplicateCount = results.length - successfulEnrollments.length;

    return NextResponse.json({
      message: `${successfulEnrollments.length} user(s) enrolled successfully${duplicateCount > 0 ? ` (${duplicateCount} already enrolled)` : ''}`,
      results,
      successfulCount: successfulEnrollments.length,
      duplicateCount
    });
  } catch (error) {
    console.error("Error enrolling users:", error);
    return NextResponse.json(
      { error: "Failed to enroll users" },
      { status: 500 }
    );
  }
}
