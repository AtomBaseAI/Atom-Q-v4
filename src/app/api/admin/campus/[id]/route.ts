import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"

const updateCampusSchema = z.object({
  name: z.string().min(1, "Campus name is required"),
  shortName: z.string().min(1, "Short name is required"),
  logo: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  departments: z.array(z.object({ name: z.string().min(1) })).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campus = await db.campus.findUnique({
      where: { id: params.id },
      include: {
        departments: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            departments: true,
            users: {
              where: {
                role: "USER"
              }
            },
            quizzes: true,
          }
        }
      }
    })

    if (!campus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Transform the data to include assessments count
    const transformedCampus = {
      ...campus,
      _count: {
        ...campus._count,
        assessments: campus._count.quizzes
      }
    }

    return NextResponse.json(transformedCampus)
  } catch (error) {
    console.error("Error fetching campus:", error)
    return NextResponse.json(
      { error: "Failed to fetch campus" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = updateCampusSchema.parse(body)

    // Check if campus exists
    const existingCampus = await db.campus.findUnique({
      where: { id: params.id }
    })

    if (!existingCampus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Check if another campus with same name or short name exists
    const duplicateCampus = await db.campus.findFirst({
      where: {
        AND: [
          { id: { not: params.id } },
          {
            OR: [
              { name: validatedData.name },
              { shortName: validatedData.shortName }
            ]
          }
        ]
      }
    })

    if (duplicateCampus) {
      return NextResponse.json(
        { error: "Campus with this name or short name already exists" },
        { status: 400 }
      )
    }

    // Update campus and departments
    const campus = await db.campus.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        shortName: validatedData.shortName,
        logo: validatedData.logo || null,
        location: validatedData.location,
        // Update departments - this is a complex operation
        // For now, we'll handle it by deleting existing departments and creating new ones
        ...(validatedData.departments && {
          departments: {
            deleteMany: {},
            create: validatedData.departments
          }
        })
      },
      include: {
        departments: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            departments: true,
            users: {
              where: {
                role: "USER"
              }
            },
            quizzes: true,
          }
        }
      }
    })

    // Transform the response
    const transformedCampus = {
      ...campus,
      _count: {
        ...campus._count,
        assessments: campus._count.quizzes
      }
    }

    return NextResponse.json(transformedCampus)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating campus:", error)
    return NextResponse.json(
      { error: "Failed to update campus" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if campus exists
    const existingCampus = await db.campus.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            quizzes: true,
            departments: true
          }
        }
      }
    })

    if (!existingCampus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Check if campus has associated data
    const hasUsers = existingCampus._count.users > 0
    const hasQuizzes = existingCampus._count.quizzes > 0

    if (hasUsers || hasQuizzes) {
      return NextResponse.json(
        { 
          error: "Cannot delete campus with associated users or quizzes. Please reassign or delete them first." 
        },
        { status: 400 }
      )
    }

    // Delete the campus (departments will be deleted due to cascade)
    await db.campus.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: "Campus deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting campus:", error)
    return NextResponse.json(
      { error: "Failed to delete campus" },
      { status: 500 }
    )
  }
}