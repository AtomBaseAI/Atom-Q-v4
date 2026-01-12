"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  BookOpen,
  FileQuestion,
  ArrowUpDown,
  Loader2,
  Building2,
  MapPin,
  X,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import Image from "next/image"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface Campus {
  id: string
  name: string
  shortName: string
  logo?: string
  location: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    departments: number
    students: number
    quizzes: number
    assessments: number
    batches: number
  }
  departments: { id: string; name: string }[]
  batches: { id: string; name: string }[]
}

interface CreateFormData {
  name: string
  shortName: string
  logo: string
  location: string
  departments: { name: string }[]
  batches: { name: string }[]
}

interface EditFormData {
  name: string
  shortName: string
  logo: string
  location: string
  departments: { name: string }[]
  batches: { name: string }[]
}

export default function CampusPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null)
  const [campusToDelete, setCampusToDelete] = useState<Campus | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // Check if user is authenticated and is admin
  useEffect(() => {
    if (status === "loading") return
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
  }, [session, status, router])

  // Separate form states for create and edit
  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    name: "",
    shortName: "",
    logo: "",
    location: "",
    departments: [{ name: "" }],
    batches: [{ name: "" }],
  })

  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: "",
    shortName: "",
    logo: "",
    location: "",
    departments: [{ name: "" }],
    batches: [{ name: "" }],
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const columns: ColumnDef<Campus>[] = [
    {
      accessorKey: "logo",
      header: "Logo",
      cell: ({ row }) => {
        const campus = row.original
        return (
          <div className="w-10 h-10 relative">
            {campus.logo ? (
              <Image
                src={campus.logo}
                alt={campus.name}
                fill
                className="object-cover rounded-md"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "shortName",
      header: "Short Name",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("shortName")}</Badge>
      ),
    },
    {
      accessorKey: "_count.departments",
      header: "Departments",
      cell: ({ row }) => {
        const campus = row.original
        return campus._count?.departments || 0
      },
    },
    {
      accessorKey: "_count.batches",
      header: "Batches",
      cell: ({ row }) => {
        const campus = row.original
        return campus._count?.batches || 0
      },
    },
    {
      accessorKey: "_count.students",
      header: "Students",
      cell: ({ row }) => {
        const campus = row.original
        return campus._count?.students || 0
      },
    },
    {
      accessorKey: "_count.quizzes",
      header: "Quizzes",
      cell: ({ row }) => {
        const campus = row.original
        return campus._count?.quizzes || 0
      },
    },
    {
      accessorKey: "_count.assessments",
      header: "Assessments",
      cell: ({ row }) => {
        const campus = row.original
        return campus._count?.assessments || 0
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const campus = row.original
        return (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{campus.location}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const campus = row.original
        return (
          <Badge variant={campus.isActive ? "default" : "secondary"}>
            {campus.isActive ? "Active" : "Inactive"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created At
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return formatDateDDMMYYYY(date.toISOString())
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const campus = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/admin/campus/${campus.id}/departments`)}>
                <Building2 className="mr-2 h-4 w-4" />
                Manage Departments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/campus/${campus.id}/users`)}>
                <Users className="mr-2 h-4 w-4" />
                Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(campus)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(campus)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  useEffect(() => {
    if (status === "loading") return
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    
    fetchCampuses()
  }, [session, status, router])

  const fetchCampuses = async () => {
    if (!session) return
    
    try {
      const response = await fetch("/api/admin/campus")
      if (response.ok) {
        const data = await response.json()
        setCampuses(data)
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    // Validate that at least one department has a name
    const validDepartments = createFormData.departments.filter(d => d.name.trim() !== "")
    if (validDepartments.length === 0) {
      toasts.error("Please add at least one department")
      setSubmitLoading(false)
      return
    }

    try {
      const payload = {
        ...createFormData,
        departments: validDepartments,
      }
      
      const response = await fetch("/api/admin/campus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (response.ok) {
        toasts.success("Campus created successfully")
        setIsAddDialogOpen(false)
        resetCreateForm()
        fetchCampuses()
      } else {
        // Handle specific unauthorized error with better message
        if (response.status === 401) {
          toasts.error("You are not authorized to perform this action. Please log in again.")
          // Optionally redirect to login page after a delay
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          toasts.error(responseData.error || responseData.message || "Campus creation failed")
        }
      }
    } catch (error) {
      console.error("Campus creation error:", error)
      toasts.actionFailed("Campus creation")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    if (!selectedCampus) return

    try {
      const response = await fetch(`/api/admin/campus/${selectedCampus.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          departments: editFormData.departments.filter(d => d.name.trim() !== ""),
        }),
      })

      if (response.ok) {
        toasts.success("Campus updated successfully")
        setIsEditDialogOpen(false)
        setSelectedCampus(null)
        resetEditForm()
        fetchCampuses()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Campus update failed")
      }
    } catch (error) {
      toasts.actionFailed("Campus update")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteCampus = async (campusId: string) => {
    try {
      setDeleteLoading(campusId)
      const response = await fetch(`/api/admin/campus/${campusId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const campus = campuses.find(c => c.id === campusId)
        toasts.success(`${campus?.name || "Campus"} deleted successfully`)
        setCampuses(campuses.filter(campus => campus.id !== campusId))
        setIsDeleteDialogOpen(false)
        setCampusToDelete(null)
      } else {
        toasts.actionFailed("Campus deletion")
      }
    } catch (error) {
      toasts.actionFailed("Campus deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const openEditDialog = (campus: Campus) => {
    setSelectedCampus(campus)

    setEditFormData({
      name: campus.name,
      shortName: campus.shortName,
      logo: campus.logo || "",
      location: campus.location,
      departments: campus.departments.length > 0 ? campus.departments : [{ name: "" }],
      batches: campus.batches.length > 0 ? campus.batches : [{ name: "" }],
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (campus: Campus) => {
    setCampusToDelete(campus)
    setIsDeleteDialogOpen(true)
  }

  const resetCreateForm = () => {
    setCreateFormData({
      name: "",
      shortName: "",
      logo: "",
      location: "",
      departments: [{ name: "" }],
      batches: [{ name: "" }],
    })
  }

  const resetEditForm = () => {
    setEditFormData({
      name: "",
      shortName: "",
      logo: "",
      location: "",
      departments: [{ name: "" }],
      batches: [{ name: "" }],
    })
  }

  const addDepartment = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        departments: [...prev.departments, { name: "" }]
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        departments: [...prev.departments, { name: "" }]
      }))
    }
  }

  const addBatch = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        batches: [...prev.batches, { name: "" }]
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        batches: [...prev.batches, { name: "" }]
      }))
    }
  }

  const removeDepartment = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        departments: prev.departments.filter((_, i) => i !== index)
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        departments: prev.departments.filter((_, i) => i !== index)
      }))
    }
  }

  const removeBatch = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        batches: prev.batches.filter((_, i) => i !== index)
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        batches: prev.batches.filter((_, i) => i !== index)
      }))
    }
  }

  const updateDepartment = (index: number, value: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        departments: prev.departments.map((dept, i) => 
          i === index ? { name: value } : dept
        )
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        departments: prev.departments.map((dept, i) => 
          i === index ? { name: value } : dept
        )
      }))
    }
  }

  const updateBatch = (index: number, value: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        batches: prev.batches.map((batch, i) => 
          i === index ? { name: value } : batch
        )
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        batches: prev.batches.map((batch, i) => 
          i === index ? { name: value } : batch
        )
      }))
    }
  }

  if (loading || status === "loading") {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campus Management</h1>
          <p className="text-muted-foreground">
            Manage campuses and their departments
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campus
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campuses</CardTitle>
          <CardDescription>
            Manage all campuses and their departments in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={campuses}
            searchKey="name"
            searchPlaceholder="Search campuses..."
            filters={[
              {
                key: "isActive",
                label: "Status",
                options: [
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ],
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Create Campus Dialog */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Campus</SheetTitle>
            <SheetDescription>
              Add a new campus to the system
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campus Name</Label>
                <Input
                  id="name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter campus name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Short Name</Label>
                <Input
                  id="shortName"
                  value={createFormData.shortName}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="e.g., MIT, NYU"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={createFormData.location}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter campus location"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={createFormData.logo}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, logo: e.target.value }))}
                placeholder="Enter logo URL (optional)"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Departments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDepartment(false)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Department
                </Button>
              </div>
              <div className="space-y-2">
                {createFormData.departments.map((dept, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={dept.name}
                      onChange={(e) => updateDepartment(index, e.target.value, false)}
                      placeholder="Department name"
                      className="flex-1"
                    />
                    {createFormData.departments.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDepartment(index, false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Batches</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBatch(false)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Batch
                </Button>
              </div>
              <div className="space-y-2">
                {createFormData.batches.map((batch, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={batch.name}
                      onChange={(e) => updateBatch(index, e.target.value, false)}
                      placeholder="Batch name (e.g., 2014-2018)"
                      className="flex-1"
                    />
                    {createFormData.batches.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeBatch(index, false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <LoadingButton isLoading={submitLoading} type="submit">
                Create Campus
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Campus Dialog */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Campus</SheetTitle>
            <SheetDescription>
              Update campus information
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Campus Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter campus name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shortName">Short Name</Label>
                <Input
                  id="edit-shortName"
                  value={editFormData.shortName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="e.g., MIT, NYU"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editFormData.location}
                onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter campus location"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-logo">Logo URL</Label>
              <Input
                id="edit-logo"
                value={editFormData.logo}
                onChange={(e) => setEditFormData(prev => ({ ...prev, logo: e.target.value }))}
                placeholder="Enter logo URL (optional)"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Departments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDepartment(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Department
                </Button>
              </div>
              <div className="space-y-2">
                {editFormData.departments.map((dept, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={dept.name}
                      onChange={(e) => updateDepartment(index, e.target.value, true)}
                      placeholder="Department name"
                      className="flex-1"
                    />
                    {editFormData.departments.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDepartment(index, true)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Batches</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBatch(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Batch
                </Button>
              </div>
              <div className="space-y-2">
                {editFormData.batches.map((batch, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={batch.name}
                      onChange={(e) => updateBatch(index, e.target.value, true)}
                      placeholder="Batch name (e.g., 2014-2018)"
                      className="flex-1"
                    />
                    {editFormData.batches.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeBatch(index, true)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <LoadingButton isLoading={submitLoading} type="submit">
                Update Campus
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campus "{campusToDelete?.name}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => campusToDelete && handleDeleteCampus(campusToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteLoading !== null}
            >
              {deleteLoading === campusToDelete?.id ? (
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
  )
}