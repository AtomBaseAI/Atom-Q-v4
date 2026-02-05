"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Minimize,
  Maximize,
  Timer,
  AlertTriangle,
  XCircle,
  Shield,
  Lock,
  Calendar,
  Info
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { QuestionType, DifficultyLevel } from "@prisma/client"
import HexagonLoader from "@/components/Loader/Loading"

// ==================== TYPES ====================

interface Question {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string[] | string
  correctAnswer: string
  explanation?: string
  difficulty: DifficultyLevel
  points: number
}

interface Assessment {
  id: string
  title: string
  description: string
  timeLimit: number
  checkAnswerEnabled: boolean
  disableCopyPaste: boolean
  accessKey?: string
  startTime?: string
  campus?: {
    id: string
    name: string
    shortName: string
  }
  maxTabs?: number
}

interface TabSwitchResponse {
  message: string
  currentSwitches: number
  switchesRemaining: number | null
  shouldAutoSubmit: boolean
}

// ==================== CONSTANTS ====================

const TIME_WINDOW_MINUTES = 15
const FULLSCREEN_EXIT_DEBOUNCE_MS = 500
const AUTO_SUBMIT_DELAY_MS = 2000

// ==================== MAIN COMPONENT ====================

export default function AssessmentTakingPage() {
  // ==================== HOOKS ====================
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()

  // ==================== STATE ====================
  
  // Assessment state
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [attemptId, setAttemptId] = useState<string>("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  // Answers state
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [multiSelectAnswers, setMultiSelectAnswers] = useState<Record<string, string[]>>({})
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Access key state
  const [showAccessKeyDialog, setShowAccessKeyDialog] = useState(false)
  const [accessKeyInput, setAccessKeyInput] = useState("")
  const [isExpired, setIsExpired] = useState(false)
  const [expiredMessage, setExpiredMessage] = useState("")
  
  // Tab switching state
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)
  
  // Auto-submit state
  const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false)
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)
  
  // Show answer state
  const [showAnswer, setShowAnswer] = useState<string | null>(null)
  const [checkedAnswers, setCheckedAnswers] = useState<Set<string>>(new Set())

  // ==================== REFS ====================
  
  // Mutable refs for avoiding closure issues
  const assessmentAttemptIdRef = useRef<string>("")
  const answersRef = useRef<Record<string, string>>({})
  const multiSelectAnswersRef = useRef<Record<string, string[]>>({})
  const isSubmittingRef = useRef<boolean>(false)
  const isFullscreenRef = useRef<boolean>(false)
  const assessmentRef = useRef<Assessment | null>(null)
  const tabSwitchCountRef = useRef<number>(0)
  const isAutoSubmittingRef = useRef<boolean>(false)
  const hasInitializedRef = useRef<boolean>(false)
  const fullscreenExitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Refs for elements
  const paginationContainerRef = useRef<HTMLDivElement>(null)

  // ==================== SYNC REFS WITH STATE ====================
  
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    multiSelectAnswersRef.current = multiSelectAnswers
  }, [multiSelectAnswers])

  useEffect(() => {
    isSubmittingRef.current = submitting
  }, [submitting])

  useEffect(() => {
    isFullscreenRef.current = isFullscreen
  }, [isFullscreen])

  useEffect(() => {
    assessmentRef.current = assessment
  }, [assessment])

  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount
  }, [tabSwitchCount])

  useEffect(() => {
    isAutoSubmittingRef.current = isAutoSubmitting
  }, [isAutoSubmitting])

  // ==================== API CALLS ====================

  const fetchMetadata = useCallback(async () => {
    try {
      if (!session || !params.id || hasInitializedRef.current) {
        return
      }

      const response = await fetch(`/api/user/assessment/${params.id}/metadata`)
      
      if (!response.ok) {
        const error = await response.json()
        toasts.error(error.message || "Failed to load assessment")
        setLoading(false)
        return
      }

      const data = await response.json()
      hasInitializedRef.current = true

      // Check start time eligibility
      if (data.assessment.startTime) {
        const startTime = new Date(data.assessment.startTime)
        const now = new Date()
        const diffMs = now.getTime() - startTime.getTime()
        const diffMinutes = diffMs / (1000 * 60)

        if (diffMs < 0) {
          setIsExpired(true)
          setExpiredMessage("Assessment has not started yet")
          setLoading(false)
          return
        }

        if (diffMs > TIME_WINDOW_MINUTES) {
          setIsExpired(true)
          setExpiredMessage(`Assessment is no longer available. It was available until ${TIME_WINDOW_MINUTES} minutes after start time.`)
          setLoading(false)
          return
        }
      }

      // Show access key dialog if required
      if (data.assessment.requiresAccessKey && !data.hasExistingAttempt) {
        setShowAccessKeyDialog(true)
        setAssessment(data.assessment)
        setLoading(false)
      } else {
        // Start assessment directly
        await startAssessment("")
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
      toasts.error("Failed to load assessment")
      setLoading(false)
    }
  }, [session, params.id])

  const startAssessment = useCallback(async (accessKey: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/user/assessment/${params.id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessKey }),
      })

      if (!response.ok) {
        const error = await response.json()
        toasts.error(error.message || "Failed to start assessment")
        setLoading(false)
        
        if (error.message?.includes("not started")) {
          setIsExpired(true)
          setExpiredMessage(error.message)
        }
        return
      }

      const data = await response.json()
      setAssessment(data.assessment)
      setQuestions(data.questions)
      setAttemptId(data.attemptId)
      setTimeRemaining(data.timeRemaining || 0)
      assessmentAttemptIdRef.current = data.attemptId
      
      if (data.tabSwitches !== undefined) {
        setTabSwitchCount(data.tabSwitches)
        tabSwitchCountRef.current = data.tabSwitches
      }

      setLoading(false)
      setShowAccessKeyDialog(false)
      
      toasts.success('Assessment started!')

      // Enter fullscreen mode
      await enterFullscreen()

    } catch (error) {
      console.error("Error starting assessment:", error)
      toasts.error("Failed to start assessment")
      setLoading(false)
    }
  }, [params.id])

  // ==================== FULLSCREEN MANAGEMENT ====================

  const enterFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen && typeof document.documentElement.requestFullscreen === 'function') {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
        isFullscreenRef.current = true
      }
    } catch (error) {
      console.log('Fullscreen request failed:', error)
      // Continue even if fullscreen fails
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
        isFullscreenRef.current = false
      }
    } catch (error) {
      console.log('Fullscreen exit failed:', error)
    }
  }, [])

  const handleFullscreenChange = useCallback(async () => {
    const isNowFullscreen = !!document.fullscreenElement
    setIsFullscreen(isNowFullscreen)
    isFullscreenRef.current = isNowFullscreen

    // If exited fullscreen and assessment is active, record as violation
    if (!isNowFullscreen && assessmentAttemptIdRef.current && !isSubmittingRef.current && !isAutoSubmittingRef.current) {
      await recordFullscreenExit()
    }
  }, [])

  const recordFullscreenExit = useCallback(async () => {
    if (!assessmentAttemptIdRef.current || isSubmittingRef.current || isAutoSubmittingRef.current) {
      return
    }

    // Debounce to avoid multiple recordings
    if (fullscreenExitTimeoutRef.current) {
      clearTimeout(fullscreenExitTimeoutRef.current)
    }

    fullscreenExitTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/user/assessment/${params.id}/tab-switch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ attemptId: assessmentAttemptIdRef.current }),
        })

        if (response.ok) {
          const data = await response.json() as TabSwitchResponse
          setTabSwitchCount(data.currentSwitches)
          tabSwitchCountRef.current = data.currentSwitches

          if (data.shouldAutoSubmit) {
            triggerAutoSubmit()
          } else if (data.switchesRemaining !== null && data.switchesRemaining <= 1) {
            setShowTabSwitchWarning(true)
          } else {
            toasts.warning(`Fullscreen exit detected! Tab switches: ${data.currentSwitches}/${assessmentRef.current?.maxTabs || 3}`)
          }
        }
      } catch (error) {
        console.error("Error recording fullscreen exit:", error)
      }
    }, FULLSCREEN_EXIT_DEBOUNCE_MS)
  }, [params.id])

  // ==================== TAB VISIBILITY TRACKING ====================

  const handleVisibilityChange = useCallback(async () => {
    // Only track if document becomes hidden (user switched away)
    if (document.hidden && assessmentAttemptIdRef.current && !isSubmittingRef.current && !isAutoSubmittingRef.current) {
      await recordTabSwitch()
    }
  }, [])

  const recordTabSwitch = useCallback(async () => {
    if (!assessmentAttemptIdRef.current || isSubmittingRef.current || isAutoSubmittingRef.current) {
      return
    }

    try {
      const response = await fetch(`/api/user/assessment/${params.id}/tab-switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attemptId: assessmentAttemptIdRef.current }),
      })

      if (response.ok) {
        const data = await response.json() as TabSwitchResponse
        setTabSwitchCount(data.currentSwitches)
        tabSwitchCountRef.current = data.currentSwitches

        if (data.shouldAutoSubmit) {
          triggerAutoSubmit()
        } else if (data.switchesRemaining !== null && data.switchesRemaining <= 1) {
          setShowTabSwitchWarning(true)
        } else {
          toasts.warning(`Tab switch detected! ${data.currentSwitches}/${assessmentRef.current?.maxTabs || 3}`)
        }
      }
    } catch (error) {
      console.error("Error recording tab switch:", error)
    }
  }, [params.id])

  // ==================== AUTO-SUBMIT ====================

  const triggerAutoSubmit = useCallback(() => {
    if (isSubmittingRef.current || isAutoSubmittingRef.current) {
      return
    }

    setIsAutoSubmitting(true)
    isAutoSubmittingRef.current = true
    setShowAutoSubmitWarning(true)

    toasts.error("Maximum violations reached! Auto-submitting in 2 seconds...")

    setTimeout(() => {
      handleSubmit()
    }, AUTO_SUBMIT_DELAY_MS)
  }, [])

  // ==================== TIMER MANAGEMENT ====================

  useEffect(() => {
    if (timeRemaining > 0 && !submitting && !isAutoSubmitting) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            // Time's up - trigger auto-submit
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            setIsAutoSubmitting(true)
            isAutoSubmittingRef.current = true
            setShowAutoSubmitWarning(true)
            toasts.info("Time is up! Auto-submitting...")
            
            setTimeout(() => {
              handleSubmit()
            }, AUTO_SUBMIT_DELAY_MS)
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timeRemaining, submitting, isAutoSubmitting])

  // ==================== EVENT LISTENERS ====================

  useEffect(() => {
    // Fullscreen change listener
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    // Visibility change listener (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      if (fullscreenExitTimeoutRef.current) {
        clearTimeout(fullscreenExitTimeoutRef.current)
        fullscreenExitTimeoutRef.current = null
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [handleFullscreenChange, handleVisibilityChange])

  // ==================== COPY-PASTE & SECURITY ====================

  useEffect(() => {
    if (!assessment || !attemptId) {
      return
    }

    const handleCopy = (e: Event) => {
      if (assessment.disableCopyPaste) {
        e.preventDefault()
        toasts.warning("Copy is disabled during assessment")
      }
    }

    const handlePaste = (e: Event) => {
      if (assessment.disableCopyPaste) {
        e.preventDefault()
        toasts.warning("Paste is disabled during assessment")
      }
    }

    const handleCut = (e: Event) => {
      if (assessment.disableCopyPaste) {
        e.preventDefault()
        toasts.warning("Cut is disabled during assessment")
      }
    }

    const handleContextMenu = (e: Event) => {
      e.preventDefault()
      toasts.warning("Context menu is disabled during assessment")
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common developer tools shortcuts
      const blockedKeys = [
        // F12
        e.key === 'F12',
        // Ctrl+Shift+I (DevTools)
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i'),
        // Ctrl+Shift+J (Console)
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j'),
        // Ctrl+Shift+C (Element picker)
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c'),
        // Ctrl+U (View Source)
        (e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u'),
        // Ctrl+Shift+U (View Source in some browsers)
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'U' || e.key === 'u'),
      ]

      if (blockedKeys.some(Boolean)) {
        e.preventDefault()
        e.stopPropagation()
        toasts.warning("This action is disabled during assessment")
      }
    }

    // Add event listeners
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCut)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [assessment, attemptId])

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  // ==================== NAVIGATION ====================

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [currentQuestionIndex, questions.length])

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [currentQuestionIndex])

  const goToQuestion = useCallback((index: number) => {
    setCurrentQuestionIndex(index)
  }, [])

  // ==================== ANSWER HANDLERS ====================

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    if (checkedAnswers.has(questionId)) {
      return
    }
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }, [checkedAnswers])

  const handleMultiSelectAnswerChange = useCallback((questionId: string, option: string, checked: boolean) => {
    if (checkedAnswers.has(questionId)) {
      return
    }

    setMultiSelectAnswers(prev => {
      const currentAnswers = prev[questionId] || []
      let newAnswers: string[]
      
      if (checked) {
        newAnswers = [...currentAnswers, option]
      } else {
        newAnswers = currentAnswers.filter(ans => ans !== option)
      }

      return { ...prev, [questionId]: newAnswers }
    })
  }, [checkedAnswers])

  // ==================== CHECK ANSWER ====================

  const handleCheckAnswer = useCallback((questionId: string) => {
    if (showAnswer === questionId) {
      setShowAnswer(null)
    } else {
      setShowAnswer(questionId)
      setCheckedAnswers(prev => new Set(prev).add(questionId))
    }
  }, [showAnswer])

  // ==================== SUBMIT ====================

  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) {
      return
    }

    // Skip validation for auto-submit
    if (!isAutoSubmittingRef.current) {
      const unansweredQuestions = questions.filter(q => !answersRef.current[q.id] && !multiSelectAnswersRef.current[q.id]?.length)
      if (unansweredQuestions.length > 0) {
        toasts.error("Please answer all questions before submitting")
        return
      }
    }

    setSubmitting(true)
    isSubmittingRef.current = true

    try {
      const response = await fetch(`/api/user/assessment/${params.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId: assessmentAttemptIdRef.current,
          answers: {
            ...answersRef.current,
            ...Object.keys(multiSelectAnswersRef.current).reduce((acc, questionId) => {
              const selectedOptions = multiSelectAnswersRef.current[questionId]
              if (selectedOptions && selectedOptions.length > 0) {
                acc[questionId] = selectedOptions.join('|')
              }
              return acc
            }, {} as Record<string, string>),
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toasts.error(error.message || "Failed to submit assessment")
        return
      }

      const result = await response.json()
      toasts.success(`Assessment submitted! Score: ${result.score}%`)

      // Exit fullscreen
      await exitFullscreen()

      // Navigate to result page
      router.push(`/user/assessment/${params.id}/result?attemptId=${assessmentAttemptIdRef.current}`)
    } catch (error) {
      console.error("Error submitting assessment:", error)
      toasts.error("Failed to submit assessment")
    } finally {
      setSubmitting(false)
      isSubmittingRef.current = false
      setIsAutoSubmitting(false)
      isAutoSubmittingRef.current = false
      setShowAutoSubmitWarning(false)
    }
  }, [params.id, questions, router, exitFullscreen])

  // ==================== ACCESS KEY HANDLER ====================

  const handleAccessKeySubmit = useCallback(async () => {
    const key = accessKeyInput.trim()
    if (!key) {
      toasts.error("Please enter an access key")
      return
    }
    await startAssessment(key)
  }, [accessKeyInput, startAssessment])

  // ==================== FORMATTING ====================

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  const getTimeColor = useMemo(() => {
    const totalTime = (assessment?.timeLimit || 0) * 60
    const percentage = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0
    
    if (percentage > 50) return "text-green-500"
    if (percentage > 20) return "text-yellow-500"
    return "text-red-500"
  }, [timeRemaining, assessment?.timeLimit])

  // ==================== SCROLL TO ACTIVE QUESTION ====================

  const scrollToActiveQuestion = useCallback(() => {
    const container = paginationContainerRef.current
    if (!container) return

    const activeButton = container.querySelector(`[data-question-index="${currentQuestionIndex}"]`) as HTMLElement
    if (!activeButton) return

    const containerRect = container.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()

    const scrollLeft = buttonRect.left - containerRect.left - (containerRect.width / 2) + (buttonRect.width / 2)

    container.scrollTo({
      left: container.scrollLeft + scrollLeft,
      behavior: 'smooth'
    })
  }, [currentQuestionIndex])

  useEffect(() => {
    scrollToActiveQuestion()
  }, [scrollToActiveQuestion])

  // ==================== COMPUTED VALUES ====================

  const currentQuestion = questions[currentQuestionIndex]
  const progress = useMemo(() => {
    if (questions.length === 0) return 0
    return ((currentQuestionIndex + 1) / questions.length) * 100
  }, [questions.length, currentQuestionIndex])

  const isLastQuestion = useMemo(() => {
    return currentQuestionIndex === questions.length - 1
  }, [currentQuestionIndex, questions.length])

  const switchesRemaining = useMemo(() => {
    if (!assessment?.maxTabs) return null
    return Math.max(0, assessment.maxTabs - tabSwitchCount)
  }, [assessment?.maxTabs, tabSwitchCount])

  // ==================== RENDER HELPERS ====================

  if (loading && !assessment) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <HexagonLoader size={120} />
      </div>
    )
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Assessment Unavailable</h2>
                <p className="text-muted-foreground">{expiredMessage}</p>
              </div>
              <Button onClick={() => router.back()} variant="outline" className="w-full">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Assessment Not Found</h2>
                <p className="text-muted-foreground">The assessment you're looking for doesn't exist or you don't have access.</p>
              </div>
              <Button onClick={() => router.back()} variant="outline" className="w-full">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className={`min-h-screen bg-background dark:bg-background ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Header */}
      <Card className="mb-6 bg-card/90 dark:bg-card/90 backdrop-blur-sm shadow-lg border border-border/50">
        <CardContent className="p-4 space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/user/assessment")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <h1 className="text-lg font-bold truncate max-w-md">{assessment.title}</h1>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-primary/10 text-primary dark:bg-sidebar-primary/10 dark:text-sidebar-primary-foreground">
                {assessment.campus?.shortName || assessment.campus?.name || 'General'}
              </Badge>
              {isFullscreen ? (
                <Button variant="ghost" size="icon" onClick={exitFullscreen}>
                  <Minimize className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={enterFullscreen}>
                  <Maximize className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Timer and progress */}
          <div className="flex items-center justify-center space-x-4">
            <Timer className={`h-5 w-5 ${getTimeColor}`} />
            <span className={`text-lg font-mono font-bold ${getTimeColor}`}>
              {formatTime(timeRemaining)}
            </span>
            {switchesRemaining !== null && (
              <Badge variant={switchesRemaining <= 1 ? "destructive" : "outline"} className="ml-2">
                <Shield className="h-3 w-3 mr-1" />
                {switchesRemaining} left
              </Badge>
            )}
          </div>

          <Progress value={progress} className="h-2" />

          <Button
            onClick={handleSubmit}
            disabled={submitting || isAutoSubmitting}
            className="w-full"
          >
            {submitting ? "Submitting..." : isAutoSubmitting ? "Auto-submitting..." : "Submit Assessment"}
          </Button>
        </CardContent>
      </Card>

      {/* Main Question Card */}
      {currentQuestion && (
        <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm shadow-xl border border-border/50">
          <CardContent className="space-y-6 p-6">
            {/* Question Header */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <Badge variant="outline" className="bg-primary/10 text-primary dark:bg-sidebar-primary/10 dark:text-sidebar-primary-foreground">
                {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
              </Badge>
            </div>

            {/* Question Content */}
            <div className="space-y-4">
              <CardTitle>
                <RichTextDisplay content={currentQuestion.content} />
              </CardTitle>

              {/* Multiple Choice & True/False */}
              {(currentQuestion.type === QuestionType.MULTIPLE_CHOICE || currentQuestion.type === QuestionType.TRUE_FALSE) && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  disabled={checkedAnswers.has(currentQuestion.id)}
                >
                  {currentQuestion.options.map((option: string, index: number) => {
                    const isSelected = answers[currentQuestion.id] === option
                    const isCorrect = showAnswer === currentQuestion.id && option === currentQuestion.correctAnswer
                    const isLocked = checkedAnswers.has(currentQuestion.id)

                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        } ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''} ${
                          isLocked ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                      >
                        <RadioGroupItem 
                          value={option} 
                          id={`option-${index}`} 
                          disabled={isLocked}
                        />
                        <Label 
                          htmlFor={`option-${index}`} 
                          className={`cursor-pointer flex-1 text-base ${isLocked ? 'cursor-not-allowed' : ''}`}
                        >
                          {option}
                        </Label>
                        {isCorrect && showAnswer === currentQuestion.id && (
                          <Check className="h-5 w-5 text-green-500 ml-2" />
                        )}
                      </div>
                    )
                  })}
                </RadioGroup>
              )}

              {/* Fill in Blank */}
              {currentQuestion.type === QuestionType.FILL_IN_BLANK && (
                <Input
                  type="text"
                  placeholder="Enter your answer..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  disabled={checkedAnswers.has(currentQuestion.id)}
                  className="w-full"
                />
              )}

              {/* Multi-Select */}
              {currentQuestion.type === QuestionType.MULTI_SELECT && (
                <div className="flex flex-wrap gap-3">
                  {currentQuestion.options.map((option: string, index: number) => {
                    const isSelected = multiSelectAnswers[currentQuestion.id]?.includes(option)
                    const isLocked = checkedAnswers.has(currentQuestion.id)

                    return (
                      <Badge
                        key={index}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'hover:bg-primary/90 dark:hover:bg-sidebar-primary/90'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !isLocked && handleMultiSelectAnswerChange(currentQuestion.id, option, !isSelected)}
                      >
                        {option}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Question Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAnswer(showAnswer === currentQuestion.id ? null : currentQuestion.id)}
                  title={showAnswer === currentQuestion.id ? "Hide Answer" : "Show Answer"}
                >
                  {showAnswer === currentQuestion.id ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCheckAnswer(currentQuestion.id)}
                  title="Mark as checked"
                >
                  <Check className={`h-5 w-5 ${checkedAnswers.has(currentQuestion.id) ? 'text-green-500' : 'text-muted-foreground'}`} />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextQuestion}
                  disabled={isLastQuestion || checkedAnswers.has(currentQuestion.id)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Navigation */}
      {currentQuestion && (
        <div ref={paginationContainerRef} className="flex items-center justify-center gap-2 py-6 overflow-x-auto">
          {questions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "default" : "outline"}
              size="icon"
              data-question-index={index}
              onClick={() => goToQuestion(index)}
              className="flex-shrink-0"
            >
              {index + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Access Key Dialog */}
      <Dialog open={showAccessKeyDialog} onOpenChange={setShowAccessKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Enter Assessment Access Key
            </DialogTitle>
            <DialogDescription>
              This assessment requires an access key to start.
              {assessment?.startTime && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">Start Time Eligibility</p>
                      <p className="text-muted-foreground">
                        You can start this assessment within {TIME_WINDOW_MINUTES} minutes of the start time.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Start Time: {new Date(assessment.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {assessment?.timeLimit && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Time Limit: {assessment.timeLimit} minutes
                </p>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="accessKey">Access Key</Label>
              <Input
                id="accessKey"
                type="password"
                value={accessKeyInput}
                onChange={(e) => setAccessKeyInput(e.target.value)}
                placeholder="Enter the access key provided by your instructor"
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && accessKeyInput.trim()) {
                    e.preventDefault()
                    handleAccessKeySubmit()
                  }
                }}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAccessKeySubmit}
                disabled={!accessKeyInput.trim()}
              >
                Start Assessment
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tab Switch Warning */}
      <AnimatePresence>
        {showTabSwitchWarning && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50"
          >
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Violation Detected!</p>
                  <p className="text-sm text-muted-foreground">
                    You have used {tabSwitchCount} of {assessment?.maxTabs || 3} allowed violations.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Further violations will result in auto-submission.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowTabSwitchWarning(false)}
                    className="mt-2"
                  >
                    Got it, I'll stay focused
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-submit Warning */}
      <AnimatePresence>
        {showAutoSubmitWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-4 flex items-center justify-center z-50"
          >
            <Card className="w-full max-w-md bg-red-50 dark:bg-red-900/20 border-red-500">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <Timer className="h-16 w-16 text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-red-500">Auto-Submitting!</h2>
                    <p className="text-muted-foreground">
                      You have exceeded the allowed violations or time limit.
                      Your assessment is being submitted automatically.
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-md w-full">
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      <p className="text-left">
                        Please wait while we submit your answers...
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
