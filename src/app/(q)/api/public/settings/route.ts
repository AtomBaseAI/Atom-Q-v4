import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Get public settings
    let settings = await db.settings.findFirst({
      select: {
        siteTitle: true,
        siteDescription: true,
        maintenanceMode: true,
      }
    })

    // Return default settings if none exist
    if (!settings) {
      settings = {
        siteTitle: "Atom Q",
        siteDescription: "Take quizzes and test your knowledge",
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
      siteTitle: "Atom Q",
      siteDescription: "Take quizzes and test your knowledge",
      maintenanceMode: false,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      }
    })
  }
}
