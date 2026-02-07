"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
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
  Info,
  Send
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
  options: string[]
  correctAnswer: string
  explanation?: string
  difficulty: DifficultyLevel
  points: number
  order: number
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
const FULLSCREEN_EXIT_DEBOUNCE_MS = 1000
const AUTO_SUBMIT_DELAY_MS = 2000

// ==================== MAIN COMPONENT ====================

export default function AssessmentTakingPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()

  // ==================== STATE ====================
  
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [attemptId, setAttemptId] = useState<string>("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [multiSelectAnswers, setMultiSelectAnswers] = useState<Record<string, string[]>>({})
  
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const [showAccessKeyDialog, setShowAccessKeyDialog] = useState(false)
  const [accessKeyInput, setAccessKeyInput] = useState("")
  const [isExpired, setIsExpired] = useState(false)
  const [expiredMessage, setExpiredMessage] = useState("")
  
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [switchesRemaining, setSwitchesRemaining] = useState<number | null>(null)
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)

  const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false)
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)

  const [showFullscreenExitModal, setShowFullscreenExitModal] = useState(false)

  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [submitConfirmation, setSubmitConfirmation] = useState("")

  const [showAnswer, setShowAnswer] = useState<string | null>(null)
  const [checkedAnswers, setCheckedAnswers] = useState<Set<string>>(new Set())

  // ==================== REFS ====================
  
  const assessmentAttemptIdRef = useRef<string>("")
  const answersRef = useRef<Record<string, string>>({})
  const multiSelectAnswersRef = useRef<Record<string, string[]>>({})
  const isSubmittingRef = useRef<boolean>(false)
  const isAutoSubmittingRef = useRef<boolean>(false)
  const assessmentRef = useRef<Assessment | null>(null)
  const tabSwitchCountRef = useRef<number>(0)
  const hasInitializedRef = useRef<boolean>(false)
  const fullscreenExitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const securityCheckRef = useRef<NodeJS.Timeout | null>(null)
  const tabSwitchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastFullscreenStateRef = useRef<boolean>(false)
  const devToolsWarningShownRef = useRef<boolean>(false)

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

      setAssessment(data.assessment)

      // Always require access key if assessment has one, even for continuing attempts
      if (data.assessment.accessKey) {
        setShowAccessKeyDialog(true)
        setLoading(false)
      } else if (data.hasExistingAttempt) {
        // No access key required, continue existing attempt
        await startAssessment("")
      } else {
        // No access key required, start new attempt
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
      setQuestions(data.questions || [])
      setAttemptId(data.attemptId)
      setTimeRemaining(data.timeRemaining || 0)
      assessmentAttemptIdRef.current = data.attemptId
      
      if (data.tabSwitches !== undefined) {
        setTabSwitchCount(data.tabSwitches)
        tabSwitchCountRef.current = data.tabSwitches
      }
      if (data.switchesRemaining !== undefined) {
        setSwitchesRemaining(data.switchesRemaining)
      }

      setLoading(false)
      setShowAccessKeyDialog(false)
      
      toasts.success('Assessment started!')

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
        lastFullscreenStateRef.current = true
      }
    } catch (error) {
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
        lastFullscreenStateRef.current = false
      }
    } catch (error) {
    }
  }, [])

  const handleFullscreenChange = useCallback(() => {
    const isNowFullscreen = !!document.fullscreenElement
    setIsFullscreen(isNowFullscreen)

    // Detect exit (was fullscreen, now not)
    if (lastFullscreenStateRef.current && !isNowFullscreen) {
      lastFullscreenStateRef.current = false

      if (assessmentAttemptIdRef.current && !isSubmittingRef.current && !isAutoSubmittingRef.current) {
        // Show fullscreen exit modal instead of directly recording the exit
        setShowFullscreenExitModal(true)
      }
    }

    lastFullscreenStateRef.current = isNowFullscreen
  }, [])

  const recordFullscreenExit = useCallback(async () => {
    if (!assessmentAttemptIdRef.current || isSubmittingRef.current || isAutoSubmittingRef.current) {
      return
    }

    // Debounce to avoid multiple recordings
    if (tabSwitchDebounceRef.current) {
      clearTimeout(tabSwitchDebounceRef.current)
    }

    tabSwitchDebounceRef.current = setTimeout(async () => {
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
          setSwitchesRemaining(data.switchesRemaining)

          if (data.shouldAutoSubmit) {
            triggerAutoSubmit()
          } else if (data.switchesRemaining !== null && data.switchesRemaining <= 1) {
            setShowTabSwitchWarning(true)
          } else {
            toasts.warning(`Fullscreen exit detected! Violations: ${data.currentSwitches}/${assessmentRef.current?.maxTabs || 3}`)
          }
        }
      } catch (error) {
        console.error("Error recording fullscreen exit:", error)
      }
      tabSwitchDebounceRef.current = null
    }, FULLSCREEN_EXIT_DEBOUNCE_MS)
  }, [params.id])

  const handleFullscreenExitContinue = useCallback(async () => {
    // Close the modal
    setShowFullscreenExitModal(false)

    // Request fullscreen
    await enterFullscreen()

    // Record the fullscreen exit violation after enabling fullscreen
    await recordFullscreenExit()
  }, [enterFullscreen, recordFullscreenExit])

  // ==================== SUBMISSION ====================

  const handleSubmit = useCallback(async (isAutoSubmitted: boolean = false) => {
    if (isSubmittingRef.current || isAutoSubmittingRef.current || !attemptId) {
      return
    }

    setSubmitting(true)
    isSubmittingRef.current = true

    try {
      const allAnswers: Record<string, string> = { ...answers }
      Object.entries(multiSelectAnswers).forEach(([questionId, selectedOptions]) => {
        allAnswers[questionId] = JSON.stringify(selectedOptions.sort())
      })

      const response = await fetch(`/api/user/assessment/${params.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId,
          answers: allAnswers,
          isAutoSubmitted,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (isAutoSubmitted) {
          toasts.error(`Assessment auto-submitted due to violations! Score: ${data.score}%`)
          // Redirect to assessment list instead of result page
          router.push('/user/assessment')
        } else {
          toasts.success(`Assessment submitted! Score: ${data.score}%`)
          router.push(`/user/assessment/${params.id}/result`)
        }
      } else {
        const error = await response.json()
        toasts.error(error.message || "Failed to submit assessment")
      }
    } catch (error) {
      console.error("Error submitting assessment:", error)
      toasts.error("Failed to submit assessment")
    } finally {
      setSubmitting(false)
      isSubmittingRef.current = false
    }
  }, [attemptId, answers, multiSelectAnswers, params.id, router])

  const handleConfirmSubmit = useCallback(async () => {
    setShowSubmitDialog(false)
    setSubmitConfirmation("")
    await handleSubmit()
  }, [handleSubmit])

  // ==================== TAB VISIBILITY TRACKING ====================

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && assessmentAttemptIdRef.current && !isSubmittingRef.current && !isAutoSubmittingRef.current) {
      recordTabSwitch()
    }
  }, [])

  const recordTabSwitch = useCallback(async () => {
    if (!assessmentAttemptIdRef.current || isSubmittingRef.current || isAutoSubmittingRef.current) {
      return
    }

    // Debounce to avoid multiple recordings
    if (tabSwitchDebounceRef.current) {
      clearTimeout(tabSwitchDebounceRef.current)
    }

    tabSwitchDebounceRef.current = setTimeout(async () => {
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
          setSwitchesRemaining(data.switchesRemaining)

          if (data.shouldAutoSubmit) {
            triggerAutoSubmit()
          } else if (data.switchesRemaining !== null && data.switchesRemaining <= 1) {
            setShowTabSwitchWarning(true)
          } else {
            toasts.warning(`Tab switch detected! Violations: ${data.currentSwitches}/${assessmentRef.current?.maxTabs || 3}`)
          }
        }
      } catch (error) {
        console.error("Error recording tab switch:", error)
      }
      tabSwitchDebounceRef.current = null
    }, FULLSCREEN_EXIT_DEBOUNCE_MS)
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
      handleSubmit(true) // Pass true for isAutoSubmitted
    }, AUTO_SUBMIT_DELAY_MS)
  }, [handleSubmit])

  // ==================== TIMER MANAGEMENT ====================

  useEffect(() => {
    if (timeRemaining > 0 && !submitting && !isAutoSubmitting) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null

            setIsAutoSubmitting(true)
            isAutoSubmittingRef.current = true
            setShowAutoSubmitWarning(true)
            toasts.info("Time is up! Auto-submitting...")

            setTimeout(() => {
              handleSubmit(true) // Time expiry should also be marked as auto-submitted
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
  }, [timeRemaining, submitting, isAutoSubmitting, handleSubmit])

  // ==================== EVENT LISTENERS ====================

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      
      if (fullscreenExitTimeoutRef.current) {
        clearTimeout(fullscreenExitTimeoutRef.current)
      }
      if (tabSwitchDebounceRef.current) {
        clearTimeout(tabSwitchDebounceRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (securityCheckRef.current) {
        clearInterval(securityCheckRef.current)
      }
    }
  }, [handleFullscreenChange, handleVisibilityChange])

  // ==================== SECURITY FEATURES ====================

  const handleContextMenu = useCallback((e: Event) => {
    if (assessment?.disableCopyPaste) {
      e.preventDefault()
    }
  }, [assessment])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!assessment?.disableCopyPaste) return
    
    const blockedKeys = [
      'F12',
      'Ctrl+Shift+I',
      'Ctrl+Shift+J',
      'Ctrl+Shift+C',
      'Ctrl+Shift+U',
      'Ctrl+U',
      'Ctrl+Shift+D',
      'Ctrl+I',
      'Ctrl+J',
      'Ctrl+D',
      'Ctrl+S',
      'Ctrl+P',
    ]

    const key = e.key
    const ctrlKey = e.ctrlKey || e.metaKey
    const shiftKey = e.shiftKey
    const altKey = e.altKey

    const keyCombo = `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${altKey ? 'Alt+' : ''}${key}`

    if (blockedKeys.includes(keyCombo) || key === 'F12') {
      e.preventDefault()
      toasts.warning("This action is not allowed during the assessment")
    }

    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(key.toLowerCase())) {
      e.preventDefault()
      toasts.warning("Copy/Paste is disabled during assessment")
    }
  }, [assessment])

  const handleCopyPaste = useCallback((e: Event) => {
    if (assessment?.disableCopyPaste) {
      e.preventDefault()
    }
  }, [assessment])

  // Apply copy-paste restrictions
  useEffect(() => {
    if (!assessment || !attemptId) {
      return
    }

    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('paste', handleCopyPaste)
    document.addEventListener('cut', handleCopyPaste)

    // Disable text selection
    document.body.style.userSelect = assessment.disableCopyPaste ? 'none' : 'auto'

    return () => {
      document.removeEventListener('copy', handleCopyPaste)
      document.removeEventListener('paste', handleCopyPaste)
      document.removeEventListener('cut', handleCopyPaste)
      document.body.style.userSelect = 'auto'
    }
  }, [assessment, attemptId, handleCopyPaste])

  // Prevent developer tools - Improved detection with debouncing
  useEffect(() => {
    if (!assessment || !attemptId) {
      return
    }

    // Reset warning shown flag when assessment changes
    devToolsWarningShownRef.current = false

    const checkDevTools = () => {
      // Skip if we've already shown the warning
      if (devToolsWarningShownRef.current) {
        return
      }

      let devToolsDetected = false

      // Check for Firebug (browser extension) - this is reliable
      if ('Firebug' in window && (window as any).Firebug) {
        devToolsDetected = true
      }

      // Check for DevTools by detecting console timing differences
      // This is more reliable than window size checks
      const threshold = 160
      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight

      // Only consider it DevTools if the difference is very large and sustained
      // In incognito mode, small differences can occur, but DevTools creates larger ones
      if ((widthDiff > threshold || heightDiff > threshold) && widthDiff < 500 && heightDiff < 500) {
        devToolsDetected = true
      }

      // Only warn if actually detected and haven't warned yet
      if (devToolsDetected && !devToolsWarningShownRef.current) {
        devToolsWarningShownRef.current = true
        toasts.error("Developer tools detected! Please close them to continue.")
      }
    }

    // Run check every 2 seconds instead of 500ms to be less intrusive
    securityCheckRef.current = setInterval(checkDevTools, 2000)

    return () => {
      if (securityCheckRef.current) {
        clearInterval(securityCheckRef.current)
        securityCheckRef.current = null
      }
    }
  }, [assessment, attemptId])

  // ==================== UI HELPERS ====================

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }, [])

  const handleMultiSelectChange = useCallback((questionId: string, option: string, checked: boolean) => {
    setMultiSelectAnswers(prev => {
      const current = prev[questionId] || []
      let updated: string[]

      if (checked) {
        updated = [...current, option]
      } else {
        updated = current.filter(o => o !== option)
      }

      return {
        ...prev,
        [questionId]: updated,
      }
    })
  }, [])

  const handleCheckAnswer = useCallback((questionId: string) => {
    setShowAnswer(questionId)
    setCheckedAnswers(prev => new Set([...prev, questionId]))
  }, [])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setShowAnswer(null)
    }
  }, [currentQuestionIndex, questions.length])

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      setShowAnswer(null)
    }
  }, [currentQuestionIndex])

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    if (session) {
      fetchMetadata()
    }
  }, [session, fetchMetadata])

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <HexagonLoader size={80} />
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="h-8 w-8" />
              <CardTitle className="text-2xl">Assessment Unavailable</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{expiredMessage}</AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground">
              <p>Assessments are only available for {TIME_WINDOW_MINUTES} minutes after the scheduled start time.</p>
              <p className="mt-2">If you believe this is an error, please contact your administrator.</p>
            </div>
            <Button onClick={() => router.push('/user/assessment')} className="w-full">
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showAccessKeyDialog) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Enter Access Key</CardTitle>
                <CardDescription>
                  This assessment requires an access key to begin
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accessKey">Access Key</Label>
              <Input
                id="accessKey"
                type="text"
                value={accessKeyInput}
                onChange={(e) => setAccessKeyInput(e.target.value)}
                placeholder="Enter the access key"
                className="mt-1"
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && accessKeyInput.trim()) {
                    e.preventDefault()
                    startAssessment(accessKeyInput.trim())
                  }
                }}
              />
            </div>
            <Button 
              onClick={() => startAssessment(accessKeyInput.trim())}
              disabled={!accessKeyInput.trim() || submitting}
              className="w-full"
            >
              {submitting ? 'Verifying...' : 'Start Assessment'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assessment || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <HexagonLoader size={80} />
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold truncate max-w-md">
                {assessment.title}
              </h1>
              {assessment.disableCopyPaste && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Secure Mode
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {assessment.timeLimit && (
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4" />
                  <span className={`font-mono font-semibold ${timeRemaining <= 60 ? 'text-red-600' : timeRemaining <= 300 ? 'text-orange-600' : ''}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              
              {assessment.maxTabs && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className={`h-4 w-4 ${switchesRemaining === 0 ? 'text-red-600' : switchesRemaining !== null && switchesRemaining <= 1 ? 'text-orange-600' : ''}`} />
                  <span className="font-medium">
                    Violations: {tabSwitchCount}/{assessment.maxTabs}
                  </span>
                </div>
              )}

              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting || isAutoSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question */}
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {currentQuestion.title && (
                <h2 className="text-xl font-semibold mb-4">{currentQuestion.title}</h2>
              )}

              <div className="prose max-w-none">
                <RichTextDisplay content={currentQuestion.content} />
              </div>

              {/* Answer Options */}
              {currentQuestion.type === QuestionType.MULTIPLE_CHOICE && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={option} id={`q${currentQuestion.id}-opt${idx}`} />
                      <Label 
                        htmlFor={`q${currentQuestion.id}-opt${idx}`} 
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === QuestionType.MULTI_SELECT && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`q${currentQuestion.id}-opt${idx}`}
                        checked={(multiSelectAnswers[currentQuestion.id] || []).includes(option)}
                        onCheckedChange={(checked) => handleMultiSelectChange(currentQuestion.id, option, Boolean(checked))}
                      />
                      <Label 
                        htmlFor={`q${currentQuestion.id}-opt${idx}`} 
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {currentQuestion.type === QuestionType.TRUE_FALSE && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {['True', 'False'].map((option) => (
                    <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={option} id={`q${currentQuestion.id}-${option}`} />
                      <Label 
                        htmlFor={`q${currentQuestion.id}-${option}`} 
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === QuestionType.FILL_IN_BLANK && (
                <div>
                  <Label htmlFor={`q${currentQuestion.id}-answer`}>Your Answer</Label>
                  <Input
                    id={`q${currentQuestion.id}-answer`}
                    type="text"
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here"
                    className="mt-2"
                  />
                </div>
              )}
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialogs and Warnings */}
      <AnimatePresence>
        {showTabSwitchWarning && (
          <Dialog open={showTabSwitchWarning} onOpenChange={setShowTabSwitchWarning}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  Warning
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm">
                  You have violated the assessment rules by exiting fullscreen or switching tabs.
                </p>
                <p className="text-sm mt-2 font-semibold">
                  Violations remaining: {switchesRemaining}
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  One more violation will result in automatic submission of your assessment.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowTabSwitchWarning(false)}>
                  I Understand
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {showAutoSubmitWarning && (
          <Dialog open={showAutoSubmitWarning} onOpenChange={setShowAutoSubmitWarning}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Auto-Submitting
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm">
                  You have reached the maximum number of violations or the time has expired.
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Your assessment will be automatically submitted with your current answers.
                </p>
                <div className="mt-4 flex items-center justify-center">
                  <HexagonLoader size={40} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showFullscreenExitModal && (
          <Dialog open={showFullscreenExitModal} onOpenChange={setShowFullscreenExitModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-600">
                  <Maximize className="h-5 w-5" />
                  Fullscreen Exited
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm">
                  You have exited fullscreen mode. To continue with the assessment, you must remain in fullscreen.
                </p>
                <p className="text-sm mt-2 font-semibold">
                  Tab switches: {tabSwitchCount} / {assessmentRef.current?.maxTabs || 3}
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Please click the button below to re-enable fullscreen and continue.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleFullscreenExitContinue} className="w-full">
                  <Maximize className="w-4 h-4 mr-2" />
                  Enable Fullscreen to Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Submit Confirmation Dialog */}
        {showSubmitDialog && (
          <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-green-600">
                  <Send className="h-5 w-5" />
                  Submit Assessment
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to submit your assessment? This action cannot be undone.
                  <br />
                  <span className="font-semibold">Questions answered: {Object.keys(answers).length} / {questions.length}</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="mt-4 space-y-2">
                <Label htmlFor="submit-confirmation">
                  Type <span className="font-semibold text-green-600">CONFIRM SUBMIT</span> to proceed:
                </Label>
                <Input
                  id="submit-confirmation"
                  value={submitConfirmation}
                  onChange={(e) => setSubmitConfirmation(e.target.value)}
                  placeholder="CONFIRM SUBMIT"
                  autoComplete="off"
                  className="uppercase"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setShowSubmitDialog(false)
                  setSubmitConfirmation("")
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmSubmit}
                  disabled={submitConfirmation !== "CONFIRM SUBMIT"}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </AnimatePresence>
    </div>
  )
}
