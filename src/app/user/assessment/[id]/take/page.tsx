"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
  X, 
  Eye,
  EyeOff,
  Minimize,
  Maximize,
  Timer,
  AlertTriangle,
  LogOut
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { QuestionType, DifficultyLevel } from "@prisma/client"
import HexagonLoader from "@/components/Loader/Loading"

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
  startedAt?: string
  tabSwitches?: number
}

interface TabSwitchResponse {
  message: string
  currentSwitches: number
  switchesRemaining: number | null
  shouldAutoSubmit: boolean
}

export default function AssessmentTakingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

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
  const [showAnswer, setShowAnswer] = useState<string | null>(null)
  const [canShowAnswers, setCanShowAnswers] = useState(false)
  const [checkedAnswers, setCheckedAnswers] = useState<Set<string>>(new Set())
  const [questionsLoaded, setQuestionsLoaded] = useState<Set<number>>(new Set())
  const [isRestoringProgress, setIsRestoringProgress] = useState(false)

  // Access key states
  const [showAccessKeyDialog, setShowAccessKeyDialog] = useState(false)
  const [accessKeyInput, setAccessKeyInput] = useState("")
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // Tab switching states
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)

  // Auto-submit warning
  const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false)
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)

  const paginationContainerRef = useRef<HTMLDivElement>(null)
  const answersRef = useRef<Record<string, string>>(answers)
  const multiSelectAnswersRef = useRef<Record<string, string[]>>(multiSelectAnswers)
  const assessmentAttemptIdRef = useRef<string>("")
  const hasFetchedMetadataRef = useRef(false)

  // Update refs when state changes
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    multiSelectAnswersRef.current = multiSelectAnswers
  }, [multiSelectAnswers])

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - switch detected
        handleTabSwitch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [attemptId])

  const fetchAssessment = useCallback(async (accessKey?: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/user/assessment/${params.id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessKey: accessKey || '' }),
      })

      if (response.ok) {
        const data = await response.json()
        setAssessment(data.assessment)
        setQuestions(data.questions)
        setAttemptId(data.attemptId)
        setTimeRemaining(data.timeRemaining || 0)
        setCanShowAnswers(false)
        assessmentAttemptIdRef.current = data.attemptId
        setLoading(false) // Clear loading state on success

        // Check if access key was provided
        if (accessKey) {
          toasts.success('Access key verified! Starting assessment...')
        } else {
          toasts.success('Assessment started!')
        }

        // Enable fullscreen automatically
        if (typeof document.documentElement.requestFullscreen === 'function') {
          try {
            await document.documentElement.requestFullscreen()
            setIsFullscreen(true)
          } catch (err) {
            console.log('Fullscreen request failed:', err)
          }
        }

        // Store assessment start time in database (this will help with tab tracking)
        // Assessment will be auto-submitted when time runs out
      } else {
        const error = await response.json()
        toasts.error(error.message || "Failed to start assessment")
        // Don't clear loading on error so user sees error message
      }
  }, [params.id])

  const handleTabSwitch = async () => {
    if (!assessmentAttemptIdRef.current) return

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

        if (data.shouldAutoSubmit) {
          setShowAutoSubmitWarning(true)
          setIsAutoSubmitting(true)
          // Auto-submit after delay
          setTimeout(() => {
            handleSubmit()
          }, 2000)
        } else if (data.switchesRemaining <= 1) {
          setShowTabSwitchWarning(true)
        }
      } else {
        toasts.warning(`Tab switch ${data.currentSwitches}/${assessment?.maxTabs || 3} recorded`)
      }
    } catch (error) {
      console.error("Error recording tab switch:", error)
    }
  }

  const handleVisibilityChange = () => {
    if (!document.hidden && tabSwitchCount > 0) {
      // User came back to the tab - switch detected
      handleTabSwitch()
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleAccessKeySubmit = async () => {
    const key = accessKeyInput.trim()
    if (!key) {
      toasts.error("Please enter an access key")
      return
    }

    setShowAccessKeyDialog(false)
    setLoading(true)
    await fetchAssessment(key)
    setLoading(false)
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    // Prevent changing answer if it has been checked
    if (checkedAnswers.has(questionId)) {
      return
    }

    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleMultiSelectAnswerChange = (questionId: string, option: string, checked: boolean) => {
    // Prevent changing answer if it has been checked
    if (checkedAnswers.has(questionId)) {
      return
    }

    // Calculate new answers first
    const currentAnswers = multiSelectAnswers[questionId] || []
    let newAnswers: string[] = []
    if (checked) {
      newAnswers = [...currentAnswers, option]
    } else {
      newAnswers = currentAnswers.filter(ans => ans !== option)
    }

    // Update local state
    setMultiSelectAnswers(prev => ({
      ...prev,
      [questionId]: newAnswers
    }))
  }

  const handleCheckAnswer = (questionId: string) => {
    if (showAnswer === questionId) {
      setShowAnswer(null)
    } else {
      setShowAnswer(questionId)
      // Add this question to checked answers set to lock it
      setCheckedAnswers(prev => new Set(prev).add(questionId))
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < (questions.length || 0) - 1) {
      goToQuestion(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1)
    }
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)

    // Save navigation
    if (assessment && session?.user?.id && attemptId) {
      // We'll save progress to localStorage here when needed
      console.log('Navigating to question', index)
    }
  }

  const handleSubmit = async () => {
    if (submitting || isAutoSubmitting) return

    // Validate all questions answered
    const unansweredQuestions = questions.filter(q => !answers[q.id])
    if (unansweredQuestions.length > 0) {
      toasts.error("Please answer all questions before submitting")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/user/assessment/${params.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId,
          answers: {
            ...answersRef.current,
            ...Object.keys(multiSelectAnswersRef.current).reduce((acc, questionId) => {
              const selectedOptions = multiSelectAnswersRef.current[questionId]
              if (selectedOptions.length > 0) {
                acc[questionId] = selectedOptions.join('|')
              }
              return acc
            }, {}),
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toasts.success(`Assessment submitted! Score: ${result.score}%`)
        
        // Auto-exit fullscreen after submission
        if (document.fullscreenElement && isFullscreen) {
          try {
            await document.exitFullscreen()
            setIsFullscreen(false)
            console.log('Auto-exited fullscreen after submission')
          } catch (err) {
            console.error('Failed to exit fullscreen:', err)
          }
        }

        // Redirect to assessments page after short delay
        setTimeout(() => {
          router.push('/user/assessment')
        }, 1000)
        
        router.push(`/user/assessment/${params.id}/result?attemptId=${attemptId}`)
      } else {
        const error = await response.json()
        toasts.error(error.message || "Failed to submit assessment")
      }
    } catch (error) {
      console.error("Error submitting assessment:", error)
      toasts.error("Failed to submit assessment")
    } finally {
      setSubmitting(false)
      setIsAutoSubmitting(false)
      setShowAutoSubmitWarning(false)
    }
  }

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement)
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  // Auto-scroll pagination to active question
  const scrollToActiveQuestion = useCallback(() => {
    if (paginationContainerRef.current) {
      const container = paginationContainerRef.current
      const activeButton = container.querySelector(`[data-question-index="${currentQuestionIndex}"]`) as HTMLElement

      if (activeButton) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()

        const scrollLeft = buttonRect.left - containerRect.left - (containerRect.width / 2) + (buttonRect.width / 2)

        container.scrollTo({
          left: container.scrollLeft + scrollLeft,
          behavior: 'smooth'
        })
      }
    }
  }, [currentQuestionIndex, questions])

  useEffect(() => {
    scrollToActiveQuestion()
  }, [currentQuestionIndex, questions, scrollToActiveQuestion])

  // Scroll to active question when currentQuestionIndex changes
  useEffect(() => {
    scrollToActiveQuestion()
  }, [currentQuestionIndex, scrollToActiveQuestion])

  // Disable copy-paste based on settings
  useEffect(() => {
    const handleCopyPaste = (e: ClipboardEvent) => {
      if (assessment?.disableCopyPaste && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        toasts.warning("Copy/Paste is disabled for this assessment")
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (assessment?.disableCopyPaste && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        toasts.warning("Paste is disabled for this assessment")
      }
    }

    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('paste', handlePaste)

    return () => {
      document.removeEventListener('copy', handleCopyPaste)
      document.removeEventListener('paste', handlePaste)
    }
  }, [assessment?.disableCopyPaste])

  // Disable sidebar, inspect, and developer tools when assessment is running
  useEffect(() => {
    const disableContextMenu = (e: Event) => {
      e.preventDefault()
      toasts.warning("Context menu is disabled during assessment")
    }

    const disableKeyboardShortcuts = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.major === 'F12' || 
         e.key === 'I' || 
         e.key === 'C' || 
         e.key === 'U' || 
         e.key === 'D' || 
         e.key === 'J' || 
         e.key === 'T')
      ) {
        e.preventDefault()
        toasts.warning("Keyboard shortcuts are disabled during assessment")
      }
    }

    if (assessment && attemptId) {
      document.addEventListener('contextmenu', disableContextMenu)
      document.addEventListener('keydown', disableKeyboardShortcuts)
    }

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu)
      document.removeEventListener('keydown', disableKeyboardShortcuts)
    }
  }, [assessment, attemptId])

  // Disable sidebar, inspect, and developer tools when assessment is running
  useEffect(() => {
    const disableContextMenu = (e: Event) => {
      e.preventDefault()
      toasts.warning("Context menu is disabled during assessment")
    }

    const disableKeyboardShortcuts = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        (e.key === 'f12' || 
         e.key === 'i' || 
         e.key === 'c' || 
         e.key === 'u' || 
         e.key === 'd' || 
         e.key === 'j' || 
         e.key === 't')
      ) {
        e.preventDefault()
        toasts.warning("Keyboard shortcuts are disabled during assessment")
      }
    }

    if (assessment && attemptId) {
      document.addEventListener('contextmenu', disableContextMenu)
      document.addEventListener('keydown', disableKeyboardShortcuts)
    }

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu)
      document.removeEventListener('keydown', disableKeyboardShortcuts)
    }
  }, [assessment, attemptId])

  // Timer for auto-submit
  useEffect(() => {
    if (timeRemaining > 0 && !submitting) {
      const timer = setInterval(() => {
        const newTime = timeRemaining - 1
        setTimeRemaining(newTime)

        // Check if time is up
        if (newTime <= 0) {
          clearInterval(timer)
          // Auto-submit when time runs out
          setIsAutoSubmitting(true)
          setShowAutoSubmitWarning(true)
          toasts.info("Time is up! Auto-submitting...")
          setTimeout(() => {
            handleSubmit()
          }, 2000)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeRemaining, submitting, handleSubmit])

  // Effect to fetch assessment metadata and show access key dialog if needed
  useEffect(() => {
    const fetchMetadata = async () => {
      if (session && params.id && !hasFetchedMetadataRef.current) {
        try {
          const response = await fetch(`/api/user/assessment/${params.id}/metadata`)
          if (response.ok) {
            const data = await response.json()
            // Don't set loading to false yet - assessment state is not set
            // Mark as fetched to prevent multiple calls
            hasFetchedMetadataRef.current = true

            // Show access key dialog only if assessment requires one
            if (data.assessment.requiresAccessKey && !data.hasExistingAttempt) {
              setShowAccessKeyDialog(true)
              // Keep loading true so we don't show "Assessment not found"
            } else {
              // If no access key required or has existing attempt, start assessment directly
              await fetchAssessment()
              // fetchAssessment will set loading to false when it succeeds
            }
          } else {
            const error = await response.json()
            toasts.error(error.message || "Failed to load assessment")
            s
          }
        } catch (error) {
          console.error("Error fetching assessment metadata:", error)
          toasts.error("Failed to load assessment")
          s
        }
      }
    }

    fetchMetadata()
  }, [session, params.id])

  if (loading && !assessment) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <HexagonLoader size={120} />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Assessment not found</p>
        <Button onClick={() => router.back()} variant="outline">
          <ChevronLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = useMemo(() => questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0, [questions.length, currentQuestionIndex])
  const isLastQuestion = useMemo(() => currentQuestionIndex === questions.length - 1, [currentQuestionIndex, questions.length])

  // If we have assessment but no questions yet, show loading (but not if access key dialog is open)
  if (!loading && assessment && questions.length === 0 && !showAccessKeyDialog) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <HexagonLoader size={120} />
      </div>
    )
  }

  const getTimeColor = useMemo(() => {
    const percentage = (timeRemaining / ((assessment?.timeLimit || 0) * 60)) * 100
    if (percentage > 50) return "text-green-500"
    if (percentage > 20) return "text-yellow-500"
    return "text-red-500"
  }, [timeRemaining, assessment?.timeLimit])

  return (
    <div className={`min-h-screen bg-background dark:bg-background ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Header */}
      <Card className="mb-6 bg-card/90 dark:bg-card/90 backdrop-blur-sm shadow-lg border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/user/quiz")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Quizzes
            </Button>
            
            <h1 className="text-xl font-bold truncate max-w-md">{assessment.title}</h1>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-primary/10 text-primary dark:bg-sidebar-primary/10 dark:text-sidebar-primary-foreground">
                {assessment.campus?.shortName || assessment.campus?.name || 'General'}
              </Badge>
              {isFullscreen ? (
                <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                  <Minimize className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                  <Maximize className="h4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Timer and Progress */}
          <div className="flex items-center justify-center space-x-6 mt-4">
            <Timer className={`h-5 w-5 ${getTimeColor()}`} />
            <span className={`text-lg font-mono font-bold ${getTimeColor()}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>

          <Progress value={progress} className="flex-1 h-3 bg-muted" />

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 dark:bg-sidebar-primary dark:hover:bg-sidebar-primary/90"
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </Button>
        </CardContent>
      </Card>

      {/* Main Question Card - Only render if questions are loaded */}
      {currentQuestion && (
        <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm shadow-xl border border-border/50">
        <CardContent className="space-y-6">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary dark:bg-sidebar-primary/10 dark:text-sidebar-primary-foreground">
              {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
            </Badge>
          </div>

          <CardTitle>
            <RichTextDisplay content={currentQuestion.content} />
          </CardTitle>

          <CardContent>
            {/* Multiple Choice & True/False Questions */}
            {(currentQuestion.type === QuestionType.MULTIPLE_CHOICE || currentQuestion.type === QuestionType.TRUE_FALSE) && (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                disabled={checkedAnswers.has(currentQuestion.id)}
              >
                {currentQuestion.options.map((option: string, index: number) => {
                  const isCorrect = showAnswer === currentQuestion.id && option === currentQuestion.correctAnswer
                  const isSelected = answers[currentQuestion.id] === option
                  const isLocked = checkedAnswers.has(currentQuestion.id)

                  return (
                    <div
                      key={index}
                      data-question-index={currentQuestionIndex}
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      } ${
                        isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : ''
                      } ${
                        isLocked
                          ? 'opacity-75 cursor-not-allowed' 
                          : ''
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

            {/* Fill in Blank Questions */}
            {currentQuestion.type === QuestionType.FILL_IN_BLANK && (
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter your answer..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  disabled={checkedAnswers.has(currentQuestion.id)}
                  className="w-full"
                />
              </div>
            )}

            {/* Multi-Select Questions */}
            {currentQuestion.type === QuestionType.MULTI_SELECT && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {currentQuestion.options.map((option: string, index: number) => {
                    const isSelected = multiSelectAnswers[currentQuestion.id]?.includes(option)

                    return (
                      <Badge
                        key={index}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'hover:bg-primary/90 dark:hover:bg-sidebar-primary/90'
                        }`}
                        onClick={() => !checkedAnswers.has(currentQuestion.id) && handleMultiSelectAnswerChange(currentQuestion.id, option, !isSelected)}
                      >
                        {option}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>

          {/* Question Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAnswer(showAnswer === currentQuestion.id ? null : currentQuestion.id)}
                title={canShowAnswers ? "Hide Answer" : "Show Answer"}
              >
                {showAnswer === currentQuestion.id ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleCheckAnswer(currentQuestion.id)}
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

      {/* Question Navigation - Only render if questions are loaded */}
      {currentQuestion && (
        <div ref={paginationContainerRef} className="flex items-center justify-center gap-2 py-6 overflow-x-auto">
          {questions.map((question, index) => (
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
            <DialogTitle>Enter Assessment Access Key</DialogTitle>
            <DialogDescription>
              This assessment requires an access key to start.
              {assessment?.startTime && (
                <>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Start Time: {new Date(assessment.startTime).toLocaleString()}
                  </span>
                </>
              )}
              {assessment?.timeLimit && (
                <>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Time Limit: {assessment.timeLimit} minutes
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="accessKey">Access Key</Label>
              <Input
                id="accessKey"
                type="text"
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
      {showTabSwitchWarning && (
        <Alert className="fixed bottom-4 right-4 left-4 max-w-md z-50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Tab switch detected!</p>
              <p className="text-sm text-muted-foreground">
                Switching tabs during an assessment is monitored. You have used {tabSwitchCount} of {assessment?.maxTabs || 3} allowed tab switches.
              </p>
              <p className="text-sm text-muted-foreground">
                After {assessment?.maxTabs || 3} switches, your assessment will be auto-submitted.
              </p>
            </div>
            <Button onClick={() => setShowTabSwitchWarning(false)} className="mt-4">
              Got it, I'll stay focused
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-submit Warning */}
      {showAutoSubmitWarning && (
        <Alert className="fixed bottom-4 right-4 left-4 max-w-md z-50">
          <Timer className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Auto-submitting due to tab switches!</p>
              <p className="text-sm text-muted-foreground">
                You have switched tabs {tabSwitchCount} times, which exceeds the allowed limit of {assessment?.maxTabs || 3}.
              </p>
              <p className="text-sm text-muted-foreground">
                Your assessment is being submitted automatically to prevent cheating.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
