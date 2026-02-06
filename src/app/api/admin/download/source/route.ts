import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import { execSync } from "child_process"
import { readFileSync, unlinkSync, existsSync } from "fs"
import { join } from "path"

export async function GET() {
  let zipFilePath = ""
  
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create a timestamp for the zip filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const zipFileName = `atom-q-source-${timestamp}.zip`
    zipFilePath = join(process.cwd(), zipFileName)

    // Create zip file with simpler command
    const command = `zip -r "${zipFileName}" src/ prisma/ skills/ package.json tsconfig.json next.config.ts tailwind.config.ts components.json eslint.config.mjs postcss.config.mjs middleware.ts bun.lock README.md context.txt -x "*.log" "*.tmp" "*.temp"`

    try {
      const result = execSync(command, {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 120000 // 2 minute timeout
      })
    } catch (execError) {
      console.error("❌ Zip command failed:", execError)
      throw new Error(`Zip command failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`)
    }
    
    // Check if zip file exists
    if (!existsSync(zipFilePath)) {
      throw new Error("Zip file was not created")
    }

    // Read zip file
    const zipBuffer = readFileSync(zipFilePath)
    
    if (zipBuffer.length === 0) {
      console.error("❌ Created zip file is empty")
      throw new Error("Created zip file is empty")
    }

    // Clean up the zip file
    try {
      unlinkSync(zipFilePath)
    } catch (cleanupError) {
      console.error("⚠️ Error cleaning up zip file:", cleanupError)
    }

    // Return the zip file as response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': zipBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error("❌ Error in download endpoint:", error)
    
    // Clean up on error
    if (zipFilePath && existsSync(zipFilePath)) {
      try {
        unlinkSync(zipFilePath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create source code archive",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}