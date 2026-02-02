
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get only assessments assigned to this user
    const assignedAssessments = await db.assessmentUser.findMany({
      where: { userId },
      include: {
        assessment: {
          include: {
            _count: {
              select: {
                assessmentQuestions: true
              }
            }
          }
        }
      }
    })

    // Extract assessments from assignments
    const userAssessments = assignedAssessments.map(aq => aq.assessment)

    // Get user's attempts for these assessments
    const userAttempts = await db.assessmentAttempt.findMany({
      where: {
        userId,
        assessmentId: {
          in: userAssessments.map(a => a.id)
        }
      },
      select: {
        assessmentId: true,
        status: true,
        score: true,
        submittedAt: true,
        startedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Create a map of attempts by assessment ID
    const attemptsByAssessment = new Map()
    userAttempts.forEach(attempt => {
      if (!attemptsByAssessment.has(attempt.assessmentId)) {
        attemptsByAssessment.set(attempt.assessmentId, [])
      }
      attemptsByAssessment.get(attempt.assessmentId).push(attempt)
    })

    // Format response
    const formattedAssessments = userAssessments.map(assessment => {
      const attempts = attemptsByAssessment.get(assessment.id) || []
      const completedAttempts = attempts.filter((a: any) => a.status === AttemptStatus.SUBMITTED)
      const inProgressAttempt = attempts.find((a: any) => a.status === AttemptStatus.IN_PROGRESS)
      
      let canAttempt = true
      let attemptStatus = 'not_started'
      
      if (inProgressAttempt) {
        attemptStatus = 'in_progress'
      } else if (completedAttempts.length > 0) {
        attemptStatus = 'completed'
      }

      // Check time constraints with proper timezone handling
      const now = new Date()
      const startTime = assessment.startTime ? new Date(assessment.startTime) : null
      const endTime = assessment.endTime ? new Date(assessment.endTime) : null
      
      if (startTime && startTime > now) {
        canAttempt = false
        attemptStatus = 'not_started'
      }
      
      if (endTime && endTime < now) {
        canAttempt = false
        attemptStatus = 'expired'
      }

      // Additional validation: ensure end time is after start time if both are set
      if (startTime && endTime && endTime <= startTime) {
        canAttempt = false
        attemptStatus = 'not_started'
      }

      return {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description || "",
        timeLimit: assessment.timeLimit,
        difficulty: assessment.difficulty,
        maxTabs: assessment.maxTabs,
        disableCopyPaste: assessment.disableCopyPaste,
        startTime: assessment.startTime,
        endTime: assessment.endTime,
        questionCount: assessment._count.assessmentQuestions,
        attempts: completedAttempts.length,
        bestScore: completedAttempts.length > 0 
          ? Math.max(...completedAttempts.map((a: any) => a.score || 0))
          : null,
        lastAttemptDate: completedAttempts.length > 0 
          ? completedAttempts[0].submittedAt 
          : null,
        canAttempt,
        attemptStatus,
        hasInProgress: !!inProgressAttempt
      }
    })

    return NextResponse.json(formattedAssessments)
  } catch (error) {
    console.error("Error fetching user assessments:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
