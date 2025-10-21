'use client'

import { useEffect, useState } from 'react'
import { notificationsAPI } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUnreadCount()
    // Poll every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  async function loadUnreadCount() {
    try {
      const response = await notificationsAPI.getUnreadCount()
      setUnreadCount(response.data.count || 0)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  async function loadNotifications() {
    try {
      setLoading(true)
      const response = await notificationsAPI.getAll({ limit: 20 })
      setNotifications(response.data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await notificationsAPI.markAsRead(id)
      loadNotifications()
      loadUnreadCount()
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationsAPI.markAllAsRead()
      toast.success('Tüm bildirimler okundu olarak işaretlendi')
      loadNotifications()
      loadUnreadCount()
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  async function handleDelete(id: string) {
    try {
      await notificationsAPI.delete(id)
      toast.success('Bildirim silindi')
      loadNotifications()
      loadUnreadCount()
    } catch (error) {
      toast.error('Silme başarısız')
    }
  }

  function getNotificationIcon(type: string) {
    const icons: Record<string, string> = {
      task_assigned: '📋',
      task_ready: '✅',
      task_started: '▶️',
      task_completed: '🎉',
      job_activated: '🚀',
      revision_created: '📝',
      info: 'ℹ️',
      warning: '⚠️',
    }
    return icons[type] || '🔔'
  }

  function getNotificationLink(notification: any) {
    if (notification.ref_type === 'job' && notification.ref_id) {
      return `/jobs/${notification.ref_id}`
    }
    if (notification.ref_type === 'job_step' && notification.ref_id) {
      return `/tasks/${notification.ref_id}`
    }
    if (notification.type === 'task_assigned' || notification.type === 'task_ready') {
      return '/tasks'
    }
    return null
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Şimdi'
    if (diffMins < 60) return `${diffMins} dk önce`
    if (diffHours < 24) return `${diffHours} saat önce`
    if (diffDays < 7) return `${diffDays} gün önce`
    return date.toLocaleDateString('tr-TR')
  }

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Bildirimler</h3>
                {unreadCount > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    {unreadCount} okunmamış
                  </Badge>
                )}
              </div>
              {notifications.some(n => !n.is_read) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-7 text-xs"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Tümünü Okundu İşaretle
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Henüz bildirim yok</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const link = getNotificationLink(notification)
                    
                    const content = (
                      <div
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.is_read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          if (!notification.is_read) {
                            handleMarkAsRead(notification.id)
                          }
                          if (link) {
                            setIsOpen(false)
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              <div className="flex gap-1">
                                {!notification.is_read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkAsRead(notification.id)
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <Check className="w-3 h-3 text-gray-600" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(notification.id)
                                  }}
                                  className="p-1 hover:bg-red-100 rounded"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )

                    return link ? (
                      <Link key={notification.id} href={link}>
                        {content}
                      </Link>
                    ) : (
                      <div key={notification.id}>{content}</div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50">
                <Link href="/notifications">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    Tüm Bildirimleri Gör
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
