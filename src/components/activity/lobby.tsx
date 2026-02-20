"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Crown, Loader2, Maximize2, Minimize2, Play } from "lucide-react"
import { User, getUserIconUrl } from "@/lib/partykit-client"

interface LobbyProps {
  activityKey: string
  users: User[]
  currentUserRole: 'ADMIN' | 'USER'
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onStartQuiz?: () => void
}

export function Lobby({
  activityKey,
  users,
  currentUserRole,
  isFullscreen,
  onToggleFullscreen,
  onStartQuiz
}: LobbyProps) {
  const playerCount = users.filter(u => u.role === 'USER').length
  const adminUser = users.find(u => u.role === 'ADMIN')

  // Sort users by join time, admin first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === 'ADMIN') return -1
    if (b.role === 'ADMIN') return 1
    return a.joinedAt - b.joinedAt
  })

  return (
    <div className={`
      min-h-screen flex items-center justify-center p-4
      ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}
    `}>
      <Card className={`
        w-full border-2 relative
        ${isFullscreen ? 'max-w-4xl h-[90vh] overflow-hidden' : 'max-w-2xl'}
      `}>
        {/* Header with fullscreen toggle */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-8 w-8"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content */}
        <CardContent className={`
          p-8 h-full
          ${isFullscreen ? 'flex flex-col' : ''}
        `}>
          <div className={`
            flex flex-col items-center justify-center text-center space-y-6
            ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}
          `}>
            {/* Activity Key */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Activity Code</p>
              <p className="text-3xl font-bold font-mono tracking-wider">{activityKey}</p>
            </div>

            {/* Player Count */}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">
                {playerCount} {playerCount === 1 ? 'Player' : 'Players'} Joined
              </span>
            </div>

            {/* Users Grid */}
            <div className={`
              grid gap-4 w-full
              ${isFullscreen ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8' : 'grid-cols-4'}
            `}>
              {sortedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col items-center space-y-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="relative">
                    <img
                      src={getUserIconUrl(parseInt(user.avatar))}
                      alt={user.nickname}
                      className={`
                        w-12 h-12 md:w-16 md:h-16 object-cover rounded-full
                        ${user.role === 'ADMIN' ? 'ring-2 ring-primary' : ''}
                      `}
                      onError={(e) => {
                        // Fallback emoji if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = target.nextElementSibling as HTMLDivElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div className="hidden absolute inset-0 items-center justify-center bg-muted rounded-full text-2xl">
                      {user.role === 'ADMIN' ? '👑' : '👤'}
                    </div>
                    {user.role === 'ADMIN' && (
                      <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                        <Crown className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-medium truncate max-w-full">
                    {user.nickname}
                  </p>
                  {user.role === 'ADMIN' && (
                    <span className="text-xs text-muted-foreground">Host</span>
                  )}
                </div>
              ))}
            </div>

            {/* Admin Actions */}
            {currentUserRole === 'ADMIN' && onStartQuiz && (
              <div className="pt-4 border-t w-full max-w-md">
                <Button
                  onClick={onStartQuiz}
                  className="w-full"
                  size="lg"
                  disabled={playerCount === 0}
                >
                  <Play className="mr-2 h-5 w-5 fill-current" />
                  Start Quiz
                </Button>
                {playerCount === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Waiting for players to join...
                  </p>
                )}
              </div>
            )}

            {/* User Waiting Message */}
            {currentUserRole === 'USER' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Waiting for host to start the quiz...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
