"use client"

import React, { useEffect, createContext, useContext, useCallback } from "react"
import { useSettingsStore, Settings } from "@/stores/settings"
import { toasts } from "@/lib/toasts"
import { signOut } from "next-auth/react"
import { useUserStore } from "@/stores/user"

interface SettingsContextType {
  settings: Settings
  isLoading: boolean
  error: string | null
  updateSettings: (updates: Partial<Settings>) => Promise<void>
  fetchSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {
    maintenanceMode: false,
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

  const { user } = useUserStore()

  // Fetch settings on mount - only once
  useEffect(() => {
    fetchStoreSettings()
  }, [])

  // Logout non-admin users when maintenance mode is enabled
  useEffect(() => {
    if (settings?.maintenanceMode && user?.role !== 'ADMIN') {
      // Show toast notification
      toasts.error('Site is under maintenance. You have been logged out.')

      // Sign out the user
      signOut({ callbackUrl: '/' })
    }
  }, [settings?.maintenanceMode, user?.role])

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