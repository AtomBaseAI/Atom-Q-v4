"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toasts } from "@/lib/toasts"
import { Loader2, Save, Settings, CheckCircle } from "lucide-react"
import { useSettings } from "@/components/providers/settings-provider"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"

export default function SettingsPage() {
  const { 
    settings, 
    isLoading, 
    error, 
    updateSettings, 
    fetchSettings 
  } = useSettings()
  
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [formData, setFormData] = useState({
    siteTitle: "",
    siteDescription: "",
    maintenanceMode: false,
    allowRegistration: true,
    enableGithubAuth: false
  })

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        siteTitle: settings.siteTitle,
        siteDescription: settings.siteDescription,
        maintenanceMode: settings.maintenanceMode,
        allowRegistration: settings.allowRegistration,
        enableGithubAuth: settings.enableGithubAuth
      })
      setHasChanges(false)
    }
  }, [settings])

  // Check for changes
  useEffect(() => {
    if (settings) {
      const changed = 
        formData.siteTitle !== settings.siteTitle ||
        formData.siteDescription !== settings.siteDescription ||
        formData.maintenanceMode !== settings.maintenanceMode ||
        formData.allowRegistration !== settings.allowRegistration ||
        formData.enableGithubAuth !== settings.enableGithubAuth
      
      setHasChanges(changed)
    }
  }, [formData, settings])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateSettings(formData)
      setHasChanges(false)
    } catch (error) {
      // Error is handled by the provider
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        siteTitle: settings.siteTitle,
        siteDescription: settings.siteDescription,
        maintenanceMode: settings.maintenanceMode,
        allowRegistration: settings.allowRegistration,
        enableGithubAuth: settings.enableGithubAuth
      })
      setHasChanges(false)
    }
  }

  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application settings and preferences
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success indicator */}
      {settings && !hasChanges && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings are up to date.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic site configuration and appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteTitle">Site Title</Label>
              <Input
                id="siteTitle"
                value={formData.siteTitle}
                onChange={(e) => handleInputChange("siteTitle", e.target.value)}
                placeholder="Enter site title"
              />
              <p className="text-xs text-muted-foreground">
                This title appears in the browser tab and across the application
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={formData.siteDescription}
                onChange={(e) => handleInputChange("siteDescription", e.target.value)}
                placeholder="Enter site description"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Used in meta tags and SEO descriptions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Settings</CardTitle>
            <CardDescription>
              Configure user authentication options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow User Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Enable new users to register on the site
                </p>
              </div>
              <Switch
                checked={formData.allowRegistration}
                onCheckedChange={(checked) => handleInputChange("allowRegistration", checked)}
              />
            </div>

            {/* <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable GitHub Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to sign in with GitHub
                </p>
              </div>
              <Switch
                checked={formData.enableGithubAuth}
                onCheckedChange={(checked) => handleInputChange("enableGithubAuth", checked)}
              />
            </div> */}
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              System-wide configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable the site for maintenance
                </p>
              </div>
              <Switch
                checked={formData.maintenanceMode}
                onCheckedChange={(checked) => handleInputChange("maintenanceMode", checked)}
              />
            </div>

            {formData.maintenanceMode && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Maintenance mode is enabled. Only administrators can access the site.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            Reset Changes
          </Button>
          
          <LoadingButton 
            type="submit" 
            isLoading={saving}
            loadingText="Saving..."
            disabled={!hasChanges}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </LoadingButton>
        </div>
      </form>

      {/* Last Updated Info */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Settings Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-1">
              <p>Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}</p>
              <p>Created: {settings.createdAt ? new Date(settings.createdAt).toLocaleString() : 'Unknown'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}