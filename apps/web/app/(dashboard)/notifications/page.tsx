'use client'

import { useEffect, useState } from 'react'
import { notificationsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [filter])

  async function loadNotifications() {
    try {
      setLoading(true)
      const params = filter === 'all' ? {} : { is_read: filter === 'read' }
      const response = await notificationsAPI.getAll(params)
      setNotifications(response.data || [])
    } catch (error) {
      console.error('Notifications load error:', error)
      toast.error('Bildirimler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await notificationsAPI.markAsRead(id)
      loadNotifications()
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationsAPI.markAllAsRead()
      toast.success('Tüm bildirimler okundu olarak işaretlendi')
      loadNotifications()
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeleting(id)
      await notificationsAPI.delete(id)
      toast.success('Bildirim silindi')
      loadNotifications()
    } catch (error) {
      toast.error('Silme başarısız')
    } finally {
      setDeleting(null)
    }
  }

  function getNotificationIcon(type: string) {
    const icons: Record<string, string> = {
      task_assigned: '📋',
      task_ready: '✅',
      task_started: '▶️',
      task_completed: '🎉',
      job_activated: '🚀',
      job_held: '⏸️',
      job_resumed: '▶️',
      job_canceled: '❌',
      revision_created: '📝',
    }
    return icons[type] || '🔔'
  }

  function getNotificationLink(notification: any) {
    if (notification.ref_type === 'job' && notification.ref_id) {
      return `/jobs/${notification.ref_id}`
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
    if (diffMins < 60) return `${diffMins} dakika önce`
    if (diffHours < 24) return `${diffHours} saat önce`
    if (diffDays < 7) return `${diffDays} gün önce`
    return date.toLocaleDateString('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bildirimler</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Tümü
              <Badge className="ml-2" variant="secondary">
                {notifications.length}
              </Badge>
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Okunmamış
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('read')}
            >
              Okunmuş
              <Badge className="ml-2" variant="secondary">
                {notifications.length - unreadCount}
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'all' && 'Henüz bildirim yok'}
              {filter === 'unread' && 'Okunmamış bildirim yok'}
              {filter === 'read' && 'Okunmuş bildirim yok'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const link = getNotificationLink(notification)
            
            const content = (
              <Card 
                className={`hover:shadow-md transition-shadow ${
                  !notification.is_read ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="text-3xl flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>

                        <div className="flex gap-2">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                              className="h-7 text-xs"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Okundu
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                            disabled={deleting === notification.id}
                            className="h-7 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Sil
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )

            return link ? (
              <Link 
                key={notification.id} 
                href={link}
                onClick={() => {
                  if (!notification.is_read) {
                    handleMarkAsRead(notification.id)
                  }
                }}
              >
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}