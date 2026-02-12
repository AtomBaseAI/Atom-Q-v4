import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { AttemptStatus, QuestionType } from "@prisma/client"

/**
 * Get detailed quiz results
 * Shows correct/incorrect answers and explanations
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

    // Find the attempt
    const attempt = await db.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            quizQuestions: {
              include: {
                question: true
              },
              orderBy: {
                order: "asc"
              }
            }
          }
        },
        answers: true
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Attempt not found" },
        { status: 404 }
      )
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      )
    }

    if (attempt.quizId !== id) {
      return NextResponse.json(
        { success: false, message: "Attempt does not belong to this quiz" },
        { status: 400 }
      )
    }

    if (attempt.status !== AttemptStatus.SUBMITTED) {
      return NextResponse.json(
        { success: false, message: "Quiz has not been submitted yet" },
        { status: 400 }
      )
    }

    // Check if answers should be shown
    if (!attempt.quiz.showAnswers) {
      return NextResponse.json({
        success: true,
        data: {
          attemptId: attempt.id,
          quizId: attempt.quiz.id,
          quizTitle: attempt.quiz.title,
          score: attempt.score,
          totalPoints: attempt.totalPoints,
          timeTaken: attempt.timeTaken,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          showAnswers: false
        }
      })
    }

    // Create a map of answers by question ID
    const answersMap = new Map()
    attempt.answers.forEach(answer => {
      answersMap.set(answer.questionId, answer)
    })

    // Format questions with results
    const questions = attempt.quiz.quizQuestions
      .filter(qq => qq.question)
      .map((qq, index) => {
        const answer = answersMap.get(qq.questionId)

        // Parse options
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

        // Parse correct answer for multi-select
        let correctAnswer = qq.question.correctAnswer
        if (qq.question.type === QuestionType.MULTI_SELECT) {
          try {
            correctAnswer = typeof correctAnswer === 'string'
              ? JSON.parse(correctAnswer)
              : correctAnswer
          } catch (error) {
            correctAnswer = []
          }
        }

        // Parse user answer for multi-select
        let userAnswer: string | any[] = answer?.userAnswer || ""
        if (qq.question.type === QuestionType.MULTI_SELECT && answer?.userAnswer) {
          try {
            userAnswer = typeof answer.userAnswer === 'string'
              ? JSON.parse(answer.userAnswer)
              : answer.userAnswer
          } catch (error) {
            userAnswer = ""
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
          points: qq.points,
          correctAnswer,
          userAnswer,
          isCorrect: answer?.isCorrect || false,
          pointsEarned: answer?.pointsEarned || 0
        }
      })

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        quiz: {
          id: attempt.quiz.id,
          title: attempt.quiz.title,
          description: attempt.quiz.description,
          timeLimit: attempt.quiz.timeLimit,
          negativeMarking: attempt.quiz.negativeMarking,
          negativePoints: attempt.quiz.negativePoints
        },
        attempt: {
          score: attempt.score,
          totalPoints: attempt.totalPoints,
          timeTaken: attempt.timeTaken,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          isAutoSubmitted: attempt.isAutoSubmitted
        },
        showAnswers: true,
        questions
      }
    })
  } catch (error) {
    console.error("Error fetching quiz results:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
