"use client"

import React, { useEffect, createContext, useContext, useCallback } from "react"
import { useSettingsStore, Settings } from "@/stores/settings"
import { toasts } from "@/lib/toasts"

interface SettingsContextType {
  settings: Settings
  isLoading: boolean
  error: string | null
  updateSettings: (updates: Partial<Settings>) => Promise<void>
  fetchSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {
    siteTitle: "Atom Q",
    siteDescription: "Knowledge testing portal powered by Atom Labs",
    maintenanceMode: false,
    allowRegistration: true,
    enableGithubAuth: false,
  },
  isLoading: false,
  error: null,
  updateSettings: async () => {},
  fetchSettings: async () => {},
})

export const useSettings = () => useContext(SettingsContext)

interface SettingsProviderProps {
  children: React.ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { 
    settings, 
    isLoading, 
    error, 
    setSettings, 
    updateSettings: updateStoreSettings,
    setLoading,
    setError,
    fetchSettings: fetchStoreSettings
  } = useSettingsStore()

  // Update document title when site title changes
  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle
    }
  }, [settings.siteTitle])

  // Update meta tags when settings change
  useEffect(() => {
    // Update Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]')
    const ogDescription = document.querySelector('meta[property="og:description"]')
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')

    if (ogTitle) ogTitle.setAttribute('content', settings.siteTitle)
    if (ogDescription) ogDescription.setAttribute('content', settings.siteDescription)
    if (twitterTitle) twitterTitle.setAttribute('content', settings.siteTitle)
    if (twitterDescription) twitterDescription.setAttribute('content', settings.siteDescription)
  }, [settings.siteTitle, settings.siteDescription])

  // Fetch settings on mount - only once
  useEffect(() => {
    fetchStoreSettings()
  }, [])

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        toasts.settingsUpdated()

        // Show specific toasts for maintenance mode changes
        if ('maintenanceMode' in updates && updates.maintenanceMode !== settings.maintenanceMode) {
          if (updates.maintenanceMode) {
            toasts.maintenanceModeEnabled()
          } else {
            toasts.maintenanceModeDisabled()
          }
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update settings')
        toasts.actionFailed('Settings update')
      }
    } catch (error) {
      setError('Network error while updating settings')
      toasts.actionFailed('Settings update')
    } finally {
      setLoading(false)
    }
  }, [settings.maintenanceMode, setSettings, setLoading, setError])

  const fetchSettings = useCallback(async () => {
    await fetchStoreSettings()
  }, [fetchStoreSettings])

  const value: SettingsContextType = {
    settings,
    isLoading,
    error,
    updateSettings,
    fetchSettings,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}