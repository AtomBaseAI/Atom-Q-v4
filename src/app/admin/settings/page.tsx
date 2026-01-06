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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toasts } from "@/lib/toasts"
import { Loader2, Save, Settings, CheckCircle, Shield, Server, Info, Download, Code } from "lucide-react"
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
  const [activeTab, setActiveTab] = useState("general")
  const [downloadingSource, setDownloadingSource] = useState(false)
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

  const handleDownloadSource = async () => {
    setDownloadingSource(true)
    
    try {
      console.log("Starting source code download...")
      const response = await fetch('/api/admin/download/source')
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Download failed:", errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to download source code')
      }
      
      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : 'source-code.zip'
      
      console.log("Downloading file:", filename)
      
      // Get the content length if available
      const contentLength = response.headers.get('Content-Length')
      console.log("File size:", contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : 'Unknown')
      
      // Create a blob from the response
      const blob = await response.blob()
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty')
      }
      
      console.log("Blob created, size:", blob.size, "bytes")
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
      
      console.log("Download completed successfully")
      toasts.actionSuccess('Source code downloaded successfully')
    } catch (error) {
      console.error('Download error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toasts.actionFailed('Source code download', errorMessage)
    } finally {
      setDownloadingSource(false)
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

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="authentication" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Authentication
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
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
          </TabsContent>

          {/* Authentication Settings Tab */}
          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication Settings
                </CardTitle>
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

                <Separator />

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
                </div>

                {formData.enableGithubAuth && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ GitHub authentication is enabled. Make sure to configure GitHub OAuth settings in your environment variables.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Settings
                </CardTitle>
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

            {/* Settings Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Settings Information
                </CardTitle>
                <CardDescription>
                  Current settings status and metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Settings ID:</span>
                    <span className="font-mono">{settings?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last updated:</span>
                    <span>{settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{settings?.createdAt ? new Date(settings.createdAt).toLocaleString() : 'Unknown'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Site Title:</span>
                    <span className="font-medium">{settings?.siteTitle || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maintenance Mode:</span>
                    <span className={`font-medium ${settings?.maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                      {settings?.maintenanceMode ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registration:</span>
                    <span className={`font-medium ${settings?.allowRegistration ? 'text-green-600' : 'text-red-600'}`}>
                      {settings?.allowRegistration ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GitHub Auth:</span>
                    <span className={`font-medium ${settings?.enableGithubAuth ? 'text-green-600' : 'text-gray-600'}`}>
                      {settings?.enableGithubAuth ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Source Code Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Source Code Management
                </CardTitle>
                <CardDescription>
                  Download the complete source code of this application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    <strong>Source Code Download</strong><br />
                    Download the complete source code as a ZIP file. This includes all application files except node_modules, build artifacts, and git files.
                  </p>
                  <LoadingButton
                    onClick={handleDownloadSource}
                    isLoading={downloadingSource}
                    loadingText="Preparing download..."
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Source Code
                  </LoadingButton>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p><strong>Note:</strong> The downloaded ZIP file will contain:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Source code files (.ts, .tsx, .js, .jsx)</li>
                    <li>Configuration files (package.json, tsconfig.json, etc.)</li>
                    <li>Database schema and migration files</li>
                    <li>Documentation and README files</li>
                  </ul>
                  <p className="mt-2"><strong>Excluded:</strong> node_modules, .git, .next, build artifacts, logs</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
    </div>
  )
}