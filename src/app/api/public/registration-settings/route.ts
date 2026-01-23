import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    console.log("Public Registration Settings API: Fetching registration settings...")

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
        'CDN-Cache-Control': 'public, max-age=300',
      }
    })
  } catch (error) {
    console.error("Public Registration Settings API: Error fetching registration settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch registration settings: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
}
