import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

// Tab switch limit
const MAX_TAB_SWITCHES = 3

export async function POST(
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

    const { id: assessmentId } = await params
    const body = await request.json()
    const { attemptId } = body

    if (!attemptId) {
      return NextResponse.json(
        { message: "Attempt ID is required" },
        { status: 400 }
      )
    }

    // Get attempt
    const attempt = await db.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        userId: session.user.id,
        assessmentId: assessmentId,
      },
    })

    if (!attempt) {
      return NextResponse.json(
        { message: "Attempt not found" },
        { status: 404 }
      )
    }

    if (attempt.status === 'SUBMITTED') {
      return NextResponse.json(
        { message: "This assessment has already been submitted" },
        { status: 400 }
      )
    }

    // Get assessment to check max tabs setting
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: { maxTabs: true },
    })

    const maxTabs = assessment?.maxTabs || MAX_TAB_SWITCHES

    // Check existing tab switches
    const existingSwitches = await db.assessmentTabSwitch.findMany({
      where: {
        attemptId: attempt.id,
      },
      orderBy: { createdAt: 'asc' },
    })

    const currentSwitchCount = existingSwitches.length

    if (currentSwitchCount >= maxTabs) {
      return NextResponse.json(
        {
          message: "Maximum tab switches reached",
          currentSwitches: currentSwitchCount,
          maxSwitches: maxTabs,
          shouldAutoSubmit: true,
        },
        { status: 400 }
      )
    }

    // Create new tab switch record
    await db.assessmentTabSwitch.create({
      data: {
        attemptId: attempt.id,
        userId: session.user.id,
        assessmentId: assessmentId,
      },
    })

    const newSwitchCount = currentSwitchCount + 1
    const switchesRemaining = maxTabs - newSwitchCount

    return NextResponse.json({
      message: "Tab switch recorded",
      currentSwitches: newSwitchCount,
      switchesRemaining: switchesRemaining,
      shouldAutoSubmit: false,
    })
  } catch (error) {
    console.error("Error recording tab switch:", error)
    return NextResponse.json(
      { message: "Failed to record tab switch" },
      { status: 500 }
    )
  }
}
