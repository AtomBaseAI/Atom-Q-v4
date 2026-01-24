"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  Search,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  X,
  Download,
  Upload,
  ChevronLeft,
  FileDown,
  FileUp
} from "lucide-react"
import { toast } from "sonner"
import { QuestionType, DifficultyLevel } from "@prisma/client"
import Papa from "papaparse"
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
  isActive: boolean
  order: number
  points: number
}

interface AvailableQuestion {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string[] | string
  correctAnswer: string
  explanation?: string
  difficulty: DifficultyLevel
  isActive: boolean
  group?: {
    id: string
    name: string
  }
}

interface QuestionGroup {
  id: string
  name: string
  description: string | null
  isActive: boolean
  _count: {
    questions: number
  }
}

function SortableQuestion({
  question,
  onEdit,
  onDelete,
  onView
}: {
  question: Question
  onEdit: (question: Question) => void
  onDelete: (questionId: string) => void
  onView: (question: Question) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell>
        <div {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{question.order}</TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{question.title}</div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={
          question.type === QuestionType.MULTIPLE_CHOICE ? "default" :
            question.type === QuestionType.MULTI_SELECT ? "secondary" :
            question.type === QuestionType.TRUE_FALSE ? "outline" : "destructive"
        }>
          {question.type.replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={
          question.difficulty === DifficultyLevel.EASY ? "default" :
            question.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
        }>
          {question.difficulty}
        </Badge>
      </TableCell>
      <TableCell>{question.points}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(question)}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Question</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this question from the assessment? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(question.id)}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function AssessmentQuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<AvailableQuestion[]>([])
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  
  // Popup-specific filter states
  const [popupSearchTerm, setPopupSearchTerm] = useState("")
  const [popupDifficultyFilter, setPopupDifficultyFilter] = useState<string>("all")
  const [popupGroupFilter, setPopupGroupFilter] = useState<string>("all")
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [assessmentTitle, setAssessmentTitle] = useState("")
  const [selectedQuestionsToAdd, setSelectedQuestionsToAdd] = useState<string[]>([])
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Import sheet states
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false)
  const [selectedQuestionGroup, setSelectedQuestionGroup] = useState<string>("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchAssessment()
    fetchQuestions()
    fetchAvailableQuestions()
    fetchQuestionGroups()
  }, [assessmentId])

  useEffect(() => {
    fetchAvailableQuestions()
  }, [difficultyFilter, searchTerm, groupFilter])

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`)
      if (response.ok) {
        const data = await response.json()
        setAssessmentTitle(data.title)
      }
    } catch (error) {
      console.error("Failed to fetch assessment title:", error)
    }
  }

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/questions`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      toast.error("Failed to fetch questions")
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableQuestions = async () => {
    try {
      const params = new URLSearchParams()
      if (difficultyFilter !== "all") params.append("difficulty", difficultyFilter)
      if (searchTerm) params.append("search", searchTerm)
      if (groupFilter !== "all") params.append("groupId", groupFilter)
      
      const response = await fetch(`/api/admin/assessments/${assessmentId}/available-questions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableQuestions(data)
      }
    } catch (error) {
      toast.error("Failed to fetch available questions")
    }
  }

  const fetchQuestionGroups = async () => {
    try {
      const response = await fetch("/api/admin/question-groups")
      if (response.ok) {
        const data = await response.json()
        setQuestionGroups(data)
      }
    } catch (error) {
      console.error("Failed to fetch question groups:", error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id)
      const newIndex = questions.findIndex(q => q.id === over?.id)

      const newQuestions = arrayMove(questions, oldIndex, newIndex)
      setQuestions(newQuestions)

      // Update order in backend
      try {
        await fetch(`/api/admin/assessments/${assessmentId}/questions/reorder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionOrders: newQuestions.map((q, index) => ({
              questionId: q.id,
              order: index + 1
            }))
          }),
        })
      } catch (error) {
        toast.error("Failed to update question order")
        fetchQuestions() // Revert to original order
      }
    }
  }

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/questions/${questionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setQuestions(questions.filter(q => q.id !== questionId))
        toast.success("Question removed from assessment")
        setDeleteQuestionId(null)
      } else {
        toast.error("Failed to remove question")
      }
    } catch (error) {
      toast.error("Failed to remove question")
    }
  }

  const handleAddQuestions = async (questionIds: string[]) => {
    if (questionIds.length === 0) return
    
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionIds }),
      })

      if (response.ok) {
        toast.success("Questions added to assessment")
        setIsAddDialogOpen(false)
        setSelectedQuestionsToAdd([])
        // Reset popup filters when closing
        setPopupSearchTerm("")
        setPopupDifficultyFilter("all")
        setPopupGroupFilter("all")
        fetchQuestions()
        fetchAvailableQuestions()
      } else {
        toast.error("Failed to add questions")
      }
    } catch (error) {
      toast.error("Failed to add questions")
    }
  }

  const handleExportQuestions = () => {
    const csvContent = [
      ["Title", "Content", "Type", "Options", "Correct Answer", "Explanation", "Difficulty", "Points"],
      ...questions.map(question => {
        // Parse options from database (stored as JSON string) and convert to pipe-separated format
        let optionsString = ""
        try {
          const parsedOptions = Array.isArray(question.options)
            ? question.options
            : JSON.parse(question.options || "[]")
          optionsString = parsedOptions.join("|")
        } catch (e) {
          console.warn("Failed to parse options for question:", question.title, e)
          optionsString = question.options?.toString() || ""
        }

        return [
          question.title,
          question.content,
          question.type,
          optionsString,
          question.correctAnswer,
          question.explanation || "",
          question.difficulty,
          question.points.toString()
        ]
      })
    ].map(row =>
      // Properly escape CSV values that contain commas or quotes
      row.map(cell => {
        if (cell === null || cell === undefined) return ""
        const str = cell.toString()
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(",")
    ).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${assessmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_questions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Questions exported to CSV")
  }

  const handleImportQuestions = () => {
    fileInputRef.current?.click()
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setImportFile(file)
      } else {
        toast.error("Please upload a CSV file")
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleRemoveFile = () => {
    setImportFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImportWithGroup = async () => {
    if (!importFile) {
      toast.error("Please select a file to import")
      return
    }
    
    if (!selectedQuestionGroup) {
      toast.error("Please select a question group")
      return
    }

    setIsImporting(true)

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Filter out empty rows and validate required fields
          const validQuestions = results.data.filter((row: any) => {
            const hasTitle = row.Title && row.Title.trim() !== ""
            const hasContent = row.Content && row.Content.trim() !== ""
            const hasType = row.Type && row.Type.trim() !== ""
            const hasOptions = row.Options && row.Options.trim() !== ""
            const hasCorrectAnswer = row["Correct Answer"] && row["Correct Answer"].trim() !== ""

            return hasTitle && hasContent && hasType && hasOptions && hasCorrectAnswer
          })

          if (validQuestions.length === 0) {
            toast.error("No valid questions found in CSV file. Please ensure all required fields are filled.")
            return
          }

          // Create questions in the selected group
          const importPromises = validQuestions.map(async (question: any, index: number) => {
            try {
              // Normalize question type
              let normalizedType = question.Type.toUpperCase().replace(' ', '_')
              if (!Object.values(QuestionType).includes(normalizedType as QuestionType)) {
                normalizedType = QuestionType.MULTIPLE_CHOICE
              }

              // Parse options from CSV format (pipe-separated)
              let optionsArray: string[] = []
              if (question.Options) {
                optionsArray = question.Options.split('|').map((opt: string) => opt.trim()).filter((opt: string) => opt)
              }

              // Parse correct answer (could be index or value)
              let correctAnswer = question["Correct Answer"].toString().trim()

              return await fetch("/api/admin/questions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: question.Title.trim(),
                  content: question.Content.trim(),
                  type: normalizedType,
                  options: optionsArray,
                  correctAnswer: correctAnswer,
                  explanation: question.Explanation?.trim() || "",
                  difficulty: question.Difficulty?.toUpperCase() || DifficultyLevel.MEDIUM,
                  groupId: selectedQuestionGroup
                }),
              })
            } catch (error) {
              console.error(`Failed to create question "${question.Title}":`, error)
              return null
            }
          })

          const importResults = await Promise.all(importPromises)
          const successful = importResults.filter(r => r && r.ok).length
          const failed = importResults.length - successful

          if (successful > 0) {
            toast.success(`Successfully imported ${successful} question${successful !== 1 ? 's' : ''}`)
            // Refresh available questions
            fetchAvailableQuestions()
            fetchQuestionGroups()
          }

          if (failed > 0) {
            toast.error(`Failed to import ${failed} question${failed !== 1 ? 's' : ''}`)
          }

          // Reset import state
          setIsImportSheetOpen(false)
          setImportFile(null)
          setSelectedQuestionGroup("")
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }

        } catch (error) {
          console.error("Import error:", error)
          toast.error("Failed to import questions. Please check your CSV format.")
        } finally {
          setIsImporting(false)
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error)
        toast.error("Failed to parse CSV file. Please check the file format.")
        setIsImporting(false)
      }
    })
  }

  const filteredAvailableQuestions = availableQuestions.filter(question => {
    const matchesSearch = !popupSearchTerm || 
      question.title.toLowerCase().includes(popupSearchTerm.toLowerCase()) ||
      question.content.toLowerCase().includes(popupSearchTerm.toLowerCase())
    
    const matchesDifficulty = popupDifficultyFilter === "all" || question.difficulty === popupDifficultyFilter
    
    const matchesGroup = popupGroupFilter === "all" || question.group?.id === popupGroupFilter

    return matchesSearch && matchesDifficulty && matchesGroup
  })

  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestionsToAdd(prev => [...prev, questionId])
    } else {
      setSelectedQuestionsToAdd(prev => prev.filter(id => id !== questionId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestionsToAdd(filteredAvailableQuestions.map(q => q.id))
    } else {
      setSelectedQuestionsToAdd([])
    }
  }

  if (loading) {
    return <HexagonLoader />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Assessment Questions</h1>
          <p className="text-muted-foreground">
            Manage questions for "{assessmentTitle}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>
                Add, remove, and reorder questions in this assessment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportQuestions}>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Questions
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No questions added to this assessment yet
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Questions
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={questions.map(q => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {questions.map((question) => (
                      <SortableQuestion
                        key={question.id}
                        question={question}
                        onEdit={() => {}}
                        onDelete={handleRemoveQuestion}
                        onView={(question) => {
                          setSelectedQuestion(question)
                          setIsViewDialogOpen(true)
                        }}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add Questions Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Questions to Assessment</DialogTitle>
            <DialogDescription>
              Select questions from the question bank to add to this assessment
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-4 p-4 border-b">
            <div className="flex-1">
              <Input
                placeholder="Search questions..."
                value={popupSearchTerm}
                onChange={(e) => setPopupSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={popupDifficultyFilter} onValueChange={setPopupDifficultyFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={popupGroupFilter} onValueChange={setPopupGroupFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Question Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {questionGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Questions List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredAvailableQuestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No questions found</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedQuestionsToAdd.length === filteredAvailableQuestions.length && filteredAvailableQuestions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({selectedQuestionsToAdd.length} selected)
                  </Label>
                </div>
                {filteredAvailableQuestions.map((question) => (
                  <div key={question.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={question.id}
                      checked={selectedQuestionsToAdd.includes(question.id)}
                      onCheckedChange={(checked) => handleQuestionSelect(question.id, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={question.id} className="text-sm font-medium cursor-pointer">
                        {question.title}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {question.content}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {question.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {question.difficulty}
                        </Badge>
                        {question.group && (
                          <Badge variant="outline" className="text-xs">
                            {question.group.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              onClick={() => handleAddQuestions(selectedQuestionsToAdd)}
              disabled={selectedQuestionsToAdd.length === 0}
              isLoading={false}
            >
              Add {selectedQuestionsToAdd.length} Question{selectedQuestionsToAdd.length !== 1 ? 's' : ''}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Question Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="mt-1">{selectedQuestion.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Content</Label>
                <div className="mt-1">
                  <RichTextDisplay content={selectedQuestion.content} />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Options</Label>
                <div className="mt-1 space-y-1">
                  {Array.isArray(selectedQuestion.options) 
                    ? selectedQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm">{option}</span>
                          {option === selectedQuestion.correctAnswer && (
                            <Badge variant="default" className="text-xs">Correct</Badge>
                          )}
                        </div>
                      ))
                    : JSON.parse(selectedQuestion.options || "[]").map((option: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm">{option}</span>
                          {option === selectedQuestion.correctAnswer && (
                            <Badge variant="default" className="text-xs">Correct</Badge>
                          )}
                        </div>
                      ))
                  }
                </div>
              </div>
              {selectedQuestion.explanation && (
                <div>
                  <Label className="text-sm font-medium">Explanation</Label>
                  <div className="mt-1">
                    <RichTextDisplay content={selectedQuestion.explanation} />
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="mt-1">{selectedQuestion.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Difficulty</Label>
                  <p className="mt-1">{selectedQuestion.difficulty}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Points</Label>
                  <p className="mt-1">{selectedQuestion.points}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}