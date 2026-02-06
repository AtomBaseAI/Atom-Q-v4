"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler"
import { useTheme } from "next-themes"

export default function LandingPage() {
  const [siteTitle, setSiteTitle] = useState("Atom Q")
  const [mounted, setMounted] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    setMounted(true)

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/public/settings')
        if (response.ok) {
          const data = await response.json()
          setSiteTitle(data.siteTitle || "Atom Q")
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
    }

    fetchSettings()
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"

    // Apply theme changes instantly to CSS custom properties
    const root = document.documentElement
    if (newTheme === "dark") {
      root.style.setProperty("--background", "oklch(0.145 0 0)")
      root.style.setProperty("--foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--card", "oklch(0.205 0 0)")
      root.style.setProperty("--card-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--popover", "oklch(0.205 0 0)")
      root.style.setProperty("--popover-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--primary", "oklch(0.75 0.18 45)")
      root.style.setProperty("--primary-foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--secondary", "oklch(0.269 0 0)")
      root.style.setProperty("--secondary-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--muted", "oklch(0.269 0 0)")
      root.style.setProperty("--muted-foreground", "oklch(0.708 0 0)")
      root.style.setProperty("--accent", "oklch(0.45 0.15 45)")
      root.style.setProperty("--accent-foreground", "oklch(0.75 0.18 45)")
      root.style.setProperty("--destructive", "oklch(0.704 0.191 22.216)")
      root.style.setProperty("--destructive-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--border", "oklch(1 0 0 / 10%)")
      root.style.setProperty("--input", "oklch(1 0 0 / 15%)")
      root.style.setProperty("--ring", "oklch(0.7 0.15 45)")
    } else {
      root.style.setProperty("--background", "oklch(1 0 0)")
      root.style.setProperty("--foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--card", "oklch(1 0 0)")
      root.style.setProperty("--card-foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--popover", "oklch(1 0 0)")
      root.style.setProperty("--popover-foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--primary", "oklch(0.7 0.2 45)")
      root.style.setProperty("--primary-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--secondary", "oklch(0.97 0 0)")
      root.style.setProperty("--secondary-foreground", "oklch(0.205 0 0)")
      root.style.setProperty("--muted", "oklch(0.97 0 0)")
      root.style.setProperty("--muted-foreground", "oklch(0.556 0 0)")
      root.style.setProperty("--accent", "oklch(0.85 0.12 45)")
      root.style.setProperty("--accent-foreground", "oklch(0.7 0.2 45)")
      root.style.setProperty("--destructive", "oklch(0.577 0.245 27.325)")
      root.style.setProperty("--destructive-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--border", "oklch(0.922 0 0)")
      root.style.setProperty("--input", "oklch(0.922 0 0)")
      root.style.setProperty("--ring", "oklch(0.7 0.15 45)")
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{siteTitle}</h1>
          <AnimatedThemeToggler />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to {siteTitle}
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            A comprehensive knowledge testing portal for assessments, quizzes, and learning management.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/login">
                Login to Continue
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/register">
                Create Account
              </Link>
            </Button>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Assessments</h3>
              <p className="text-sm text-muted-foreground">
                Take comprehensive assessments to test your knowledge and track your progress.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Quizzes</h3>
              <p className="text-sm text-muted-foreground">
                Participate in interactive quizzes and compete with others on the leaderboard.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-muted-foreground">
                View detailed analytics and insights to improve your performance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {siteTitle}. Powered by Atom Labs.</p>
        </div>
      </footer>
    </div>
  )
}
