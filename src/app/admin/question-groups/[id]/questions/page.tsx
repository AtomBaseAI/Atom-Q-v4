"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Plus, Edit, Trash2, ArrowLeft, Loader2, ChevronLeft, Download, Upload, FileDown, FileUp } from "lucide-react"
import { format } from "date-fns"
import { QuestionType, DifficultyLevel } from "@prisma/client"
import Papa from "papaparse"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { toast } from "sonner"

interface Question {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string
  correctAnswer: string
  explanation: string | null
  difficulty: DifficultyLevel
  isActive: boolean
  createdAt: string
}

interface QuestionGroup {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  questions: Question[]
}

export default function QuestionGroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [questionGroup, setQuestionGroup] = useState<QuestionGroup | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: QuestionType.MULTIPLE_CHOICE as QuestionType,
    options: ["", "", ""], // Initialize with 3 empty options
    correctAnswer: "",
    correctAnswers: [] as string[],
    explanation: "",
    difficulty: DifficultyLevel.MEDIUM as DifficultyLevel,
    isActive: true
  })

  // CSV Import/Export states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    fetchQuestionGroup()
    fetchQuestions()
  }, [groupId])

  const fetchQuestionGroup = async () => {
    try {
      const response = await fetch(`/api/admin/question-groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        setQuestionGroup(data)
      }
    } catch (error) {
      console.error("Error fetching question group:", error)
    }
  }

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/question-groups/${groupId}/questions`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form data
    if (!formData.title.trim()) {
      alert("Title is required")
      return
    }

    // Check if content has actual text content (not just HTML tags)
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = formData.content
    const textContent = tempDiv.textContent || tempDiv.innerText || ""

    if (!textContent.trim()) {
      alert("Content is required")
      return
    }

    if (formData.type !== QuestionType.FILL_IN_BLANK) {
      if (formData.options.length === 0) {
        alert("At least one option is required")
        return
      }

      // Check for empty options
      if (formData.options.some(option => !option.trim())) {
        alert("All options must have values")
        return
      }

      // Validate correct answers
      if (formData.type === QuestionType.MULTI_SELECT) {
        if (formData.correctAnswers.length === 0) {
          alert("At least one correct answer must be selected for multi-select questions")
          return
        }
      } else {
        if (!formData.correctAnswer.trim()) {
          alert("A correct answer must be selected")
          return
        }
      }
    } else {
      if (!formData.correctAnswer.trim()) {
        alert("Correct answer is required for fill-in-the-blank questions")
        return
      }
    }

    setSubmitLoading(true)

    try {
      // Prepare the data for the API
      const apiData = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        options: formData.options, // API handles both array and string
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation,
        difficulty: formData.difficulty,
        isActive: formData.isActive
      }

      const url = editingQuestion
        ? `/api/admin/question-groups/${groupId}/questions/${editingQuestion.id}`
        : `/api/admin/question-groups/${groupId}/questions`

      const method = editingQuestion ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiData)
      })

      if (response.ok) {
        await fetchQuestions()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const errorData = await response.json()
        console.error("Error saving question:", errorData.message)
        alert(`Error: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error saving question:", error)
      alert("Error saving question. Please try again.")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    const parsedOptions = JSON.parse(question.options)
    const correctAnswers = question.type === QuestionType.MULTI_SELECT
      ? question.correctAnswer.split('|').map(ans => ans.trim())
      : [question.correctAnswer]

    setFormData({
      title: question.title,
      content: question.content,
      type: question.type,
      options: parsedOptions,
      correctAnswer: question.correctAnswer,
      correctAnswers,
      explanation: question.explanation || "",
      difficulty: question.difficulty,
      isActive: question.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(id)
      const response = await fetch(`/api/admin/question-groups/${groupId}/questions/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await fetchQuestions()
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error deleting question:", error)
      alert("Error deleting question. Please try again.")
    } finally {
      setDeleteLoading(null)
    }
  }

  const resetForm = () => {
    setEditingQuestion(null)
    setFormData({
      title: "",
      content: "",
      type: QuestionType.MULTIPLE_CHOICE as QuestionType,
      options: ["", "", ""], // Initialize with 3 empty options
      correctAnswer: "",
      correctAnswers: [],
      explanation: "",
      difficulty: DifficultyLevel.MEDIUM as DifficultyLevel,
      isActive: true
    })
  }

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ""]
    })
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({
      ...formData,
      options: newOptions
    })
  }

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index)
    const newCorrectAnswers = formData.correctAnswers.filter(ans => newOptions.includes(ans))
    setFormData({
      ...formData,
      options: newOptions,
      correctAnswers: newCorrectAnswers,
      correctAnswer: formData.type === QuestionType.MULTI_SELECT
        ? newCorrectAnswers.join('|')
        : formData.correctAnswer
    })
  }

  const handleCorrectAnswerChange = (option: string, isChecked: boolean) => {
    if (formData.type === QuestionType.MULTI_SELECT) {
      const newCorrectAnswers = isChecked
        ? [...formData.correctAnswers, option]
        : formData.correctAnswers.filter(ans => ans !== option)

      setFormData({
        ...formData,
        correctAnswers: newCorrectAnswers,
        correctAnswer: newCorrectAnswers.join('|')
      })
    } else {
      // For single choice questions, only one answer can be selected
      setFormData({
        ...formData,
        correctAnswer: isChecked ? option : "",
        correctAnswers: isChecked ? [option] : []
      })
    }
  }

  // CSV Export function
  const handleExportQuestions = () => {
    const csvContent = [
      ["Title", "Content", "Type", "Options", "Correct Answer", "Explanation", "Difficulty", "Active"],
      ...questions.map(question => {
        // Parse options from database (stored as JSON string) and convert to pipe-separated format
        let optionsString = ""
        try {
          const parsedOptions = JSON.parse(question.options || "[]")
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
          question.isActive.toString()
        ]
      })
    ].map(row =>
      // Properly escape CSV values that contain commas or quotes
      row.map(cell => {
        if (cell === null || cell === undefined) return ""
        const str = cell.toString()
        if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(",")
    ).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${questionGroup?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_questions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Questions exported to CSV")
  }

  // CSV Import functions
  const handleImportQuestions = () => {
    setIsImportSheetOpen(true)
  }

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

          // Create questions in the current question group
          const importPromises = validQuestions.map(async (question: any, index: number) => {
            try {
              // Parse options from CSV (pipe-separated format)
              const options = question.Options.split('|').map((opt: string) => opt.trim()).filter((opt: string) => opt)
              
              const apiData = {
                title: question.Title,
                content: question.Content,
                type: question.Type,
                options: options,
                correctAnswer: question["Correct Answer"],
                explanation: question.Explanation || "",
                difficulty: question.Difficulty || DifficultyLevel.MEDIUM,
                isActive: question.Active !== "false" && question.Active !== false
              }

              const response = await fetch(`/api/admin/question-groups/${groupId}/questions`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(apiData)
              })

              if (!response.ok) {
                throw new Error(`Failed to create question "${question.Title}"`)
              }

              const result = await response.json()
              return result
            } catch (error) {
              console.error(`Failed to import question ${index + 1}:`, error)
              return { error: error instanceof Error ? error.message : "Unknown error" }
            }
          })

          const importedQuestions = await Promise.all(importPromises)
          const successfulImports = importedQuestions.filter(result => !result.error)
          const failedImports = importedQuestions.filter(result => result.error)

          if (successfulImports.length > 0) {
            toast.success(`Successfully imported ${successfulImports.length} question(s)`)
            await fetchQuestions()
          }

          if (failedImports.length > 0) {
            const errorMessages = failedImports.map(f => f.error).join(", ")
            console.error("Failed imports:", errorMessages)
            toast.error(`Failed to import ${failedImports.length} question(s):\n${errorMessages}`)
          }

          // Close the import sheet and reset state
          setIsImportSheetOpen(false)
          setImportFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        } catch (error) {
          console.error("CSV parsing error:", error)
          toast.error(`Failed to parse CSV file: ${error instanceof Error ? error.message : "Unknown error"}`)
        } finally {
          setIsImporting(false)
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error)
        toast.error(`Failed to parse CSV file: ${error.message}`)
        setIsImporting(false)
      }
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  if (!questionGroup) {
    return <div className="flex items-center justify-center h-64">Question group not found</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-center items-center">
        <div className="w-1/2 flex flex-row justify-start items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold tracking-tight">{questionGroup.name}</h1>
            <Badge variant={questionGroup.isActive ? "default" : "secondary"}>
              {questionGroup.isActive ? "Active" : "Inactive"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Created {format(new Date(questionGroup.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <div className="w-1/2 flex flex-row justify-end items-center g-2">
          <Button variant="outline" onClick={handleExportQuestions} className="mr-1">
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleImportQuestions} className="mr-1">
            <FileUp className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="mr-1">
                <Plus className="mr-2 h-4 w-4" />
                New Question
              </Button>
            </DialogTrigger>
            <DialogContent className="min-w-[100vw] min-h-[99vh] w-full p-0 m-0 rounded-none">
              <form onSubmit={handleSubmit} className="flex flex-col h-full w-full">
                <div className="flex flex-col h-full w-full">
                  <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>
                      {editingQuestion ? "Edit Question" : "Create Question"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-row flex-1 overflow-y-hidden px-6 py-4 space-y-6 gap-4">
                    <div className="flex flex-col flex-1 w-1/2 h-full p-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium">
                          Title
                        </Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Enter question title"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-sm font-medium">
                          Type
                        </Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => {
                            const newType = value as QuestionType
                            // Ensure minimum options for multi-select
                            let newOptions = [...formData.options]
                            if (newType === QuestionType.MULTI_SELECT && newOptions.length < 3) {
                              while (newOptions.length < 3) {
                                newOptions.push("")
                              }
                            } else if (newType === QuestionType.TRUE_FALSE) {
                              // For true/false, set exactly 2 options
                              newOptions = ["True", "False"]
                            } else if (newType === QuestionType.MULTIPLE_CHOICE && newOptions.length < 2) {
                              // For multiple choice, ensure at least 2 options
                              while (newOptions.length < 2) {
                                newOptions.push("")
                              }
                            }

                            setFormData({
                              ...formData,
                              type: newType,
                              options: newOptions,
                              correctAnswer: "",
                              correctAnswers: []
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select question type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</SelectItem>
                            <SelectItem value={QuestionType.MULTI_SELECT}>Multi-Select</SelectItem>
                            <SelectItem value={QuestionType.TRUE_FALSE}>True/False</SelectItem>
                            <SelectItem value={QuestionType.FILL_IN_BLANK}>Fill in the Blank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.type !== QuestionType.FILL_IN_BLANK && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">Options</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addOption}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          {formData.type === QuestionType.MULTI_SELECT && (
                            <p className="text-sm text-muted-foreground">
                              Multi-select questions require at least 3 options.
                            </p>
                          )}
                          <div className="space-y-2">
                            {formData.options.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Input
                                  value={option}
                                  onChange={(e) => updateOption(index, e.target.value)}
                                  placeholder={`Option ${index + 1}`}
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeOption(index)}
                                  disabled={formData.options.length <= (formData.type === QuestionType.MULTI_SELECT ? 3 :
                                    formData.type === QuestionType.TRUE_FALSE ? 2 : 1)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {formData.type !== QuestionType.FILL_IN_BLANK && (
                        <div className="space-y-4">
                          <Label className="text-sm font-medium">
                            {formData.type === QuestionType.MULTI_SELECT ? "Correct Answers" : "Correct Answer"}
                          </Label>
                          <div className="space-y-2">
                            {formData.options.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`correct-${index}`}
                                  checked={formData.correctAnswers.includes(option)}
                                  onCheckedChange={(checked) => handleCorrectAnswerChange(option, checked as boolean)}
                                />
                                <label htmlFor={`correct-${index}`} className="text-sm">
                                  {option || `Option ${index + 1}`}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.type === QuestionType.FILL_IN_BLANK && (
                        <div className="space-y-2">
                          <Label htmlFor="correctAnswer" className="text-sm font-medium">
                            Correct Answer
                          </Label>
                          <Input
                            id="correctAnswer"
                            value={formData.correctAnswer}
                            onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                            placeholder="Enter correct answer"
                            required
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 w-1/2 h-full p-4 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="content" className="text-sm font-medium">
                          Content
                        </Label>
                        <RichTextEditor
                          value={formData.content}
                          onChange={(value) => setFormData({ ...formData, content: value })}
                          placeholder="Enter question content..."
                          className="min-h-[150px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="explanation" className="text-sm font-medium">
                          Explanation
                        </Label>
                        <RichTextEditor
                          value={formData.explanation}
                          onChange={(value) => setFormData({ ...formData, explanation: value })}
                          placeholder="Enter explanation (optional)..."
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>

                  </div>
                  <div className="px-6 py-4 border-t flex flex-row">
                    <div className="w-1/2 flex justify-start items-center">
                      <div className="flex items-center justify-center pt-4">
                        <Label htmlFor="isActive" className="text-sm font-medium mr-2">
                          Active
                        </Label>
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        />
                      </div>
                    </div>
                    <div className="w-1/2 flex justify-end items-center">
                      <LoadingButton 
                        type="submit" 
                        isLoading={submitLoading}
                        loadingText={editingQuestion ? "Updating..." : "Creating..."}
                      >
                        {editingQuestion ? "Update" : "Create"}
                      </LoadingButton>
                    </div>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Questions in this group ({questions.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Correct Answer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="font-medium">{question.title}</TableCell>
                  <TableCell>
                    <Badge variant={
                      question.type === QuestionType.MULTIPLE_CHOICE ? "default" :
                        question.type === QuestionType.MULTI_SELECT ? "secondary" :
                          question.type === QuestionType.TRUE_FALSE ? "outline" : "destructive"
                    }>
                      {question.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={question.difficulty === DifficultyLevel.EASY ? "default" : question.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"}>
                      {question.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {question.correctAnswer}
                  </TableCell>
                  <TableCell>
                    <Badge variant={question.isActive ? "default" : "secondary"}>
                      {question.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleteLoading === question.id}
                          >
                            {deleteLoading === question.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{question.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(question.id)}
                              className="bg-destructive hover:bg-destructive/90"
                              disabled={deleteLoading === question.id}
                            >
                              {deleteLoading === question.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {questions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No questions found in this group. Create your first question to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import Sheet */}
      <Sheet open={isImportSheetOpen} onOpenChange={setIsImportSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Import Questions</SheetTitle>
            <SheetDescription>
              Import questions from a CSV file into this question group
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver ? "border-primary bg-primary/5" : "border-gray-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {importFile ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium">{importFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile()
                    }}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <p className="text-xs text-muted-foreground">
                    Supported format: CSV with headers (Title, Content, Type, Options, Correct Answer, Explanation, Difficulty, Active)
                  </p>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">CSV Format Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Title:</strong> Question title</li>
                <li><strong>Content:</strong> Question content (HTML supported)</li>
                <li><strong>Type:</strong> MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE, or FILL_IN_BLANK</li>
                <li><strong>Options:</strong> Pipe-separated options (e.g., "Option 1|Option 2|Option 3")</li>
                <li><strong>Correct Answer:</strong> The correct answer(s)</li>
                <li><strong>Explanation:</strong> Answer explanation (optional)</li>
                <li><strong>Difficulty:</strong> EASY, MEDIUM, or HARD (default: MEDIUM)</li>
                <li><strong>Active:</strong> true or false (default: true)</li>
              </ul>
            </div>
          </div>
          <SheetFooter>
            <LoadingButton
              type="button"
              onClick={handleImportWithGroup}
              isLoading={isImporting}
              loadingText="Importing..."
              disabled={!importFile}
            >
              Import Questions
            </LoadingButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}