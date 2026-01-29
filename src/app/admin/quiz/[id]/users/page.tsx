
"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Search,
  UserPlus,
  UserMinus,
  Users,
  BookOpen,
  ArrowUpDown,
  ChevronLeft,
  Filter,
  X
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

// Import toast functions that were missing in the original code
import { toast } from "sonner";
import HexagonLoader from "@/components/Loader/Loading"

interface User {
  id: string
  name: string
  email: string
  campus?: string | { name: string }
  enrolled: boolean
}

interface Quiz {
  id: string
  title: string
  description?: string
  category?: { name: string }
  timeLimit?: number
  difficulty: string
  status: string
}

export default function QuizUsersPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false)
  const [isUnenrollDialogOpen, setIsUnenrollDialogOpen] = useState(false)
  const [userToUnenroll, setUserToUnenroll] = useState<User | null>(null)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isUnenrolling, setIsUnenrolling] = useState(false)

  // Filter states for enrollment popup
  const [enrollSearchTerm, setEnrollSearchTerm] = useState("")
  const [enrollCampusFilter, setEnrollCampusFilter] = useState<string>("all")


  useEffect(() => {
    fetchQuizData()
    fetchEnrolledUsers()
  }, [quizId])

  useEffect(() => {
    if (isEnrollDialogOpen) {
      fetchAvailableUsers()
    }
  }, [isEnrollDialogOpen, enrollSearchTerm, enrollCampusFilter])

  const fetchQuizData = async () => {
    try {
      const response = await fetch(`/api/admin/quiz/${quizId}`)
      if (response.ok) {
        const data = await response.json()
        setQuiz(data)
      }
    } catch (error) {
      console.error("Error fetching quiz:", error)
    }
  }

  const fetchEnrolledUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching enrolled users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const params = new URLSearchParams({
        quizId,
        ...(enrollSearchTerm && { search: enrollSearchTerm }),
        ...(enrollCampusFilter !== "all" && { campus: enrollCampusFilter }),
      })

      const response = await fetch(`/api/admin/students/available?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data)
      }
    } catch (error) {
      console.error("Error fetching available users:", error)
    }
  }

  const handleEnrollUsers = async () => {
    if (selectedUsers.length === 0) return

    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers
        })
      })

      if (response.ok) {
        toast.success(`${selectedUsers.length} user(s) enrolled successfully`)
        setIsEnrollDialogOpen(false)
        setSelectedUsers([])
        // Reset filters
        setEnrollSearchTerm("")
        setEnrollCampusFilter("all")
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to enroll users')
      }
    } catch (error) {
      toast.error('Failed to enroll users')
    }
  }

  const handleUnenrollUser = async () => {
    if (!userToUnenroll) return

    setIsUnenrolling(true)

    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/users/${userToUnenroll.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('User unenrolled successfully')
        setIsUnenrollDialogOpen(false)
        setUserToUnenroll(null)
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to unenroll user')
      }
    } catch (error) {
      toast.error('Failed to unenroll user')
    } finally {
      setIsUnenrolling(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filtered available users for enrollment dialog
  const filteredAvailableUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(enrollSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(enrollSearchTerm.toLowerCase())
  ).filter(user =>
    enrollCampusFilter === "all" || user.campus === enrollCampusFilter
  )

  // Helper functions for user selection
  const hasActiveEnrollFilters = () => {
    return enrollSearchTerm !== "" || enrollCampusFilter !== "all"
  }

  const selectAllUsers = () => {
    const allUserIds = availableUsers.map(u => u.id)
    setSelectedUsers(allUserIds)
  }

  const selectFilteredUsers = () => {
    const filteredUserIds = filteredAvailableUsers.map(u => u.id)
    setSelectedUsers(filteredUserIds)
  }

  const clearUserSelection = () => {
    setSelectedUsers([])
  }

  // Effect to update selection when filters change
  useEffect(() => {
    if (selectedUsers.length > 0) {
      const visibleUserIds = filteredAvailableUsers.map(u => u.id)
      const updatedSelection = selectedUsers.filter(id => 
        visibleUserIds.includes(id)
      )
      if (updatedSelection.length !== selectedUsers.length) {
        setSelectedUsers(updatedSelection)
      }
    }
  }, [enrollSearchTerm, enrollCampusFilter])

  // Get unique campuses for filters
  const uniqueCampuses = useMemo(() => {
    const campuses = users.map(user => {
      // Handle both string and object campus values
      if (typeof user.campus === 'string') {
        return user.campus
      } else if (user.campus && typeof user.campus === 'object') {
        // Extract name from campus object, handle nested structures
        return user.campus.name ||
               user.campus.shortName ||
               JSON.stringify(user.campus)
      }
      return null
    }).filter(Boolean) as string[]
    return [...new Set(campuses)]
  }, [users])

  // Get unique campuses for enrollment filters
  const enrollUniqueCampuses = useMemo(() => {
    const campuses = availableUsers.map(user => {
      // Handle both string and object campus values
      if (typeof user.campus === 'string') {
        return user.campus
      } else if (user.campus && typeof user.campus === 'object') {
        // Extract name from campus object, handle nested structures
        return user.campus.name ||
               user.campus.shortName ||
               JSON.stringify(user.campus)
      }
      return null
    }).filter(Boolean) as string[]
    return [...new Set(campuses)]
  }, [availableUsers])

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "campus",
      header: "Campus",
      cell: ({ row }) => {
        const campus = row.getValue("campus")
        if (typeof campus === 'string') {
          return campus || "-"
        } else if (campus && typeof campus === 'object') {
          return campus.name || campus.shortName || "-"
        }
        return "-"
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUserToUnenroll(user)
              setIsUnenrollDialogOpen(true)
            }}
            className="text-red-600 hover:text-red-700"
          >
            <UserMinus className="h-4 w-4 mr-1" />
            Unenroll
          </Button>
        )
      },
    },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-center">
        <div className="flex flex-row justify-start items-center w-1/2 gap-1">
          <div className="h-full flex flex-row drak:bg-slate-400 mr-2">
            <h1 className="mr-1">{quiz?.title} </h1> (<p>{users.length}</p>)
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-row justify-end items-center w-1/2 gap-1">
          <Button
            onClick={() => {
              // Reset filters when opening dialog
              setEnrollSearchTerm("")
              setEnrollCampusFilter("all")
              setIsEnrollDialogOpen(true)
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Users
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredUsers}
        searchKey="name"
        searchPlaceholder="Search enrolled users..."
        filters={[
          {
            key: "campus",
            label: "Campus",
            options: [
              { value: "all", label: "All Campuses" },
              ...uniqueCampuses.map((campus, index) => {
                // Ensure campus is always a string
                const campusString = typeof campus === 'string' ? campus : String(campus)
                return { value: campusString, label: campusString }
              })
            ],
          },
        ]}
      />

      {/* Enroll Users Dialog */}
      <Sheet open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <SheetContent className="min-w-[100vw] sm:w-[90vw] min-h-[100vh]">
          <SheetTitle className="hidden">Enroll Users</SheetTitle>
          <div className="mt-6 px-4">
            <div className="space-y-4">
              {/* Search and Filters Section */}
              <div className="space-y-4 w-full mt-4 flex flex-row gap-4 items-center justify-center">
                {/* Search Input */}
                <div className="relative w-1/3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={enrollSearchTerm}
                    onChange={(e) => setEnrollSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Filters Row */}
                <div className="flex gap-4 flex-wrap w-1/3 flex-row">
                  {/* Campus Filter */}
                  <Select value={enrollCampusFilter} onValueChange={setEnrollCampusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {enrollUniqueCampuses.map((campus, index) => {
                        // Ensure campus is always a string
                        const campusString = typeof campus === 'string' ? campus : String(campus)
                        const campusKey = campusString === '[object Object]' ? `campus-${index}` : campusString
                        return (
                          <SelectItem key={campusKey} value={campusString}>
                            {campusString}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  {/* Clear Filters Button */}
                  {(enrollSearchTerm || enrollCampusFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEnrollSearchTerm("")
                        setEnrollCampusFilter("all")
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end items-center w-1/3 gap-2">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleEnrollUsers}
                      disabled={selectedUsers.length === 0}
                    >
                      Enroll Selected Users ({selectedUsers.length})
                    </Button>
                  </div>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={hasActiveEnrollFilters() ? selectFilteredUsers : selectAllUsers}
                    disabled={filteredAvailableUsers.length === 0}
                  >
                    {hasActiveEnrollFilters() ? `Select Filtered (${filteredAvailableUsers.length})` : `Select All (${availableUsers.length})`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearUserSelection}
                    disabled={selectedUsers.length === 0}
                  >
                    Clear Selection ({selectedUsers.length})
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedUsers.length} of {filteredAvailableUsers.length} selected
                </div>
              </div>

              {/* Users List */}
              <div className="min-h-[100%] h-full overflow-y-scroll space-y-2 w-full">
                {filteredAvailableUsers.length > 0 ? (
                  filteredAvailableUsers.map((user) => (
                    <div key={user.id} className="flex flex-row items-start space-x-3 p-3 border rounded hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id])
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                          }
                        }}
                        className="h-4 w-4 mt-1"
                      />
                      <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer flex flex-row gap-4 justify-start items-center">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground"><b className="text-primary">Email : </b> {user.email}</div>
                        {user.campus && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <b className="text-primary">Campus : </b> {user.campus}
                          </div>
                        )}
                      </label>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {enrollSearchTerm
                      ? "No users match your search criteria"
                      : "No available users found"
                    }
                  </div>
                )}
              </div>

              {selectedUsers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedUsers.length} user(s) selected for enrollment
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Unenroll User Dialog */}
      <AlertDialog open={isUnenrollDialogOpen} onOpenChange={setIsUnenrollDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll "{userToUnenroll?.name}" from this quiz?
              This action cannot be undone and will remove their quiz data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToUnenroll(null)}>
              Cancel
            </AlertDialogCancel>
            <LoadingButton
              onClick={handleUnenrollUser}
              isLoading={isUnenrolling}
              loadingText="Unenrolling..."
              className="bg-red-600 hover:bg-red-700"
            >
              Unenroll User
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}