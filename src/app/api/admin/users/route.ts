import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        campus: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { importData, ...userData } = body

    // Handle bulk import
    if (importData && Array.isArray(importData)) {
      const results = []
      const defaultPassword = "user@atomq"
      const hashedPassword = await bcrypt.hash(defaultPassword, 12)

      for (const item of importData) {
        try {
          // Skip if required fields are missing
          if (!item.name || !item.email) {
            results.push({ 
              email: item.email || 'unknown', 
              status: 'failed', 
              message: 'Missing required fields (name, email)' 
            })
            continue
          }

          // Check if user already exists
          const existingUser = await db.user.findUnique({
            where: { email: item.email }
          })

          if (existingUser) {
            results.push({ 
              email: item.email, 
              status: 'failed', 
              message: 'User already exists' 
            })
            continue
          }

          // Create user with default password
          const user = await db.user.create({
            data: {
              name: item.name,
              email: item.email,
              password: hashedPassword,
              phone: item.phone || null,
              campus: item.campus || null,
              role: item.role || UserRole.USER,
              isActive: item.isActive !== false, // Default to true if not specified
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              phone: true,
              campus: true,
              createdAt: true,
            }
          })

          results.push({ 
            email: item.email, 
            status: 'success', 
            user,
            message: 'User created successfully' 
          })
        } catch (error) {
          console.error('Error importing user:', error)
          results.push({ 
            email: item.email || 'unknown', 
            status: 'failed', 
            message: 'Internal server error' 
          })
        }
      }

      const successCount = results.filter(r => r.status === 'success').length
      const failureCount = results.filter(r => r.status === 'failed').length

      return NextResponse.json({
        message: `Import completed: ${successCount} users created, ${failureCount} failed`,
        results,
        successCount,
        failureCount
      })
    }

    // Handle single user creation
    const { name, email, password, phone, campus, role, isActive } = userData

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        campus: campus || null,
        role: role || UserRole.USER,
        isActive: isActive !== false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        campus: true,
        createdAt: true,
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}