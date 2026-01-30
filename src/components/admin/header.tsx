"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useSettings } from "@/components/providers/settings-provider"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { settings } = useSettings()

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
        </div>
      </div>
    </header>
  )
}