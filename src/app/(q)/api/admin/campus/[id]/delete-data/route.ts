import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if campus exists
    const campus = await db.campus.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true
      }
    })

    if (!campus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Check if there are any users still remaining
    const userCount = await db.user.count({
      where: {
        campusId: params.id,
        role: "USER"
      }
    })

    if (userCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete campus data while students still exist. Please delete all students first."
        },
        { status: 400 }
      )
    }

    // Delete all assessments for this campus
    const assessmentsDeleted = await db.assessment.deleteMany({
      where: {
        campusId: params.id
      }
    })

    // Delete all quizzes for this campus
    const quizzesDeleted = await db.quiz.deleteMany({
      where: {
        campusId: params.id
      }
    })

    // Delete all question groups created by users of this campus
    const userIds = await db.user.findMany({
      where: {
        campusId: params.id
      },
      select: {
        id: true
      }
    })

    // Delete question groups (and their questions)
    await db.questionGroup.deleteMany({
      where: {
        creatorId: {
          in: userIds.map(u => u.id)
        }
      }
    })

    // Delete all departments for this campus
    const departmentsDeleted = await db.department.deleteMany({
      where: {
        campusId: params.id
      }
    })

    // Delete all batches for this campus
    const batchesDeleted = await db.batch.deleteMany({
      where: {
        campusId: params.id
      }
    })

    return NextResponse.json(
      {
        message: "Campus data deleted successfully",
        deleted: {
          assessments: assessmentsDeleted.count,
          quizzes: quizzesDeleted.count,
          departments: departmentsDeleted.count,
          batches: batchesDeleted.count
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting campus data:", error)
    return NextResponse.json(
      { error: "Failed to delete campus data" },
      { status: 500 }
    )
  }
}
