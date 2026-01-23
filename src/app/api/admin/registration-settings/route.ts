import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET() {
  try {
    console.log("Registration Settings API: Attempting to fetch registration settings...")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Registration Settings API: No session found")
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN) {
      console.log("Registration Settings API: User role is not admin:", session.user.role)
      return NextResponse.json({ error: "Unauthorized - Not admin" }, { status: 401 })
    }

    console.log("Registration Settings API: User authenticated as admin, fetching registration settings...")

    // Get registration settings, create default if not exists
    let registrationSettings = await db.registrationSettings.findFirst()

    if (!registrationSettings) {
      console.log("Registration Settings API: No registration settings found, creating defaults...")
      registrationSettings = await db.registrationSettings.create({
        data: {
          allowRegistration: true,
        }
      })
      console.log("Registration Settings API: Default registration settings created:", registrationSettings.id)
    } else {
      console.log("Registration Settings API: Registration settings found:", registrationSettings.id)
    }

    return NextResponse.json(registrationSettings, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300',
      }
    })
  } catch (error) {
    console.error("Registration Settings API: Error fetching registration settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch registration settings: " + (error instanceof Error ? error.message : "Unknown error") },
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
    const { allowRegistration } = body

    // Get existing registration settings or create new
    let registrationSettings = await db.registrationSettings.findFirst()

    if (registrationSettings) {
      // Update existing registration settings
      registrationSettings = await db.registrationSettings.update({
        where: { id: registrationSettings.id },
        data: {
          allowRegistration
        }
      })
    } else {
      // Create new registration settings
      registrationSettings = await db.registrationSettings.create({
        data: {
          allowRegistration
        }
      })
    }

    return NextResponse.json(registrationSettings, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300',
      }
    })
  } catch (error) {
    console.error("Error updating registration settings:", error)
    return NextResponse.json(
      { error: "Failed to update registration settings" },
      { status: 500 }
    )
  }
}
