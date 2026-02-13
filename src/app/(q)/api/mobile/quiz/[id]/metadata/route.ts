import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { AttemptStatus } from "@prisma/client"

/**
 * Get quiz metadata
 * Returns quiz settings, enrollment status, and attempt info
 * Use this endpoint before starting a quiz to check constraints
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

    // Get quiz details
    const quiz = await db.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        difficulty: true,
        startTime: true,
        endTime: true,
        maxAttempts: true,
        status: true,
        showAnswers: true,
        checkAnswerEnabled: true,
        negativeMarking: true,
        negativePoints: true,
        randomOrder: true,
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        _count: {
          select: {
            quizQuestions: true
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Check if quiz is active
    if (quiz.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Quiz is not active" },
        { status: 400 }
      )
    }

    // Check time constraints
    const now = new Date()
    let canAttemptDueToTime = true
    let timeStatus: 'available' | 'not_started' | 'expired' = 'available'

    if (quiz.startTime && new Date(quiz.startTime) > now) {
      canAttemptDueToTime = false
      timeStatus = 'not_started'
    }

    if (quiz.endTime && new Date(quiz.endTime) < now) {
      canAttemptDueToTime = false
      timeStatus = 'expired'
    }

    // Check enrollment
    const enrollment = await db.quizUser.findUnique({
      where: {
        quizId_userId: {
          quizId: id,
          userId
        }
      }
    })

    // If quiz has specific user assignments, check if user is assigned
    const assignedUsersCount = await db.quizUser.count({
      where: { quizId: id }
    })

    if (assignedUsersCount > 0 && !enrollment) {
      return NextResponse.json(
        { success: false, message: "You are not enrolled in this quiz" },
        { status: 403 }
      )
    }

    // Check for existing in-progress attempt
    const existingAttempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId,
        status: AttemptStatus.IN_PROGRESS
      },
      select: {
        id: true,
        startedAt: true
      }
    })

    const hasExistingAttempt = !!existingAttempt
    const existingAttemptId = existingAttempt?.id || ""

    // Get tab switches count for the existing attempt
    let existingTabSwitches = 0
    if (existingAttemptId) {
      existingTabSwitches = await (db as any).quizTabSwitch.count({
        where: { attemptId: existingAttemptId }
      })
    }

    // Get completed attempts count
    const completedAttemptsCount = await db.quizAttempt.count({
      where: {
        quizId: id,
        userId,
        status: AttemptStatus.SUBMITTED
      }
    })

    // Check if user can attempt based on max attempts
    let canAttemptDueToAttempts = true
    if (quiz.maxAttempts !== null && completedAttemptsCount >= quiz.maxAttempts) {
      canAttemptDueToAttempts = false
    }

    // Overall can attempt status
    const canAttempt = canAttemptDueToTime && canAttemptDueToAttempts

    return NextResponse.json({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          difficulty: quiz.difficulty,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          maxAttempts: quiz.maxAttempts,
          showAnswers: quiz.showAnswers,
          checkAnswerEnabled: quiz.checkAnswerEnabled,
          negativeMarking: quiz.negativeMarking,
          negativePoints: quiz.negativePoints,
          randomOrder: quiz.randomOrder,
          questionCount: quiz._count.quizQuestions,
          campus: quiz.campus
        },
        enrollment: {
          isEnrolled: !!enrollment
        },
        attempt: {
          hasExistingAttempt,
          existingAttemptId,
          completedAttemptsCount,
          canAttempt,
          timeStatus,
          reason: !canAttempt
            ? !canAttemptDueToTime
              ? timeStatus === 'not_started'
                ? 'Quiz has not started yet'
                : 'Quiz has expired'
              : 'Maximum attempts reached'
            : 'Ready to attempt'
        },
        tabSwitches: {
          count: existingTabSwitches
        }
      }
    })
  } catch (error) {
    console.error("Error fetching quiz metadata:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
