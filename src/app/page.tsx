"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTheme } from "next-themes"
import { toasts } from "@/lib/toasts"
import HexagonLoader from "@/components/Loader/Loading"
import { LoginForm } from "@/components/forms/login-form"
import { useUserStore } from "@/stores/user"
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler"

function LoginPage() {
  const [error, setError] = useState("")
  const [siteTitle, setSiteTitle] = useState("Atom Q")
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const { user } = useUserStore()

  // Fetch basic settings locally for login screen only
  useEffect(() => {
    const fetchLoginSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings')
        if (response.ok) {
          const data = await response.json()
          setSiteTitle(data.siteTitle || "Atom Q")
          setIsMaintenanceMode(data.maintenanceMode || false)
        }
      } catch (error) {
        console.error('Failed to fetch login settings:', error)
      }
    }
    
    fetchLoginSettings()
  }, [])

  useEffect(() => {
    const maintenanceError = searchParams.get('error')
    if (maintenanceError === 'maintenance') {
      setError("Site is under maintenance. Only administrators can login.")
    }
  }, [searchParams])

  // Redirect based on role when session is available and authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      if (session.user.role === 'ADMIN') {
        router.push("/admin")
      } else {
        router.push("/user")
      }
    }
  }, [session, status, router])

  // Remove the problematic redirect that uses user store without session
  // This was causing the infinite redirect loop after logout

  // Handle maintenance mode
  useEffect(() => {
    if (isMaintenanceMode) {
      setError("Site is under maintenance. Only administrators can login.")
    }
  }, [isMaintenanceMode])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    
    // Apply theme changes instantly to CSS custom properties
    const root = document.documentElement
    if (newTheme === "dark") {
      root.style.setProperty("--background", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--card", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--card-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--popover", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--popover-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--primary", "hsl(270 100% 50%)")
      root.style.setProperty("--primary-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--secondary", "hsl(217.2 32.6% 17.5%)")
      root.style.setProperty("--secondary-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--muted", "hsl(217.2 32.6% 17.5%)")
      root.style.setProperty("--muted-foreground", "hsl(215 20.2% 65.1%)")
      root.style.setProperty("--accent", "hsl(217.2 32.6% 17.5%)")
      root.style.setProperty("--accent-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--destructive", "hsl(0 62.8% 30.6%)")
      root.style.setProperty("--destructive-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--border", "hsl(217.2 32.6% 17.5%)")
      root.style.setProperty("--input", "hsl(217.2 32.6% 17.5%)")
      root.style.setProperty("--ring", "hsl(224.3 76.3% 94.1%)")
    } else {
      root.style.setProperty("--background", "hsl(0 0% 100%)")
      root.style.setProperty("--foreground", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--card", "hsl(0 0% 100%)")
      root.style.setProperty("--card-foreground", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--popover", "hsl(0 0% 100%)")
      root.style.setProperty("--popover-foreground", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--primary", "hsl(270 100% 50%)")
      root.style.setProperty("--primary-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--secondary", "hsl(210 40% 96%)")
      root.style.setProperty("--secondary-foreground", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--muted", "hsl(210 40% 96%)")
      root.style.setProperty("--muted-foreground", "hsl(215.4 16.3% 46.9%)")
      root.style.setProperty("--accent", "hsl(210 40% 96%)")
      root.style.setProperty("--accent-foreground", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--destructive", "hsl(0 84.2% 60.2%)")
      root.style.setProperty("--destructive-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--border", "hsl(214.3 31.8% 91.4%)")
      root.style.setProperty("--input", "hsl(214.3 31.8% 91.4%)")
      root.style.setProperty("--ring", "hsl(270 100% 50%)")
    }
  }

  const handleLoginSuccess = () => {
    // The redirect will be handled by the useEffect hooks
  }

  const handleLoginError = (errorMessage: string) => {
    // Error is already handled by the form component
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
       <AnimatedThemeToggler />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{siteTitle}</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <LoginForm 
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-0">
          <div className="text-center text-sm">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline">
              Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>}>
      <LoginPage />
    </Suspense>
  )
}