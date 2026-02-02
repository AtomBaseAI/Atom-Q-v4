import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// Public endpoint for registration settings - no authentication required
// GET: Fetch registration settings
// PUT: Update registration settings (publicly accessible for demo purposes)

export async function GET() {
  try {
    console.log("Public Registration Settings API: Attempting to fetch registration settings...")
    
    // Get registration settings, create default if not exists
    let registrationSettings = await db.registrationSettings.findFirst()
    
    if (!registrationSettings) {
      console.log("Public Registration Settings API: No registration settings found, creating defaults...")
      registrationSettings = await db.registrationSettings.create({
        data: {
          allowRegistration: true,
        }
      })
      console.log("Public Registration Settings API: Default registration settings created:", registrationSettings.id)
    } else {
      console.log("Public Registration Settings API: Registration settings found:", registrationSettings.id)
    }
    
    return NextResponse.json(registrationSettings, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error("Public Registration Settings API: Error fetching registration settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch registration settings" + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("Public Registration Settings API: Updating registration settings...")
    
    const body = await request.json()
    const { allowRegistration } = body
    
    // Get existing registration settings or create default
    let registrationSettings = await db.registrationSettings.findFirst()
    
    if (!registrationSettings) {
      console.log("Public Registration Settings API: No registration settings found, creating defaults...")
      registrationSettings = await db.registrationSettings.create({
        data: {
          allowRegistration: true,
        }
      })
      console.log("Public Registration Settings API: Default registration settings created:", registrationSettings.id)
    }
    
    // Update registration settings
    if (allowRegistration !== undefined) {
      registrationSettings = await db.registrationSettings.update({
        where: { id: registrationSettings.id },
        data: {
          allowRegistration
        }
      })
    }
    
    return NextResponse.json(registrationSettings, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error("Public Registration Settings API: Error updating registration settings:", error)
    return NextResponse.json(
      { error: "Failed to update registration settings" + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
}
