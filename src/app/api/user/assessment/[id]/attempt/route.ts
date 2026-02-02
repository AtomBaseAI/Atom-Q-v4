import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

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

    const { id } = await params
    const userId = session.user.id

    // Parse request body
    let body: { accessKey?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

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

    // Get assessment data to check access key requirement
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        assessmentQuestions: {
          include: {
            question: true
          },
          orderBy: {
            order: 'asc'
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

    // Verify access key if assessment requires one
    if (assessment.accessKey && assessment.accessKey !== body.accessKey) {
      return NextResponse.json(
        { message: "Invalid access key" },
        { status: 403 }
      )
    }

    // Check if there's already an in-progress attempt
    const existingAttempt = await db.assessmentAttempt.findFirst({
      where: {
        assessmentId: id,
        userId,
        status: AttemptStatus.IN_PROGRESS
      }
    })

    if (existingAttempt) {
      // Return existing attempt with questions (don't increment tab switches, just return data)
      // Format questions for frontend (similar to new attempt logic)
      const questions = assessment.assessmentQuestions
        .filter(aq => aq.question) // Filter out null questions
        .map((aq, index) => {
          try {
            if (!aq.question.id || !aq.question.content || !aq.question.type) {
              console.error(`Question at index ${index} missing required fields:`, aq.question)
              return null
            }

            let options = []
            if (aq.question.options) {
              if (typeof aq.question.options === 'string') {
                try {
                  options = JSON.parse(aq.question.options)
                } catch (parseError) {
                  console.error(`Failed to parse options for question ${aq.question.id}:`, parseError)
                  options = []
                }
              } else if (Array.isArray(aq.question.options)) {
                options = aq.question.options
              }
            }

            if (!Array.isArray(options)) {
              console.error(`Options is not an array for question ${aq.question.id}:`, options)
              options = []
            }

            return {
              id: aq.question.id,
              title: aq.question.title || `Question ${index + 1}`,
              content: aq.question.content,
              type: aq.question.type,
              options: options,
              correctAnswer: aq.question.correctAnswer || '0',
              explanation: aq.question.explanation || '',
              difficulty: aq.question.difficulty,
              order: aq.order,
              points: aq.points
            }
          } catch (error) {
            console.error(`Failed to process question ${aq.question?.id || index}:`, {
              error: error instanceof Error ? error.message : String(error),
              question: aq.question
            })
            return null
          }
        })
        .filter(q => q !== null) // Remove failed questions

      if (questions.length === 0) {
        return NextResponse.json(
          { message: "No valid questions found for this assessment" },
          { status: 400 }
        )
      }

      // Calculate time remaining for existing attempt
      const timeLimit = (assessment.timeLimit || 0) * 60 // Convert minutes to seconds
      const timeElapsed = Math.floor((new Date().getTime() - new Date(existingAttempt.startedAt).getTime()) / 1000)
      const timeRemaining = Math.max(0, timeLimit - timeElapsed)

      // Format assessment data for frontend
      const assessmentData = {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description || "",
        timeLimit: assessment.timeLimit,
        maxTabs: assessment.maxTabs,
        disableCopyPaste: assessment.disableCopyPaste,
        checkAnswerEnabled: false,
        startTime: assessment.startTime
      }

      return NextResponse.json({
        attemptId: existingAttempt.id,
        assessment: assessmentData,
        questions: questions,
        timeRemaining: timeRemaining,
        tabSwitches: existingAttempt.tabSwitches,
        switchesRemaining: assessment.maxTabs ? assessment.maxTabs - existingAttempt.tabSwitches : null,
        shouldAutoSubmit: assessment.maxTabs ? existingAttempt.tabSwitches >= assessment.maxTabs : false,
      })
    }

    // Check if assessment is within availability window
    const now = new Date()
    const startTime = assessment.startTime ? new Date(assessment.startTime) : null

    if (startTime && startTime > now) {
      return NextResponse.json(
        { message: "Assessment has not started yet" },
        { status: 403 }
      )
    }

    // Create new attempt
    const attempt = await db.assessmentAttempt.create({
      data: {
        assessmentId: id,
        userId,
        status: AttemptStatus.NOT_STARTED,
        startedAt: new Date().toISOString(),
        tabSwitches: 0,
      }
    })

    // Format questions for frontend (similar to quiz attempt endpoint)
    const questions = assessment.assessmentQuestions
      .filter(aq => aq.question) // Filter out null questions
      .map((aq, index) => {
        try {
          if (!aq.question.id || !aq.question.content || !aq.question.type) {
            console.error(`Question at index ${index} missing required fields:`, aq.question)
            return null
          }

          let options = []
          if (aq.question.options) {
            if (typeof aq.question.options === 'string') {
              try {
                options = JSON.parse(aq.question.options)
              } catch (parseError) {
                console.error(`Failed to parse options for question ${aq.question.id}:`, parseError)
                options = []
              }
            } else if (Array.isArray(aq.question.options)) {
              options = aq.question.options
            }
          }

          if (!Array.isArray(options)) {
            console.error(`Options is not an array for question ${aq.question.id}:`, options)
            options = []
          }

          return {
            id: aq.question.id,
            title: aq.question.title || `Question ${index + 1}`,
            content: aq.question.content,
            type: aq.question.type,
            options: options,
            correctAnswer: aq.question.correctAnswer || '0',
            explanation: aq.question.explanation || '',
            difficulty: aq.question.difficulty,
            order: aq.order,
            points: aq.points
          }
        } catch (error) {
          console.error(`Failed to process question ${aq.question?.id || index}:`, {
            error: error instanceof Error ? error.message : String(error),
            question: aq.question
          })
          return null
        }
      })
      .filter(q => q !== null) // Remove failed questions

    if (questions.length === 0) {
      return NextResponse.json(
        { message: "No valid questions found for this assessment" },
        { status: 400 }
      )
    }

    // Calculate time remaining
    const timeLimit = (assessment.timeLimit || 0) * 60 // Convert minutes to seconds
    const timeRemaining = timeLimit

    // Format assessment data for frontend
    const assessmentData = {
      id: attempt.id,
      title: assessment.title,
      description: assessment.description || "",
      timeLimit: assessment.timeLimit,
      maxTabs: assessment.maxTabs,
      disableCopyPaste: assessment.disableCopyPaste,
      checkAnswerEnabled: false,
      questions: questions
    }

    const responseData = {
      attemptId: attempt.id,
      assessment: assessmentData,
      timeRemaining: timeRemaining
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error starting assessment:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
