import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Settings {
  id?: string
  siteTitle: string
  siteDescription: string
  maintenanceMode: boolean
  createdAt?: string
  updatedAt?: string
}

export interface RegistrationSettings {
  id?: string
  allowRegistration: boolean
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

interface RegistrationSettingsState {
  registrationSettings: RegistrationSettings
  isLoading: boolean
  error: string | null
  lastUpdated: number | null

  // Actions
  setRegistrationSettings: (settings: Partial<RegistrationSettings>) => void
  updateRegistrationSettings: (updates: Partial<RegistrationSettings>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchRegistrationSettings: () => Promise<void>
  clearRegistrationSettings: () => void
}

const defaultRegistrationSettings: RegistrationSettings = {
  allowRegistration: true,
}

export const useRegistrationSettingsStore = create<RegistrationSettingsState>()(
  persist(
    (set, get) => ({
      registrationSettings: defaultRegistrationSettings,
      isLoading: false,
      error: null,
      lastUpdated: null,

      setRegistrationSettings: (newSettings) => {
        set((state) => ({
          registrationSettings: { ...state.registrationSettings, ...newSettings },
          lastUpdated: Date.now(),
        }))
      },

      updateRegistrationSettings: (updates) => {
        set((state) => ({
          registrationSettings: { ...state.registrationSettings, ...updates },
          lastUpdated: Date.now(),
        }))
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error })
      },

      fetchRegistrationSettings: async () => {
        const state = get()

        // Don't fetch if already loading or recently updated (within 5 minutes)
        if (state.isLoading || (state.lastUpdated && Date.now() - state.lastUpdated < 300000)) {
          return
        }

        set({ isLoading: true, error: null })

        try {
          const response = await fetch('/api/admin/registration-settings', {
            headers: {
              'Cache-Control': 'no-cache',
            },
          })

          if (response.ok) {
            const data = await response.json()
            set({
              registrationSettings: data,
              lastUpdated: Date.now(),
              error: null,
            })
          } else {
            set({ error: 'Failed to fetch registration settings' })
          }
        } catch (error) {
          set({ error: 'Network error while fetching registration settings' })
        } finally {
          set({ isLoading: false })
        }
      },

      clearRegistrationSettings: () => {
        set({
          registrationSettings: defaultRegistrationSettings,
          lastUpdated: null,
          error: null,
        })
      },
    }),
    {
      name: 'registration-settings-storage',
      partialize: (state) => ({
        registrationSettings: state.registrationSettings,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
)
