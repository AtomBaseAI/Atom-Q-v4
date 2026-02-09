import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { AttemptStatus } from "@prisma/client"

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

    // Find active attempt or create a new one if needed
    let existingAttempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId,
        status: AttemptStatus.IN_PROGRESS
      }
    })

    // If no active attempt, check if user can start a new one
    let attemptId: string

    if (!existingAttempt) {
      const quiz = await db.quiz.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          status: true,
          startTime: true,
          endTime: true,
          maxAttempts: true,
          showAnswers: true,
          checkAnswerEnabled: true,
          negativeMarking: true,
          negativePoints: true,
          quizQuestions: {
            select: {
              points: true
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

      if (quiz.status !== "ACTIVE") {
        return NextResponse.json(
          { success: false, message: "Quiz is not active" },
          { status: 400 }
        )
      }

      // Check time constraints
      const now = new Date()
      if (quiz.startTime && new Date(quiz.startTime) > now) {
        return NextResponse.json(
          { success: false, message: "Quiz has not started yet" },
          { status: 400 }
        )
      }

      if (quiz.endTime && new Date(quiz.endTime) < now) {
        return NextResponse.json(
          { success: false, message: "Quiz has expired" },
          { status: 400 }
        )
      }

      // Check if user has access
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

      // Check max attempts
      if (quiz.maxAttempts !== null) {
        const userAttemptCount = await db.quizAttempt.count({
          where: {
            quizId: id,
            userId,
            status: AttemptStatus.SUBMITTED
          }
        })

        if (userAttemptCount >= quiz.maxAttempts) {
          return NextResponse.json(
            { success: false, message: "Maximum attempts reached" },
            { status: 400 }
          )
        }
      }

      // Calculate total points
      const totalPoints = quiz.quizQuestions.reduce((sum, qq) => sum + qq.points, 0)

      // Create new attempt
      const newAttempt = await db.quizAttempt.create({
        data: {
          quizId: id,
          userId,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: new Date(),
          totalPoints: totalPoints
        }
      })
      attemptId = newAttempt.id
    } else {
      attemptId = existingAttempt.id
    }

    // Fetch quiz data with questions and answers
    const attempt = await db.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            quizQuestions: {
              include: {
                question: {
                  select: {
                    id: true,
                    title: true,
                    content: true,
                    type: true,
                    options: true,
                    explanation: true,
                    difficulty: true
                  }
                }
              },
              orderBy: {
                order: "asc"
              }
            }
          }
        },
        answers: {
          select: {
            questionId: true,
            userAnswer: true
          }
        }
      }
    })

    if (!attempt || !attempt.quiz) {
      return NextResponse.json(
        { success: false, message: "Quiz data not found" },
        { status: 404 }
      )
    }

    // Calculate time remaining
    const timeElapsed = attempt.startedAt
      ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0
    const timeLimit = (attempt.quiz.timeLimit || 0) * 60 // Convert minutes to seconds
    const timeRemaining = Math.max(0, timeLimit - timeElapsed)

    // Format questions
    const questions = attempt.quiz.quizQuestions
      .filter(qq => qq.question)
      .map((qq, index) => {
        let options: any[] = []
        if (qq.question.options) {
          try {
            options = typeof qq.question.options === 'string'
              ? JSON.parse(qq.question.options)
              : qq.question.options
          } catch (error) {
            options = []
          }
        }

        return {
          id: qq.question.id,
          title: qq.question.title || `Question ${index + 1}`,
          content: qq.question.content,
          type: qq.question.type,
          options: Array.isArray(options) ? options : [],
          explanation: qq.question.explanation || '',
          difficulty: qq.question.difficulty,
          order: qq.order,
          points: qq.points
        }
      })

    // Format quiz data
    const quizData = {
      id: attempt.quiz.id,
      title: attempt.quiz.title,
      description: attempt.quiz.description,
      timeLimit: attempt.quiz.timeLimit,
      showAnswers: attempt.quiz.showAnswers || false,
      checkAnswerEnabled: attempt.quiz.checkAnswerEnabled || false,
      negativeMarking: attempt.quiz.negativeMarking || false,
      negativePoints: attempt.quiz.negativePoints,
      questions: questions
    }

    // Format existing answers
    const existingAnswers = attempt.answers.reduce((acc, answer) => {
      acc[answer.questionId] = answer.userAnswer
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        quiz: quizData,
        timeRemaining: timeRemaining,
        startedAt: attempt.startedAt,
        answers: existingAnswers
      }
    })
  } catch (error) {
    console.error("Error fetching quiz attempt:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
