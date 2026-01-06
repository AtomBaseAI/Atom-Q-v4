
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET() {
  try {
    console.log("Settings API: Attempting to fetch settings...")
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.log("Settings API: No session found")
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 })
    }
    
    if (session.user.role !== UserRole.ADMIN) {
      console.log("Settings API: User role is not admin:", session.user.role)
      return NextResponse.json({ error: "Unauthorized - Not admin" }, { status: 401 })
    }

    console.log("Settings API: User authenticated as admin, fetching settings...")
    
    // Get settings, create default if not exists
    let settings = await db.settings.findFirst()
    
    if (!settings) {
      console.log("Settings API: No settings found, creating defaults...")
      settings = await db.settings.create({
        data: {
          siteTitle: "Atom Q",
          siteDescription: "Take quizzes and test your knowledge",
          maintenanceMode: false,
          allowRegistration: true,
          enableGithubAuth: false,
        }
      })
      console.log("Settings API: Default settings created:", settings.id)
    } else {
      console.log("Settings API: Settings found:", settings.id)
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
      siteTitle,
      siteDescription,
      maintenanceMode,
      allowRegistration,
      enableGithubAuth
    } = body

    // Get existing settings or create new
    let settings = await db.settings.findFirst()
    
    if (settings) {
      // Update existing settings
      settings = await db.settings.update({
        where: { id: settings.id },
        data: {
          siteTitle,
          siteDescription,
          maintenanceMode,
          allowRegistration,
          enableGithubAuth
        }
      })
    } else {
      // Create new settings
      settings = await db.settings.create({
        data: {
          siteTitle,
          siteDescription,
          maintenanceMode,
          allowRegistration,
          enableGithubAuth
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
