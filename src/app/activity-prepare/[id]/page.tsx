"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Play, ArrowLeft, ChevronRight, FileQuestion, Building2, GraduationCap, Layers } from "lucide-react"
import { UserRole } from "@prisma/client"

interface Activity {
  id: string
  title: string
  description?: string
  campus?: { name: string; id: string }
  department?: { name: string; id: string }
  section: string
  answerTime?: number
  maxDuration?: number
  accessKey?: string
  createdAt: string
  _count: {
    activityQuestions: number
  }
}

export default function ActivityPreparePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return

    // Check authentication and admin role
    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== UserRole.ADMIN) {
      router.push("/")
      return
    }

    fetchActivity()
  }, [session, status, router, params.id])

  const fetchActivity = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setActivity(data)
      } else if (response.status === 404) {
        setError("Activity not found")
      } else if (response.status === 401) {
        router.push("/login")
      } else {
        setError("Failed to load activity")
      }
    } catch (error) {
      console.error("Error fetching activity:", error)
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/admin/activity")} variant="outline" className="rounded-none">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Activities
          </Button>
        </Card>
      </div>
    )
  }

  if (!activity) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 relative">
        {/* Top Left: Campus, Department, Section */}
        <div className="absolute top-4 left-4 flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span>{activity.campus?.name || "General"}</span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            <span>{activity.department?.name || "-"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            <span>{activity.section}</span>
          </div>
        </div>

        {/* Top Right: Question Count */}
        <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-muted-foreground">
          <FileQuestion className="h-3 w-3" />
          <span>{activity._count?.activityQuestions || 0}</span>
        </div>

        {/* Middle Section */}
        <CardContent className="pt-16 pb-20 px-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            {/* Play Icon */}
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Play className="h-8 w-8 text-primary fill-current" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold">{activity.title}</h1>

            {/* Access Key - just the key, no icon/text */}
            {activity.accessKey && (
              <div className="mt-4">
                <p className="text-2xl font-bold font-mono tracking-wider">{activity.accessKey}</p>
              </div>
            )}
          </div>
        </CardContent>

        {/* Bottom Left: Buttons */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Button
            onClick={() => router.push("/admin/activity")}
            variant="outline"
            className="rounded-none"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => router.push(`/admin/activity/${activity.id}/questions`)}
            variant="outline"
            className="rounded-none"
          >
            <span>Lobby</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
