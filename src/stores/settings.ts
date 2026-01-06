import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Settings {
  id?: string
  siteTitle: string
  siteDescription: string
  maintenanceMode: boolean
  allowRegistration: boolean
  enableGithubAuth: boolean
  createdAt?: string
  updatedAt?: string
}

interface SettingsState {
  settings: Settings
  isLoading: boolean
  error: string | null
  lastUpdated: number | null
  
  // Actions
  setSettings: (settings: Partial<Settings>) => void
  updateSettings: (updates: Partial<Settings>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchSettings: () => Promise<void>
  clearSettings: () => void
}

const defaultSettings: Settings = {
  siteTitle: "Atom Q",
  siteDescription: "Knowledge testing portal powered by Atom Labs",
  maintenanceMode: false,
  allowRegistration: true,
  enableGithubAuth: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      error: null,
      lastUpdated: null,

      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          lastUpdated: Date.now(),
        }))
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
          lastUpdated: Date.now(),
        }))
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error })
      },

      fetchSettings: async () => {
        const state = get()
        
        // Don't fetch if already loading or recently updated (within 5 minutes)
        if (state.isLoading || (state.lastUpdated && Date.now() - state.lastUpdated < 300000)) {
          return
        }

        set({ isLoading: true, error: null })

        try {
          const response = await fetch('/api/admin/settings', {
            headers: {
              'Cache-Control': 'no-cache',
            },
          })

          if (response.ok) {
            const data = await response.json()
            set({
              settings: data,
              lastUpdated: Date.now(),
              error: null,
            })
          } else {
            set({ error: 'Failed to fetch settings' })
          }
        } catch (error) {
          set({ error: 'Network error while fetching settings' })
        } finally {
          set({ isLoading: false })
        }
      },

      clearSettings: () => {
        set({
          settings: defaultSettings,
          lastUpdated: null,
          error: null,
        })
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        settings: state.settings,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
)