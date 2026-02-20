"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, User as UserIcon, ChevronRight, FileQuestion, Building2, GraduationCap, Layers, Gamepad2 } from "lucide-react"
import { UserRole } from "@prisma/client"
import { toasts } from "@/lib/toasts"

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

export default function UserActivityPreparePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [isJoiningLobby, setIsJoiningLobby] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    // Check authentication and user role
    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== UserRole.USER) {
      router.push("/")
      return
    }

    fetchActivity()
  }, [session, status, router, params.id])

  const fetchActivity = async () => {
    try {
      const response = await fetch(`/api/user/activity/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setActivity(data)
        // Pre-fill username with the user's name
        if (session?.user?.name) {
          setUsername(session.user.name)
        }
      } else if (response.status === 404) {
        setError("Activity not found")
      } else if (response.status === 401) {
        router.push("/login")
      } else {
        const data = await response.json()
        setError(data.message || "Failed to load activity")
      }
    } catch (error) {
      console.error("Error fetching activity:", error)
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleLobby = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      toasts.error("Please enter your username")
      return
    }

    setIsJoiningLobby(true)

    try {
      // Store username in localStorage for the activity
      localStorage.setItem(`activity_username_${params.id}`, username.trim())
      
      toasts.success("Joined lobby successfully!")
      // Navigate to the actual activity taking page
      // For now, we'll just show a success message
      // In the future, this could navigate to a real activity taking page
      router.push(`/user/activity-take/${params.id}`)
    } catch (error) {
      console.error("Error joining lobby:", error)
      toasts.error("An error occurred while joining the lobby")
    } finally {
      setIsJoiningLobby(false)
    }
  }

  const handleBack = () => {
    router.push("/user/activity")
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleBack} variant="outline" className="rounded-none">
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
        <CardContent className="pt-16 pb-8 px-12">
          <form onSubmit={handleLobby} className="flex flex-col items-center justify-center text-center space-y-6">
            {/* Title */}
            <div className="w-full">
              <h1 className="text-3xl font-bold">{activity.title}</h1>
              {activity.description && (
                <p className="text-muted-foreground mt-2">{activity.description}</p>
              )}
            </div>

            {/* Access Key */}
            {activity.accessKey && (
              <div className="mt-4">
                <p className="text-2xl font-bold font-mono tracking-wider">{activity.accessKey}</p>
              </div>
            )}

            {/* Username Input Card */}
            <div className="w-full max-w-md space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-base font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Username</span>
                  </div>
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-lg"
                  disabled={isJoiningLobby}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  className="shrink-0"
                  disabled={isJoiningLobby}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isJoiningLobby || !username.trim()}
                >
                  {isJoiningLobby ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <span>Lobby</span>
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
