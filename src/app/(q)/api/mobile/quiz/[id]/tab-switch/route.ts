import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { AttemptStatus } from "@prisma/client"

// Default maximum tab switches if not specified in quiz
const DEFAULT_MAX_TAB_SWITCHES = 3

/**
 * Record a tab switch during quiz attempt
 * Tracks user tab switches and enforces maximum limit
 * When max tabs reached, quiz should be auto-submitted
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      )
    }

    const { id } = await params
    const userId = decoded.id
    const body = await request.json()
    const { attemptId } = body

    if (!attemptId) {
      return NextResponse.json(
        { success: false, message: "Attempt ID is required" },
        { status: 400 }
      )
    }

    // Find the attempt
    const attempt = await db.quizAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
        quizId: id
      },
      include: {
        quiz: {
          select: {
            maxTabs: true
          }
        }
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Attempt not found" },
        { status: 404 }
      )
    }

    if (attempt.status === AttemptStatus.SUBMITTED) {
      return NextResponse.json(
        { success: false, message: "This quiz has already been submitted" },
        { status: 400 }
      )
    }

    // Get max tabs setting
    const maxTabs = attempt.quiz.maxTabs || DEFAULT_MAX_TAB_SWITCHES

    // Get existing tab switches for this attempt
    const existingSwitches = await (db as any).quizTabSwitch.findMany({
      where: {
        attemptId: attempt.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    const currentSwitchCount = existingSwitches.length

    // Check if max switches reached
    if (currentSwitchCount >= maxTabs) {
      return NextResponse.json({
        success: false,
        message: "Maximum tab switches reached",
        data: {
          currentSwitches: currentSwitchCount,
          maxSwitches: maxTabs,
          shouldAutoSubmit: true
        }
      }, { status: 400 })
    }

    // Record the new tab switch
    await (db as any).quizTabSwitch.create({
      data: {
        attemptId: attempt.id,
        userId,
        quizId: id
      }
    })

    const newSwitchCount = currentSwitchCount + 1
    const switchesRemaining = maxTabs - newSwitchCount

    return NextResponse.json({
      success: true,
      message: "Tab switch recorded",
      data: {
        currentSwitches: newSwitchCount,
        maxSwitches: maxTabs,
        switchesRemaining,
        shouldAutoSubmit: false,
        recordedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error recording tab switch:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Get tab switch history for an attempt
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      )
    }

    const { id } = await params
    const userId = decoded.id
    const searchParams = request.nextUrl.searchParams
    const attemptId = searchParams.get("attemptId")

    if (!attemptId) {
      return NextResponse.json(
        { success: false, message: "Attempt ID is required" },
        { status: 400 }
      )
    }

    // Verify attempt belongs to user
    const attempt = await db.quizAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
        quizId: id
      },
      include: {
        quiz: {
          select: {
            maxTabs: true
          }
        }
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Attempt not found" },
        { status: 404 }
      )
    }

    // Get tab switches
    const tabSwitches = await (db as any).quizTabSwitch.findMany({
      where: {
        attemptId: attempt.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    const maxTabs = attempt.quiz.maxTabs || DEFAULT_MAX_TAB_SWITCHES

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        quizId: id,
        currentSwitches: tabSwitches.length,
        maxSwitches: maxTabs,
        switchesRemaining: Math.max(0, maxTabs - tabSwitches.length),
        shouldAutoSubmit: tabSwitches.length >= maxTabs,
        tabSwitches: tabSwitches.map((ts: any) => ({
          id: ts.id,
          timestamp: ts.createdAt
        }))
      }
    })
  } catch (error) {
    console.error("Error fetching tab switches:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
