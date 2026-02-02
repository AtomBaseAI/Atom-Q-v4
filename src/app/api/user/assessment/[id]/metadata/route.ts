import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const userId = session.user.id

    // Verify user is enrolled in this assessment
    const enrollment = await db.assessmentUser.findFirst({
      where: {
        assessmentId: id,
        userId
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { message: "You are not enrolled in this assessment" },
        { status: 403 }
      )
    }

    // Get assessment metadata (including whether access key is required)
    const assessment = await db.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        startTime: true,
        accessKey: true,
        maxTabs: true,
        disableCopyPaste: true,
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        _count: {
          select: {
            assessmentQuestions: true
          }
        }
      }
    })

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      )
    }

    // Check if there's an existing in-progress attempt
    const existingAttempt = await db.assessmentAttempt.findFirst({
      where: {
        assessmentId: id,
        userId,
        status: 'IN_PROGRESS'
      },
      select: {
        id: true,
        tabSwitches: true
      }
    })

    return NextResponse.json({
      assessment: {
        ...assessment,
        requiresAccessKey: !!assessment.accessKey,
        // Don't send the actual access key to the client for security
        accessKey: undefined
      },
      hasExistingAttempt: !!existingAttempt,
      existingAttemptId: existingAttempt?.id,
      existingTabSwitches: existingAttempt?.tabSwitches || 0
    })
  } catch (error) {
    console.error("Error fetching assessment metadata:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
