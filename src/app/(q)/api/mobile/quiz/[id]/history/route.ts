import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { AttemptStatus } from "@prisma/client"

/**
 * Get quiz attempt history for a specific quiz
 * Shows all past attempts by the user
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

    // Verify user has access to this quiz
    const hasAccess = await db.quizUser.count({
      where: {
        quizId: id,
        userId
      }
    })

    const assignedUsersCount = await db.quizUser.count({
      where: { quizId: id }
    })

    if (assignedUsersCount > 0 && hasAccess === 0) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this quiz" },
        { status: 403 }
      )
    }

    // Get quiz details
    const quiz = await db.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        maxAttempts: true,
        showAnswers: true
      }
    })

    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Get all attempts for this user and quiz
    const attempts = await db.quizAttempt.findMany({
      where: {
        quizId: id,
        userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate statistics
    const completedAttempts = attempts.filter(a => a.status === AttemptStatus.SUBMITTED)
    const inProgressAttempts = attempts.filter(a => a.status === AttemptStatus.IN_PROGRESS)

    const bestScore = completedAttempts.length > 0
      ? Math.max(...completedAttempts.map(a => a.score || 0))
      : null

    const averageScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length
      : null

    const totalTimeTaken = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0)
      : null

    // Format attempts
    const formattedAttempts = attempts.map(attempt => ({
      id: attempt.id,
      status: attempt.status,
      score: attempt.score,
      totalPoints: attempt.totalPoints,
      timeTaken: attempt.timeTaken,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      createdAt: attempt.createdAt,
      isAutoSubmitted: attempt.isAutoSubmitted,
      canViewResults: attempt.status === AttemptStatus.SUBMITTED && quiz.showAnswers
    }))

    return NextResponse.json({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          maxAttempts: quiz.maxAttempts,
          showAnswers: quiz.showAnswers
        },
        stats: {
          totalAttempts: attempts.length,
          completedAttempts: completedAttempts.length,
          inProgressAttempts: inProgressAttempts.length,
          bestScore,
          averageScore,
          totalTimeTaken,
          remainingAttempts: quiz.maxAttempts
            ? Math.max(0, quiz.maxAttempts - completedAttempts.length)
            : null
        },
        attempts: formattedAttempts
      }
    })
  } catch (error) {
    console.error("Error fetching quiz history:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
