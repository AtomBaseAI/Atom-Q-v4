import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import { createReadStream, createWriteStream, readdirSync, statSync, existsSync } from "fs"
import { join, relative, extname } from "path"
import { create } from 'archiver'
import { pipeline } from 'stream/promises'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const zipFileName = `atom-q-source-${timestamp}.zip`
    
    // Create an archive
    const archive = create('zip', { zlib: { level: 9 } })
    
    // Collect all files to be zipped
    const filesToInclude: string[] = []
    const excludePatterns = [
      'node_modules',
      '.git',
      '.next',
      'out',
      'dist',
      'build',
      '.DS_Store',
      '__MACOSX'
    ]
    
    const excludeExtensions = ['.log', '.tmp', '.temp']
    
    function collectFiles(dir: string, baseDir: string = dir) {
      try {
        const items = readdirSync(dir)
        
        for (const item of items) {
          const fullPath = join(dir, item)
          const relativePath = relative(baseDir, fullPath)
          
          // Skip excluded directories
          if (excludePatterns.some(pattern => relativePath.includes(pattern))) {
            continue
          }
          
          // Skip excluded extensions
          if (excludeExtensions.some(ext => relativePath.endsWith(ext))) {
            continue
          }
          
          const stat = statSync(fullPath)
          
          if (stat.isDirectory()) {
            collectFiles(fullPath, baseDir)
          } else {
            filesToInclude.push(fullPath)
          }
        }
      } catch (error) {
        console.warn("Warning: Could not read directory:", dir, error)
      }
    }
    
    collectFiles(process.cwd())
    
    // Convert archive to buffer
    const chunks: Buffer[] = []
    
    archive.on('data', (chunk) => {
      chunks.push(chunk)
    })
    
    archive.on('end', () => {
      // Archive completed
    })
    
    archive.on('error', (error) => {
      console.error('Archive error:', error)
    })
    
    // Add files to archive
    for (const filePath of filesToInclude) {
      try {
        const relativePath = relative(process.cwd(), filePath)
        archive.file(filePath, { name: relativePath })
      } catch (error) {
        console.warn("Warning: Could not add file to archive:", filePath, error)
      }
    }
    
    // Finalize the archive
    archive.finalize()
    
    // Wait for archive to complete
    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve())
      archive.on('error', reject)
    })
    
    // Combine chunks into final buffer
    const zipBuffer = Buffer.concat(chunks)
    
    if (zipBuffer.length === 0) {
      throw new Error("Created archive is empty")
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
    console.error("Error in download endpoint:", error)
    return NextResponse.json(
      { 
        error: "Failed to create source code archive",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}