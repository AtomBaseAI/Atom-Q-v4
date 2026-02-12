import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { AttemptStatus } from "@prisma/client"

/**
 * Save quiz answers without submitting
 * This allows auto-saving progress during quiz
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
    const { attemptId, answers } = await request.json()

    if (!attemptId) {
      return NextResponse.json(
        { success: false, message: "Attempt ID is required" },
        { status: 400 }
      )
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { success: false, message: "Answers object is required" },
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
              }
            }
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

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      )
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return NextResponse.json(
        { success: false, message: "Quiz has already been submitted" },
        { status: 400 }
      )
    }

    if (attempt.quizId !== id) {
      return NextResponse.json(
        { success: false, message: "Attempt does not belong to this quiz" },
        { status: 400 }
      )
    }

    // Create a map of question IDs to their quiz question data
    const questionMap = new Map()
    attempt.quiz.quizQuestions.forEach((qq: any) => {
      questionMap.set(qq.questionId, qq)
    })

    // Process each saved answer
    const savedAnswers: Array<{ questionId: string; userAnswer: string }> = []
    const updatedAnswers: Array<{ questionId: string; userAnswer: string }> = []

    for (const [questionId, userAnswer] of Object.entries(answers)) {
      const quizQuestion = questionMap.get(questionId)

      // Only save if this question exists in the quiz
      if (!quizQuestion) {
        continue
      }

      const stringValue = typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer)

      // Check if answer already exists
      const existingAnswer = await db.quizAnswer.findUnique({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId
          }
        }
      })

      if (existingAnswer) {
        await db.quizAnswer.update({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId
            }
          },
          data: {
            userAnswer: stringValue
          }
        })
        updatedAnswers.push({ questionId, userAnswer: stringValue })
      } else {
        await db.quizAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId,
            userAnswer: stringValue
          }
        })
        savedAnswers.push({ questionId, userAnswer: stringValue })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Answers saved successfully",
      data: {
        attemptId: attempt.id,
        saved: savedAnswers.length,
        updated: updatedAnswers.length,
        total: savedAnswers.length + updatedAnswers.length,
        savedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error saving quiz answers:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
