"use client"

import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Plus,
  ChevronLeft,
  Trash2,
  Users,
  Download,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import Papa from "papaparse"
import HexagonLoader from "@/components/Loader/Loading"

interface User {
  id: string
  name: string
  email: string
  campus?: {
    name: string
  }
}

interface Enrollment {
  id: string
  user: User
  createdAt: string
}

interface Assessment {
  id: string
  title: string
}

export default function AssessmentEnrollmentsPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [campusFilter, setCampusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedUsersToEnroll, setSelectedUsersToEnroll] = useState<string[]>([])
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [unenrollLoading, setUnenrollLoading] = useState<string | null>(null)
  const [deleteEnrollmentId, setDeleteEnrollmentId] = useState<string | null>(null)

  useEffect(() => {
    fetchAssessment()
    fetchEnrollments()
    fetchAvailableUsers()
  }, [assessmentId])

  useEffect(() => {
    fetchAvailableUsers()
  }, [searchTerm, campusFilter])

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`)
      if (response.ok) {
        const data = await response.json()
        setAssessment(data)
      }
    } catch (error) {
      console.error("Failed to fetch assessment:", error)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/enrollments`)
      if (response.ok) {
        const data = await response.json()
        setEnrollments(data)
      }
    } catch (error) {
      toast.error("Failed to fetch enrollments")
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (campusFilter !== "all") params.append("campusId", campusFilter)
      
      const response = await fetch(`/api/admin/assessments/${assessmentId}/available-users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data)
      }
    } catch (error) {
      toast.error("Failed to fetch available users")
    }
  }

  const handleEnrollUsers = async (userIds: string[]) => {
    if (userIds.length === 0) return
    
    setEnrollLoading(true)
    
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
      })

      if (response.ok) {
        const results = await response.json()
        const successful = results.filter((r: any) => r.success).length
        const failed = results.length - successful
        
        if (successful > 0) {
          toast.success(`Successfully enrolled ${successful} user${successful !== 1 ? 's' : ''}`)
        }
        
        if (failed > 0) {
          toast.error(`Failed to enroll ${failed} user${failed !== 1 ? 's' : ''}`)
        }
        
        setIsAddDialogOpen(false)
        setSelectedUsersToEnroll([])
        fetchEnrollments()
        fetchAvailableUsers()
      } else {
        toast.error("Failed to enroll users")
      }
    } catch (error) {
      toast.error("Failed to enroll users")
    } finally {
      setEnrollLoading(false)
    }
  }

  const handleUnenrollUser = async (enrollmentId: string) => {
    setUnenrollLoading(enrollmentId)
    
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/enrollments/${enrollmentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("User unenrolled successfully")
        setEnrollments(enrollments.filter(e => e.id !== enrollmentId))
        fetchAvailableUsers()
        setDeleteEnrollmentId(null)
      } else {
        toast.error("Failed to unenroll user")
      }
    } catch (error) {
      toast.error("Failed to unenroll user")
    } finally {
      setUnenrollLoading(null)
    }
  }

  const handleExportEnrollments = () => {
    const csvContent = [
      ["Name", "Email", "Campus", "Enrolled At"],
      ...enrollments.map(enrollment => [
        enrollment.user.name || "",
        enrollment.user.email,
        enrollment.user.campus?.name || "General",
        new Date(enrollment.createdAt).toLocaleString()
      ])
    ].map(row =>
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
    a.download = `${assessment?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'assessment'}_enrollments.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Enrollments exported to CSV")
  }

  const handleQuestionSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsersToEnroll(prev => [...prev, userId])
    } else {
      setSelectedUsersToEnroll(prev => prev.filter(id => id !== userId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsersToEnroll(availableUsers.map(u => u.id))
    } else {
      setSelectedUsersToEnroll([])
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
          <h1 className="text-3xl font-bold">Assessment Enrollments</h1>
          <p className="text-muted-foreground">
            Manage user enrollments for "{assessment?.title}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Enrolled Users</CardTitle>
              <CardDescription>
                Users enrolled in this assessment ({enrollments.length} total)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportEnrollments}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Enroll Users
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No users enrolled in this assessment yet
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Enroll Users
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Enrolled At</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      {enrollment.user.name || "N/A"}
                    </TableCell>
                    <TableCell>{enrollment.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {enrollment.user.campus?.name || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(enrollment.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => setDeleteEnrollmentId(enrollment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unenroll User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unenroll "{enrollment.user.name || enrollment.user.email}" from this assessment? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <LoadingButton
                              onClick={() => handleUnenrollUser(enrollment.id)}
                              loading={unenrollLoading === enrollment.id}
                              variant="destructive"
                            >
                              Unenroll
                            </LoadingButton>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enroll Users Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Users in Assessment</DialogTitle>
            <DialogDescription>
              Select users to enroll in this assessment
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-4 p-4 border-b">
            <div className="flex-1">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={campusFilter} onValueChange={setCampusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Campus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                <SelectItem value="">General</SelectItem>
                {/* Add more campus options as needed */}
              </SelectContent>
            </Select>
          </div>

          {/* Users List */}
          <div className="max-h-96 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No available users found</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedUsersToEnroll.length === availableUsers.length && availableUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({selectedUsersToEnroll.length} selected)
                  </Label>
                </div>
                {availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsersToEnroll.includes(user.id)}
                      onCheckedChange={(checked) => handleQuestionSelect(user.id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={user.id} className="text-sm font-medium cursor-pointer">
                        {user.name || "N/A"}
                      </Label>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.campus && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {user.campus.name}
                        </Badge>
                      )}
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
              onClick={() => handleEnrollUsers(selectedUsersToEnroll)}
              disabled={selectedUsersToEnroll.length === 0}
              loading={enrollLoading}
            >
              Enroll {selectedUsersToEnroll.length} User{selectedUsersToEnroll.length !== 1 ? 's' : ''}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}