
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { toasts } from "@/lib/toasts"
import { registerSchema } from "@/schema/auth"
import { registerAction } from "@/actions/auth"
import type { z } from "zod"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { useSettingsSync } from "@/hooks/use-settings-sync"
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler"

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { siteTitle, allowRegistration } = useSettingsSync()

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    }
  })

  // Check if registration is allowed
  if (allowRegistration === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">{siteTitle}</CardTitle>
            <CardDescription className="text-center">
              Registration is currently disabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                User registration is currently disabled. Please contact the administrator for access.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              className="w-full"
              onClick={() => router.push("/")}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('password', data.password)
      formData.append('confirmPassword', data.confirmPassword)
      if (data.phone) formData.append('phone', data.phone)

      const result = await registerAction(formData)

      if (result?.errors) {
        Object.entries(result.errors).forEach(([field, messages]) => {
          form.setError(field as keyof RegisterFormData, {
            message: messages?.[0]
          })
        })
        setError(result.message || "Validation failed")
        toasts.registrationFailed(result.message || "Validation failed")
      } else if (result?.success) {
        toasts.registrationSuccess()
        setTimeout(() => {
          router.push("/")
        }, 1500)
      } else if (result?.message) {
        setError(result.message)
        toasts.registrationFailed(result.message)
      } else {
        setError("An error occurred. Please try again.")
        toasts.registrationFailed("An error occurred. Please try again.")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
      toasts.registrationFailed("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
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
            Join {siteTitle} and start testing your knowledge
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 mb-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <LoadingButton
                type="submit"
                className="w-full"
                isLoading={isLoading}
                loadingText="Creating account..."
              >
                Create Account
              </LoadingButton>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <a href="/" className="text-primary hover:underline">
                  Sign in
                </a>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}