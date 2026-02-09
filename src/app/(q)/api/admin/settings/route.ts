import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized - Not admin" }, { status: 401 })
    }

    // Get settings, create default if not exists
    let settings = await db.settings.findFirst()

    if (!settings) {
      settings = await db.settings.create({
        data: {
          maintenanceMode: false,
        }
      })
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300',
      }
    })
  } catch (error) {
    console.error("Settings API: Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      maintenanceMode
    } = body

    // Get existing settings or create new
    let settings = await db.settings.findFirst()

    if (settings) {
      // Update existing settings
      settings = await db.settings.update({
        where: { id: settings.id },
        data: {
          maintenanceMode
        }
      })
    } else {
      // Create new settings
      settings = await db.settings.create({
        data: {
          maintenanceMode
        }
      })
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300',
      }
    })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
