"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Download, ArrowUpDown } from "lucide-react"
import { toasts } from "@/lib/toasts"
import HexagonLoader from "@/components/Loader/Loading"
import * as XLSX from "xlsx"

/* =========================
   HELPERS
========================= */

const formatDateDDMMYYYY = (dateString: string) => {
  const d = new Date(dateString)
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`
}

const formatSecondsToMinutes = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/* =========================
   TYPES
========================= */

interface Quiz {
  id: string
  title: string
  difficulty: string
  status: string
}

interface LeaderboardEntry {
  id: string
  user: { name?: string; email: string }
  score: number
  totalPoints: number
  timeTaken: number
  submittedAt: string
}

interface ResultMatrixEntry {
  id: string
  user: { email: string }
  status: string
  score?: number
  timeTaken?: number
  errors?: number
  submittedAt?: string
}

/* =========================
   COMPONENT
========================= */

export default function AnalysisPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [resultMatrix, setResultMatrix] = useState<ResultMatrixEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [isLeaderboardDialogOpen, setIsLeaderboardDialogOpen] = useState(false)
  const [isMatrixDialogOpen, setIsMatrixDialogOpen] = useState(false)

  const [search, setSearch] = useState("")
  const [scoreOrder, setScoreOrder] = useState<"desc" | "asc">("desc")

  useEffect(() => {
    fetch("/api/admin/quiz")
      .then(res => res.json())
      .then(setQuizzes)
      .catch(toasts.networkError)
      .finally(() => setLoading(false))
  }, [])

  const fetchLeaderboard = async (quizId: string) => {
    const res = await fetch(`/api/admin/analysis/${quizId}/leaderboard`)
    if (!res.ok) return
    setLeaderboard(await res.json())
  }

  const fetchResultMatrix = async (quizId: string) => {
    const res = await fetch(`/api/admin/analysis/${quizId}/result-matrix`)
    if (res.ok) setResultMatrix(await res.json())
  }

  /* =========================
     FILTER + SORT
  ========================= */

  const filteredLeaderboard = useMemo(() => {
    return [...leaderboard]
      .filter(e =>
        `${e.user.name ?? ""} ${e.user.email}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const scoreCompare =
          scoreOrder === "desc" ? b.score - a.score : a.score - b.score
        return scoreCompare || a.timeTaken - b.timeTaken
      })
  }, [leaderboard, search, scoreOrder])

  const filteredResultMatrix = useMemo(() => {
    return resultMatrix.filter(e =>
      e.user.email.toLowerCase().includes(search.toLowerCase())
    )
  }, [resultMatrix, search])

  /* =========================
     EXPORTS
  ========================= */

  const exportLeaderboardToExcel = () => {
    if (!selectedQuiz) return

    const data = filteredLeaderboard.map((e, i) => ({
      Rank: i + 1,
      Name: e.user.name || "N/A",
      Email: e.user.email,
      Score: `${e.score}/${e.totalPoints}`,
      "Time Taken (mm:ss)": formatSecondsToMinutes(e.timeTaken),
      "Submitted At": formatDateDDMMYYYY(e.submittedAt)
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard")
    XLSX.writeFile(wb, `${selectedQuiz.title}_Leaderboard.xlsx`)
  }

  const exportResultMatrixToExcel = () => {
    if (!selectedQuiz) return

    const data = filteredResultMatrix.map(e => ({
      Email: e.user.email,
      Status: e.status.replace("_", " "),
      Score: e.score ?? "-",
      "Time Taken (mm:ss)": e.timeTaken
        ? formatSecondsToMinutes(e.timeTaken)
        : "-",
      Errors: e.errors ?? "-",
      Submitted: e.submittedAt
        ? formatDateDDMMYYYY(e.submittedAt)
        : "-"
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Results")
    XLSX.writeFile(wb, `${selectedQuiz.title}_Results.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      {/* QUIZ LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Analytics</CardTitle>
          <CardDescription>Select quiz to view analytics</CardDescription>
        </CardHeader>
        <CardContent>
          {quizzes.map(q => (
            <div key={q.id} className="flex justify-between p-4 border rounded mb-3">
              <div>
                <h3 className="font-medium">{q.title}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge>{q.difficulty}</Badge>
                  <Badge variant="secondary">{q.status}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setSelectedQuiz(q)
                  fetchLeaderboard(q.id)
                  setIsLeaderboardDialogOpen(true)
                }}>
                  Leaderboard
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setSelectedQuiz(q)
                  fetchResultMatrix(q.id)
                  setIsMatrixDialogOpen(true)
                }}>
                  Results
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* LEADERBOARD POPUP */}
      <Dialog open={isLeaderboardDialogOpen} onOpenChange={setIsLeaderboardDialogOpen}>
        <DialogContent className="min-w-[95vw] h-[95vh] max-w-none flex flex-col">
          <DialogHeader className="flex flex-row items-center gap-4">
            <DialogTitle className="whitespace-nowrap">
              {selectedQuiz?.title} – Leaderboard
            </DialogTitle>

            <Input
              placeholder="Search name or email"
              className="max-w-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <Button
              variant="outline"
              onClick={() =>
                setScoreOrder(o => (o === "desc" ? "asc" : "desc"))
              }
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Score {scoreOrder === "desc" ? "↓" : "↑"}
            </Button>

            <div className="ml-auto">
              <Button variant="outline" onClick={exportLeaderboardToExcel} className="mr-6 text-green-500 hover:text-green-600 hover:bg-green-400/10">
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaderboard.map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell>#{i + 1}</TableCell>
                    <TableCell>{e.user.name || "N/A"}</TableCell>
                    <TableCell>{e.user.email}</TableCell>
                    <TableCell>{e.score}/{e.totalPoints}</TableCell>
                    <TableCell>{formatSecondsToMinutes(e.timeTaken)}</TableCell>
                    <TableCell>{formatDateDDMMYYYY(e.submittedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* RESULT MATRIX POPUP */}
      <Dialog open={isMatrixDialogOpen} onOpenChange={setIsMatrixDialogOpen}>
        <DialogContent className="min-w-[95vw] h-[95vh] max-w-none flex flex-col">
          <DialogHeader className="flex flex-row items-center gap-4">
            <DialogTitle className="whitespace-nowrap">
              {selectedQuiz?.title} – Result Matrix
            </DialogTitle>

            <Input
              placeholder="Search email"
              className="max-w-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="ml-auto">
              <Button variant="outline" onClick={exportResultMatrixToExcel} className="mr-6 text-green-500 hover:text-green-600 hover:bg-green-400/10">
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResultMatrix.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.user.email}</TableCell>
                    <TableCell>{e.status}</TableCell>
                    <TableCell>{e.score ?? "-"}</TableCell>
                    <TableCell>
                      {e.timeTaken ? formatSecondsToMinutes(e.timeTaken) : "-"}
                    </TableCell>
                    <TableCell>{e.errors ?? "-"}</TableCell>
                    <TableCell>
                      {e.submittedAt ? formatDateDDMMYYYY(e.submittedAt) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
