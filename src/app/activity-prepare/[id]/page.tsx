"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Play, ArrowLeft, ChevronRight, FileQuestion, Building2, GraduationCap, Layers, Users } from "lucide-react"
import { UserRole } from "@prisma/client"
import { PartyKitClient, User, Question, getUserIconUrl } from "@/lib/partykit-client"
import { Lobby } from "@/components/activity/lobby"
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

interface ActivityQuestion {
  id: string
  order: number
  points: number
  question: {
    id: string
    content: string
    type: string
    options: string
    correctAnswer: string
  }
}

type View = 'prepare' | 'lobby'

export default function ActivityPreparePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [questions, setQuestions] = useState<ActivityQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('prepare')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // PartyKit state
  const [users, setUsers] = useState<User[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const partyKitClientRef = useRef<PartyKitClient | null>(null)

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
    fetchQuestions()
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

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${params.id}/questions`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const handleJoinLobby = async () => {
    if (!activity?.accessKey || !session?.user) {
      toasts.error("Missing activity information")
      return
    }

    if (questions.length === 0) {
      toasts.error("Please add questions to the activity first")
      return
    }

    console.log('[Admin] Attempting to join lobby with access key:', activity.accessKey)

    try {
      // Initialize PartyKit client
      const client = new PartyKitClient(activity.accessKey)
      partyKitClientRef.current = client

      await client.connect({
        onOpen: () => {
          console.log('[Admin] Connected to PartyKit')
          setIsConnected(true)
          // Join lobby as admin
          client.joinLobby(
            session.user.id,
            session.user.name || 'Game Master',
            '1', // Use admin icon (you can customize this)
            'ADMIN'
          )
        },
        onError: (error) => {
          console.error('[Admin] PartyKit error:', error)
          const errorMsg = error instanceof Error ? error.message : 'Failed to connect to game server'

          // Provide more specific guidance
          if (errorMsg.includes('timeout') || errorMsg.includes('not accessible')) {
            toasts.error(`Connection failed: ${errorMsg}. Please check if the PartyKit server is running.`)
          } else if (errorMsg.includes('network')) {
            toasts.error(`Network error: ${errorMsg}. Please check your internet connection.`)
          } else {
            toasts.error(`Connection error: ${errorMsg}`)
          }

          setIsConnected(false)
        },
        onClose: () => {
          console.log('[Admin] Disconnected from PartyKit')
          setIsConnected(false)
        },
        onUserUpdate: (updatedUsers: User[]) => {
          console.log('[Admin] User update:', updatedUsers.length, 'users')
          setUsers(updatedUsers)
        },
        onAdminConfirmed: () => {
          console.log('[Admin] Admin privileges confirmed')
        },
        onQuestionStart: (question: Question) => {
          console.log('[Admin] Question started:', question.questionIndex)
          setQuizStarted(true)
          // Navigate to quiz view when first question starts
          // router.push(`/admin/activity/${params.id}/live`)
        },
        onQuizEnd: (payload) => {
          console.log('[Admin] Quiz ended')
          setQuizStarted(false)
          toasts.success('Quiz completed!')
        },
      })

      setView('lobby')
    } catch (error) {
      console.error('Error joining lobby:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to join lobby'
      toasts.error(`Connection failed: ${errorMsg}`)
      setIsConnected(false)
    }
  }

  const handleStartQuiz = () => {
    if (!partyKitClientRef.current) {
      toasts.error('Not connected to game server')
      return
    }

    // Convert questions to PartyKit format
    const partyKitQuestions: Question[] = questions.map((aq, index) => {
      const options = JSON.parse(aq.question.options)
      return {
        id: aq.question.id,
        question: aq.question.content,
        options: Array.isArray(options) ? options : [],
        duration: activity?.answerTime || 15,
        questionIndex: index + 1,
        totalQuestions: questions.length,
        correctAnswer: parseInt(aq.question.correctAnswer),
      }
    })

    const success = partyKitClientRef.current.startQuiz(partyKitQuestions)

    if (success) {
      toasts.success('Quiz started!')
    } else {
      toasts.error('Failed to start quiz')
    }
  }

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Cleanup PartyKit connection on unmount
  useEffect(() => {
    return () => {
      if (partyKitClientRef.current) {
        partyKitClientRef.current.disconnect()
      }
    }
  }, [])

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

  // Lobby view
  if (view === 'lobby') {
    return (
      <Lobby
        activityKey={activity.accessKey!}
        users={users}
        currentUserRole="ADMIN"
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onStartQuiz={handleStartQuiz}
      />
    )
  }

  // Prepare view
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

            {/* Access Key */}
            {activity.accessKey && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Activity Code</p>
                <p className="text-2xl font-bold font-mono tracking-wider">{activity.accessKey}</p>
              </div>
            )}

            {/* Connection Status (for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-2 bg-muted rounded text-xs">
                <p className="font-mono">PartyKit URL: wss://atomq-quiz-partykit-server.atombaseai.partykit.dev/{activity.accessKey}</p>
                <p className="font-mono mt-1">Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
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
            onClick={handleJoinLobby}
            variant="outline"
            className="rounded-none"
          >
            <Users className="h-4 w-4 mr-2" />
            <span>Lobby</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
