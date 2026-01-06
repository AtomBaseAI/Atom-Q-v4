"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Eye, TriangleAlert, Loader2 } from "lucide-react"
import { format } from "date-fns"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"

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
  _count: {
    questions: number
  }
}

export default function QuestionsPage() {
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<QuestionGroup | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true
  })

  useEffect(() => {
    fetchQuestionGroups()
  }, [])

  const fetchQuestionGroups = async () => {
    try {
      const response = await fetch("/api/admin/question-groups")
      if (response.ok) {
        const data = await response.json()
        setQuestionGroups(data)
      }
    } catch (error) {
      console.error("Error fetching question groups:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)
    
    try {
      const url = editingGroup 
        ? `/api/admin/question-groups/${editingGroup.id}`
        : "/api/admin/question-groups"
      
      const method = editingGroup ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchQuestionGroups()
        setIsSheetOpen(false)
        resetForm()
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error saving question group:", error)
      alert("Error saving question group. Please try again.")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (group: QuestionGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || "",
      isActive: group.isActive
    })
    setIsSheetOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(id)
      const response = await fetch(`/api/admin/question-groups/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await fetchQuestionGroups()
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error deleting question group:", error)
      alert("Error deleting question group. Please try again.")
    } finally {
      setDeleteLoading(null)
    }
  }

  const resetForm = () => {
    setEditingGroup(null)
    setFormData({
      name: "",
      description: "",
      isActive: true
    })
  }

  if (loading) {
    return  <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Groups</h1>
          <p className="text-muted-foreground">
            Manage question groups and organize your questions
          </p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Group
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <form onSubmit={handleSubmit}>
              <SheetHeader >
                <SheetTitle>
                  {editingGroup ? "Edit Question Group" : "Create Question Group"}
                </SheetTitle>
                <SheetDescription>
                  {editingGroup 
                    ? "Update the question group details below."
                    : "Create a new question group to organize your questions."
                  }
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isActive" className="text-right">
                    Active
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
              <SheetFooter>
                <LoadingButton 
                  type="submit" 
                  isLoading={submitLoading}
                  loadingText={editingGroup ? "Updating..." : "Creating..."}
                >
                  {editingGroup ? "Update" : "Create"}
                </LoadingButton>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Groups</CardTitle>
          <CardDescription>
            A list of all question groups in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {group._count.questions} questions
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(group.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={`/admin/question-groups/${group.id}/questions`}>
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={`/admin/question-groups/${group.id}/reported-questions`}>
                          <TriangleAlert className="h-4 w-4 text-yellow-600" />
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleteLoading === group.id}
                          >
                            {deleteLoading === group.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Question Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{group.name}"? This will also delete all questions in this group. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(group.id)}
                              className="bg-destructive hover:bg-destructive/90"
                              disabled={deleteLoading === group.id}
                            >
                              {deleteLoading === group.id ? (
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
          {questionGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No question groups found. Create your first group to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}