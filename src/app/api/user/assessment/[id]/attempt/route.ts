import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

// Time window for starting assessment (in minutes)
const TIME_WINDOW_MINUTES = 15

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

    // Get assessment data
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
        },
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
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
      // Validate existing attempt is still within time window
      if (assessment.startTime) {
        const startTime = new Date(assessment.startTime)
        const now = new Date()
        const diffMs = now.getTime() - startTime.getTime()
        const diffMinutes = diffMs / (1000 * 60)

        // If outside the time window, mark as expired
        if (diffMinutes > TIME_WINDOW_MINUTES) {
          // Update attempt status to show it's expired
          await db.assessmentAttempt.update({
            where: { id: existingAttempt.id },
            data: { status: AttemptStatus.SUBMITTED }
          })

          return NextResponse.json(
            { 
              message: `This assessment is no longer available. It was available for ${TIME_WINDOW_MINUTES} minutes after start time.` 
            },
            { status: 403 }
          )
        }
      }

      // Return existing attempt data
      const questions = assessment.assessmentQuestions
        .filter(aq => aq.question)
        .map((aq, index) => {
          try {
            if (!aq.question.id || !aq.question.content || !aq.question.type) {
              console.error(`Question at index ${index} missing required fields:`, aq.question)
              return null
            }

            let options: string[] = []
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
        .filter(q => q !== null)

      if (questions.length === 0) {
        return NextResponse.json(
          { message: "No valid questions found for this assessment" },
          { status: 400 }
        )
      }

      // Calculate time remaining for existing attempt
      const timeLimit = (assessment.timeLimit || 0) * 60 // Convert minutes to seconds
      const timeElapsed = Math.floor((new Date().getTime() - new Date(existingAttempt.startedAt || existingAttempt.createdAt).getTime()) / 1000)
      const timeRemaining = Math.max(0, timeLimit - timeElapsed)

      // Get tab switch count
      const tabSwitchCount = await db.assessmentTabSwitch.count({
        where: { attemptId: existingAttempt.id }
      })

      // Format assessment data for frontend
      const assessmentData = {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description || "",
        timeLimit: assessment.timeLimit,
        maxTabs: assessment.maxTabs,
        disableCopyPaste: assessment.disableCopyPaste,
        checkAnswerEnabled: false,
        startTime: assessment.startTime,
        campus: assessment.campus
      }

      return NextResponse.json({
        attemptId: existingAttempt.id,
        assessment: assessmentData,
        questions: questions,
        timeRemaining: timeRemaining,
        tabSwitches: tabSwitchCount,
        switchesRemaining: assessment.maxTabs ? assessment.maxTabs - tabSwitchCount : null,
        shouldAutoSubmit: assessment.maxTabs ? tabSwitchCount >= assessment.maxTabs : false,
      })
    }

    // Validate start time window for new attempt
    if (assessment.startTime) {
      const startTime = new Date(assessment.startTime)
      const now = new Date()
      const diffMs = now.getTime() - startTime.getTime()
      const diffMinutes = diffMs / (1000 * 60)

      // Before start time
      if (diffMinutes < 0) {
        const timeUntilStart = Math.abs(diffMinutes)
        const hours = Math.floor(timeUntilStart / 60)
        const minutes = Math.floor(timeUntilStart % 60)
        
        let timeMessage = `${Math.ceil(timeUntilStart)} minutes`
        if (hours > 0) {
          timeMessage = `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`
        }

        return NextResponse.json(
          { 
            message: `Assessment has not started yet. It will be available in ${timeMessage}.` 
          },
          { status: 403 }
        )
      }

      // After time window
      if (diffMinutes > TIME_WINDOW_MINUTES) {
        return NextResponse.json(
          { 
            message: `This assessment is no longer available. It was available for ${TIME_WINDOW_MINUTES} minutes after the start time.` 
          },
          { status: 403 }
        )
      }
    }

    // Create new attempt
    const attempt = await db.assessmentAttempt.create({
      data: {
        assessmentId: id,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date().toISOString(),
      }
    })

    // Format questions for frontend
    const questions = assessment.assessmentQuestions
      .filter(aq => aq.question)
      .map((aq, index) => {
        try {
          if (!aq.question.id || !aq.question.content || !aq.question.type) {
            console.error(`Question at index ${index} missing required fields:`, aq.question)
            return null
          }

          let options: string[] = []
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
      .filter(q => q !== null)

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
      id: assessment.id,
      title: assessment.title,
      description: assessment.description || "",
      timeLimit: assessment.timeLimit,
      maxTabs: assessment.maxTabs,
      disableCopyPaste: assessment.disableCopyPaste,
      checkAnswerEnabled: false,
      startTime: assessment.startTime,
      campus: assessment.campus
    }

    const responseData = {
      attemptId: attempt.id,
      assessment: assessmentData,
      questions: questions,
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
