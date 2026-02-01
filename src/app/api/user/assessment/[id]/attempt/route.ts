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

    const { id: assessmentId } = await params
    const body = await request.json()
    const { accessKey } = body

    if (!accessKey) {
      return NextResponse.json(
        { message: "Access key is required" },
        { status: 400 }
      )
    }

    // Check if assessment exists and is active
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      )
    }

    if (assessment.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: "Assessment is not active" },
        { status: 400 }
      )
    }

    // Check if user is enrolled
    const enrollment = await db.assessmentUser.findFirst({
      where: {
        assessmentId: assessmentId,
        userId: session.user.id,
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { message: "You are not enrolled in this assessment" },
        { status: 403 }
      )
    }

    // Validate access key
    if (assessment.accessKey !== accessKey) {
      return NextResponse.json(
        { message: "Invalid access key" },
        { status: 400 }
      )
    }

    // Validate start time window
    const now = new Date()
    let startTime: Date | null = assessment.startTime ? new Date(assessment.startTime) : null

    if (startTime) {
      // Allow start from 15 minutes before start time
      const windowStart = new Date(startTime.getTime() - 15 * 60 * 1000)
      
      if (now < windowStart) {
        return NextResponse.json(
          { 
            message: "Assessment has not started yet",
            startTime: assessment.startTime,
            windowOpens: windowStart,
          },
          { status: 400 }
        )
      }

      // Check if too late (after start time + duration)
      if (assessment.timeLimit) {
        const windowEnd = new Date(startTime.getTime() + assessment.timeLimit * 60 * 1000)
        if (now > windowEnd) {
          return NextResponse.json(
            { 
              message: "Assessment has ended",
              endTime: new Date(startTime.getTime() + assessment.timeLimit * 60 * 1000).toISOString(),
            },
            { status: 400 }
          )
        }
      }
    }

    // Check if user already has an attempt in progress
    const existingAttempt = await db.assessmentAttempt.findFirst({
      where: {
        assessmentId: assessmentId,
        userId: session.user.id,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingAttempt) {
      // Resume existing attempt
      const questions = await db.assessmentQuestion.findMany({
        where: { assessmentId: assessmentId },
        include: {
          question: true,
        },
        orderBy: { order: 'asc' },
      })

      const totalPoints = questions.reduce((sum, aq) => sum + (aq.question.points || 1), 0)

      return NextResponse.json({
        message: "Resuming existing attempt",
        attemptId: existingAttempt.id,
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          timeLimit: assessment.timeLimit,
          disableCopyPaste: assessment.disableCopyPaste,
          campus: assessment.campus,
          startTime: assessment.startTime,
          endTime: assessment.timeLimit ? new Date(new Date(assessment.startTime!).getTime() + assessment.timeLimit! * 60 * 1000).toISOString() : null,
        },
        questions,
        totalPoints,
        status: existingAttempt.status,
        timeRemaining: existingAttempt.timeTaken || assessment.timeLimit ? assessment.timeLimit! * 60 : null,
        answers: {},
        questionIndex: 0,
      })
    }

    // Create new attempt
    const attempt = await db.assessmentAttempt.create({
      data: {
        assessmentId: assessmentId,
        userId: session.user.id,
        status: 'NOT_STARTED',
      },
    })

    // Fetch questions with their order
    const questions = await db.assessmentQuestion.findMany({
      where: { assessmentId: assessmentId },
      include: {
        question: true,
      },
      orderBy: { order: 'asc' },
    })

    const totalPoints = questions.reduce((sum, aq) => sum + (aq.question.points || 1), 0)

    return NextResponse.json({
      message: "Assessment started successfully",
      attemptId: attempt.id,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        timeLimit: assessment.timeLimit,
        disableCopyPaste: assessment.disableCopyPaste,
        campus: assessment.campus,
        startTime: assessment.startTime,
        endTime: assessment.timeLimit ? new Date(new Date(assessment.startTime!).getTime() + assessment.timeLimit! * 60 * 1000).toISOString() : null,
      },
      questions,
      totalPoints,
      status: 'NOT_STARTED',
      timeRemaining: assessment.timeLimit ? assessment.timeLimit! * 60 : null,
      answers: {},
      questionIndex: 0,
    })
  } catch (error) {
    console.error("Error starting assessment:", error)
    return NextResponse.json(
      { message: "Failed to start assessment" },
      { status: 500 }
    )
  }
}
