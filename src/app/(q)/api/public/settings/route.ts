import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Get public settings
    let settings = await db.settings.findFirst({
      select: {
        maintenanceMode: true,
      }
    })

    // Return default settings if none exist
    if (!settings) {
      settings = {
        maintenanceMode: false,
      }
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error("Public Settings API: Error fetching settings:", error)
    // Return default settings on error
    return NextResponse.json({
      maintenanceMode: false,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      }
    })
  }
}
