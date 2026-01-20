"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MoreHorizontal,
  UserPlus,
  Download,
  Upload,
  Edit,
  Trash2,
  ArrowUpDown,
  Loader2,
  X
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { UserRole, StudentSection } from "@prisma/client"
import Papa from "papaparse"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  phone?: string
  section?: string
  campus?: string
  department?: string
  batch?: string
  createdAt: string
}

interface Campus {
  id: string
  name: string
  shortName: string
  departments: { id: string; name: string }[]
}

interface FormData {
  name: string
  email: string
  password: string
  role: UserRole
  phone: string
  campus: string
  department: string
  batch: string
  section: StudentSection
  isActive: boolean
}

export default function UsersPage() {
  const router = useRouter()
  const { session, status, isLoading, isAuthenticated, isAdmin } = useAdminAuth()
  const [users, setUsers] = useState<User[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    role: UserRole.USER,
    phone: "",
    campus: "",
    department: "",
    batch: "",
    section: StudentSection.A,
    isActive: true,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get unique campuses for filters
  const uniqueCampuses = useMemo(() => {
    const campuses = users.map(user => user.campus).filter(Boolean) as string[]
    return [...new Set(campuses)]
  }, [users])



  const columns: ColumnDef<User>[] = [
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
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      filterFn: (row, id, value) => {
        return value === "all" || row.getValue("role") === value
      },
      cell: ({ row }) => {
        const role = row.getValue("role") as UserRole
        return (
          <Badge variant={role === UserRole.ADMIN ? "destructive" : "default"}>
            {role}
          </Badge>
        )
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.getValue("phone") || "-",
    },
    {
      accessorKey: "campus",
      header: "Campus",
      filterFn: (row, id, value) => {
        return value === "all" || row.getValue("campus") === value
      },
      cell: ({ row }) => row.getValue("campus") || "-",
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.getValue("department") || "-",
    },
    {
      accessorKey: "batch",
      header: "Batch",
      cell: ({ row }) => row.getValue("batch") || "-",
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => {
        const section = row.getValue("section") as string
        return section ? `Section ${section}` : "-"
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      filterFn: (row, id, value) => {
        if (value === "all") return true
        const isActive = row.getValue("isActive") as boolean
        return isActive === (value === "true")
      },
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
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
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(user)}
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
    if (status === "loading" || !isAuthenticated || !isAdmin) return
    
    fetchCampuses()
    fetchUsers()
  }, [session, status, isAuthenticated, isAdmin, router])

  const fetchBatches = async (campusId: string) => {
    if (!campusId || campusId === "general") {
      setBatches([])
      return
    }
    
    try {
      const response = await fetch(`/api/admin/campus/${campusId}`)
      if (response.ok) {
        const campus = await response.json()
        setBatches(campus.batches || [])
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
      setBatches([])
    }
  }

  const fetchCampuses = async () => {
    if (!isAuthenticated || !isAdmin) {
      return
    }
    
    try {
      const response = await fetch("/api/admin/campus")
      if (response.ok) {
        const data = await response.json()
        setCampuses(data)
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      } else {
        toasts.error("Failed to fetch campuses")
      }
    } catch (error) {
      toasts.networkError()
    }
  }

  const fetchUsers = async () => {
    if (!isAuthenticated || !isAdmin) {
      return
    }
    
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      } else {
        toasts.error("Failed to fetch users")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isEditing = selectedUser !== null
    setSubmitLoading(true)

    try {
      const url = isEditing ? `/api/admin/users/${selectedUser.id}` : "/api/admin/users"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toasts.success(isEditing ? "User updated successfully" : "User created successfully")
        setIsAddDialogOpen(false)
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        resetForm()
        fetchUsers()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Operation failed")
      }
    } catch (error) {
      toasts.actionFailed(isEditing ? "User update" : "User creation")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    try {
      setDeleteLoading(userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const user = users.find(u => u.id === userId)
        toasts.userDeleted(user?.name || "User")
        setUsers(users.filter(user => user.id !== userId))
        setIsDeleteDialogOpen(false)
        setUserToDelete(null)
        setDeleteConfirmation("")
      } else {
        toasts.actionFailed("User deletion")
      }
    } catch (error) {
      toasts.actionFailed("User deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      phone: user.phone || "",
      campus: user.campus || "",
      department: user.department || "",
      isActive: user.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user)
    setDeleteConfirmation("")
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: UserRole.USER,
      phone: "",
      campus: "",
      department: "",
      batch: "",
      section: StudentSection.A,
      isActive: true,
    })
    setBatches([])
  }

  const handleExportUsers = () => {
    const csvData = users.map(user => ({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      campus: user.campus || "",
      department: user.department || "",
      isActive: user.isActive,
      createdAt: user.createdAt,
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "users.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toasts.success("Users exported successfully")
  }

  const handleImportUsers = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Papa.parse(file, {
        complete: async (results) => {
          try {
            const response = await fetch("/api/admin/users", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ importData: results.data }),
            })

            if (response.ok) {
              const result = await response.json()
              toasts.success(result.message || "Users imported successfully")
              fetchUsers()
            } else {
              const error = await response.json()
              toasts.error(error.message || "Import failed")
            }
          } catch (error) {
            toasts.actionFailed("User import")
          }
        },
        header: true,
        skipEmptyLines: true,
      })
    }
  }

  if (loading || isLoading) {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={handleImportUsers}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
        
          <DataTable
            columns={columns}
            data={users}
            searchKey="name"
            searchPlaceholder="Search users..."
            filters={[
              {
                key: "role",
                label: "Role",
                options: [
                  { value: "all", label: "All Roles" },
                  { value: "ADMIN", label: "ADMIN" },
                  { value: "USER", label: "USER" },
                ],
              },
              {
                key: "isActive",
                label: "Status",
                options: [
                  { value: "all", label: "All Status" },
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ],
              },
              {
                key: "campus",
                label: "Campus",
                options: [
                  { value: "all", label: "All Campuses" },
                  ...uniqueCampuses.map(campus => ({ value: campus, label: campus }))
                ],
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Add User Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New User</SheetTitle>
            <SheetDescription>
              Create a new user account with the specified details.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <div className="grid gap-3">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-password">Password</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-campus">Campus</Label>
                <Select value={formData.campus} onValueChange={(value) => {
                  setFormData({ ...formData, campus: value, department: "", batch: "" })
                  fetchBatches(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-department">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  disabled={formData.campus === "" || formData.campus === "general"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {formData.campus && formData.campus !== "general" && 
                      campuses.find(c => c.id === formData.campus)?.departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-batch">Batch</Label>
                <Select 
                  value={formData.batch} 
                  onValueChange={(value) => setFormData({ ...formData, batch: value })}
                  disabled={formData.campus === "" || formData.campus === "general"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-section">Section</Label>
                <Select 
                  value={formData.section} 
                  onValueChange={(value: StudentSection) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={StudentSection.A}>Section A</SelectItem>
                    <SelectItem value={StudentSection.B}>Section B</SelectItem>
                    <SelectItem value={StudentSection.C}>Section C</SelectItem>
                    <SelectItem value={StudentSection.D}>Section D</SelectItem>
                    <SelectItem value={StudentSection.E}>Section E</SelectItem>
                    <SelectItem value={StudentSection.F}>Section F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-role">Role</Label>
                <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.USER}>User</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="add-active">Active</Label>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                loadingText="Creating..."
              >
                Create User
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit User Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
            <SheetDescription>
              Update user account details.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <div className="grid gap-3">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-campus">Campus</Label>
                <Select value={formData.campus} onValueChange={(value) => {
                  setFormData({ ...formData, campus: value, department: "" })
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-department">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  disabled={formData.campus === "" || formData.campus === "general"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {formData.campus && formData.campus !== "general" && 
                      campuses.find(c => c.id === formData.campus)?.departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.USER}>User</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="edit-active">Active</Label>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                loadingText="Updating..."
              >
                Update User
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{userToDelete?.name}"? This action cannot be undone.
              <div className="mt-4 space-y-2">
                <Label htmlFor="delete-confirmation">
                  <span className="font-semibold text-destructive">CONFIRM DELETE</span> to proceed:
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="CONFIRM DELETE"
                  autoComplete="off"
                  className="uppercase"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false)
              setUserToDelete(null)
              setDeleteConfirmation("")
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteLoading === userToDelete?.id || deleteConfirmation !== "CONFIRM DELETE"}
            >
              {deleteLoading === userToDelete?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}