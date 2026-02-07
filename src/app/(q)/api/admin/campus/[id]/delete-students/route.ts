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

    // Delete all users associated with this campus
    // This will cascade delete their quiz attempts, assessment attempts, etc.
    const deleteResult = await db.user.deleteMany({
      where: {
        campusId: params.id,
        role: "USER"
      }
    })

    return NextResponse.json(
      {
        message: "Students deleted successfully",
        count: deleteResult.count
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting students:", error)
    return NextResponse.json(
      { error: "Failed to delete students" },
      { status: 500 }
    )
  }
}
