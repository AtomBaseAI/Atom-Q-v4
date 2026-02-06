"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

import { useTheme } from "next-themes"
import { SideNav } from "@/components/web/side-nav"
import { HeroSection } from "@/components/web/hero-section"
import { SignalsSection } from "@/components/web/signals-section"
import { WorkSection } from "@/components/web/work-section"
import { PrinciplesSection } from "@/components/web/principles-section"
import { ColophonSection } from "@/components/web/colophon-section"
import WebLayout from "@/components/layout/web-layout"

export default function LandingPage() {

  const [mounted, setMounted] = useState(false)
  const { theme } = useTheme()


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



  return (
    <WebLayout>
      <main className="relative min-h-screen">
        <SideNav />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
        <div className="relative z-10">
          <HeroSection />
          <SignalsSection />
          <WorkSection />
          <PrinciplesSection />
          <ColophonSection />
        </div>
      </main>
    </WebLayout>
  )
}
