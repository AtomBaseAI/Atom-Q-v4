"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { TriangleAlert, Bug, Edit, ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { QuestionType, DifficultyLevel } from "@prisma/client"

interface ReportedQuestion {
  id: string
  suggestion: string
  status: string
  createdAt: string
  question: {
    id: string
    title: string
    content: string
    type: string
    options: string
    correctAnswer: string
    explanation: string | null
    difficulty: string
    isActive: boolean
    group: {
      id: string
      name: string
    }
  }
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function ReportedQuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const [reportedQuestions, setReportedQuestions] = useState<ReportedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<ReportedQuestion | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
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

  useEffect(() => {
    fetchReportedQuestions()
  }, [params.id])

  const fetchReportedQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/question-groups/${params.id}/reported-questions`)
      if (response.ok) {
        const data = await response.json()
        setReportedQuestions(data)
      }
    } catch (error) {
      console.error("Error fetching reported questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsUpdated = async (reportId: string) => {
    try {
      setUpdating(reportId)
      const response = await fetch(`/api/admin/question-groups/${params.id}/reported-questions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          status: "RESOLVED"
        }),
      })

      if (response.ok) {
        await fetchReportedQuestions()
        setSelectedReport(null)
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error updating report status:", error)
      alert("Error updating report status. Please try again.")
    } finally {
      setUpdating(null)
    }
  }

  const handleEditQuestion = (report: ReportedQuestion) => {
    setEditingQuestion(report.question)
    const parsedOptions = JSON.parse(report.question.options)
    const correctAnswers = report.question.type === QuestionType.MULTI_SELECT
      ? report.question.correctAnswer.split('|').map(ans => ans.trim())
      : [report.question.correctAnswer]

    setFormData({
      title: report.question.title,
      content: report.question.content,
      type: report.question.type as QuestionType,
      options: parsedOptions,
      correctAnswer: report.question.correctAnswer,
      correctAnswers,
      explanation: report.question.explanation || "",
      difficulty: report.question.difficulty as DifficultyLevel,
      isActive: report.question.isActive
    })
    setIsDialogOpen(true)
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

      const url = `/api/admin/question-groups/${params.id}/questions/${editingQuestion.id}`

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiData)
      })

      if (response.ok) {
        await fetchReportedQuestions()
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

  const resetForm = () => {
    setEditingQuestion(null)
    setFormData({
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

  const getQuestionTypeDisplay = (type: string) => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return "Multiple Choice"
      case "TRUE_FALSE":
        return "True/False"
      case "FILL_IN_BLANK":
        return "Fill in the Blank"
      case "MULTI_SELECT":
        return "Multi-Select"
      default:
        return type
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-100 text-green-800"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800"
      case "HARD":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh]"><HexagonLoader size={80} /></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reported Questions</h1>
          <p className="text-muted-foreground">
            Review and manage reported questions for this question group
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reported Questions</CardTitle>
          <CardDescription>
            Questions that users have reported issues with
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportedQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reported questions found for this question group.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Reported At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportedQuestions.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-xs">
                        {/* <RichTextDisplay content={report.question.content} /> */}
                        <p className="">{report.question.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getQuestionTypeDisplay(report.question.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDifficultyColor(report.question.difficulty)}>
                        {report.question.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.user.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{report.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog open={selectedReport?.id === report.id} onOpenChange={(open) => setSelectedReport(open ? report : null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Bug className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Report Details</DialogTitle>
                              <DialogDescription>
                                Review the reported question and user feedback
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* User Information */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Reported By</h4>
                                  <p className="font-medium">{selectedReport?.user.name || "Unknown"}</p>
                                  <p className="text-sm text-muted-foreground">{selectedReport?.user.email}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Reported At</h4>
                                  <p className="font-medium">
                                    {selectedReport ? format(new Date(selectedReport.createdAt), "MMM d, yyyy HH:mm") : ""}
                                  </p>
                                </div>
                              </div>

                              {/* Question Information */}
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Question</h4>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <div className="mb-3">
                                    <RichTextDisplay content={selectedReport?.question.content || ""} />
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium">Type:</span>
                                      <span className="ml-2">{selectedReport ? getQuestionTypeDisplay(selectedReport.question.type) : ""}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Difficulty:</span>
                                      <span className="ml-2">
                                        {selectedReport && (
                                          <Badge className={getDifficultyColor(selectedReport.question.difficulty)}>
                                            {selectedReport.question.difficulty}
                                          </Badge>
                                        )}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Group:</span>
                                      <span className="ml-2">{selectedReport?.question.group.name}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Question Details */}
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Question Details</h4>
                                <div className="space-y-3">
                                  <div>
                                    <span className="font-medium">Options:</span>
                                    <div className="mt-1 bg-muted/30 p-3 rounded text-sm">
                                      {selectedReport?.question.options ? selectedReport.question.options.split(',').map((option, index) => (
                                        <div key={index} className="py-1">
                                          {String.fromCharCode(65 + index)}. {option.trim()}
                                        </div>
                                      )) : "No options"}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Correct Answer:</span>
                                    <div className="mt-1  border border-green-200 p-3 rounded text-sm">
                                      {selectedReport?.question.correctAnswer || "No correct answer specified"}
                                    </div>
                                  </div>
                                  {selectedReport?.question.explanation && (
                                    <div>
                                      <span className="font-medium">Explanation:</span>
                                      <div className="mt-1 border border-blue-200 p-3 rounded text-sm">
                                        <RichTextDisplay content={selectedReport.question.explanation} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* User Suggestion */}
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">User Suggestion</h4>
                                <div className="border border-yellow-200 p-4 rounded">
                                  <p className="text-sm">{selectedReport?.suggestion || "No suggestion provided"}</p>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setSelectedReport(null)}
                              >
                                Close
                              </Button>
                              <Button
                                onClick={() => selectedReport && handleMarkAsUpdated(selectedReport.id)}
                                disabled={updating === selectedReport?.id}
                              >
                                {updating === selectedReport?.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  "Mark as Updated"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuestion(report)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Question Dialog - Exact same as questions page */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
    </div>
  )
}