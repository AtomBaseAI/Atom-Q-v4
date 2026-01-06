"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Moon, Sun, LogOut, Menu } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { useSettings } from "@/components/providers/settings-provider"
import { SettingsMenu } from "@/components/ui/settings-menu"
import { useUserStore } from "@/stores/user"
import { AnimatedThemeToggler } from "../magicui/animated-theme-toggler"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { settings } = useSettings()
  const { setUser } = useUserStore()

  const handleSignOut = async () => {
    // Clear user store first to prevent redirect loops
    setUser(null)
    // Then sign out from NextAuth
    await signOut({ callbackUrl: "/" })
    toast.success("Logged out successfully")
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)

    // Apply theme changes instantly for admin
    const root = document.documentElement
    if (newTheme === "dark") {
      root.style.setProperty("--background", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--card", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--card-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--popover", "hsl(222.2 84% 4.9%)")
      root.style.setProperty("--popover-foreground", "hsl(210 40% 98%)")
      root.style.setProperty("--primary", "hsl(221.2 83.2% 53.3%)")
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
      root.style.setProperty("--primary", "hsl(221.2 83.2% 53.3%)")
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
      root.style.setProperty("--ring", "hsl(221.2 83.2% 53.3%)")
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mr-4 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold">{settings?.siteTitle || "Atom Q"} Admin</h1>
          </div>

          <div className="flex items-center justify-end space-x-2 ml-auto">
            {/* <SettingsMenu /> */}
            <AnimatedThemeToggler className="mt-[3px] mr-4"/>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user.avatar || ""} alt={session?.user.name || ""} />
                    <AvatarFallback>
                      {session?.user.name?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session?.user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}