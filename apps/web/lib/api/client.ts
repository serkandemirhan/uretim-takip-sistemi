import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - hata yönetimi
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token geçersiz, login'e yönlendir
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { username, password })
    return response.data
  },
  
  me: async () => {
    const response = await apiClient.get('/api/auth/me')
    return response.data
  },
}

// Jobs API
export const jobsAPI = {
  getAll: async (params?: { status?: string; q?: string }) => {
    const response = await apiClient.get('/api/jobs', { params })
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/jobs/${id}`)
    return response.data
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/jobs', data)
    return response.data
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/api/jobs/${id}`, data)
    return response.data
  },

  // YENİ: İş güncelleme
  
  // YENİ: Dondur
  hold: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/api/jobs/${id}/hold`, { reason })
    return response.data
  },
  
  // YENİ: Devam ettir
  resume: async (id: string) => {
    const response = await apiClient.post(`/api/jobs/${id}/resume`)
    return response.data
  },
  
  // YENİ: İptal et
  cancel: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/api/jobs/${id}/cancel`, { reason })
    return response.data
  },
  
  // YENİ: Süreç ekle
  addStep: async (id: string, data: any) => {
    const response = await apiClient.post(`/api/jobs/${id}/steps`, data)
    return response.data
  },

  updateStep: async (stepId: string, data: any) => {
    const response = await apiClient.patch(`/api/jobs/steps/${stepId}`, data)
    return response.data
  },
  
  // YENİ: Süreç sil
  deleteStep: async (stepId: string) => {
    const response = await apiClient.delete(`/api/jobs/steps/${stepId}`)
    return response.data
  },
  
  // YENİ: İşi aktif et
  activate: async (id: string) => {
    const response = await apiClient.post(`/api/jobs/${id}/activate`)
    return response.data
  },
  
  // YENİ: Süreci başlat
  startStep: async (stepId: string) => {
    const response = await apiClient.post(`/api/jobs/steps/${stepId}/start`)
    return response.data
  },
  
  // YENİ: Süreci tamamla
  completeStep: async (stepId: string, data: any) => {
    const response = await apiClient.post(`/api/jobs/steps/${stepId}/complete`, data)
    return response.data
  },

  pauseStep: async (stepId: string, data: { reason: string }) => {
    const response = await apiClient.post(`/api/jobs/steps/${stepId}/pause`, data)
    return response.data
  },

  resumeStep: async (stepId: string) => {
    const response = await apiClient.post(`/api/jobs/steps/${stepId}/resume`)
    return response.data
  },

  addStepNote: async (stepId: string, data: { note: string }) => {
    const response = await apiClient.post(`/api/jobs/steps/${stepId}/notes`, data)
    return response.data
  },


  // YENİ: Revizyon geçmişi
  getRevisions: async (id: string) => {
    const response = await apiClient.get(`/api/jobs/${id}/revisions`)
    return response.data
  },
  
  // YENİ: Revizyon oluştur
  createRevision: async (id: string, data: any) => {
    const response = await apiClient.post(`/api/jobs/${id}/revise`, data)
    return response.data
  },
}

// Machines API
export const machinesAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/machines')
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/machines/${id}`)
    return response.data
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/machines', data)
    return response.data
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/api/machines/${id}`, data)
    return response.data
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/machines/${id}`)
    return response.data
  },

  getStatus: async () => {
    const response = await apiClient.get('/api/machines/status')
    return response.data
  },
  
  getStats: async () => {
    const response = await apiClient.get('/api/machines/stats')
    return response.data
  },
}

// Customers API (en alta ekle)
export const customersAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/customers')
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/customers/${id}`)
    return response.data
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/customers', data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/customers/${id}`)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/api/customers/${id}`, data)
    return response.data
  },

  getDealers: async (customerId: string) => {
    const response = await apiClient.get(`/api/customers/${customerId}/dealers`)
    return response.data
  },

  createDealer: async (customerId: string, data: any) => {
    const response = await apiClient.post(`/api/customers/${customerId}/dealers`, data)
    return response.data
  },

  updateDealer: async (customerId: string, dealerId: string, data: any) => {
    const response = await apiClient.patch(`/api/customers/${customerId}/dealers/${dealerId}`, data)
    return response.data
  },

  deleteDealer: async (customerId: string, dealerId: string) => {
    const response = await apiClient.delete(`/api/customers/${customerId}/dealers/${dealerId}`)
    return response.data
  },
}

// Processes API
export const processesAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/processes')
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/processes/${id}`)
    return response.data
  },

  delete: async (id: string) => {
    const res = await apiClient.delete(`/api/processes/${id}`)
    return res.data
  },

  create: async (data: {
    name: string
    code: string
    description?: string
    is_machine_based?: boolean
    is_production?: boolean
    order_index?: number
    group_id?: string | null
  }) => {
    const res = await apiClient.post('/api/processes', data)
    return res.data
  },

  update: async (
    id: string,
    data: Partial<{
      name: string
      code: string
      description: string
      is_machine_based: boolean
      is_production: boolean
      order_index: number
      group_id: string | null
    }>,
  ) => {
    const res = await apiClient.patch(`/api/processes/${id}`, data)
    return res.data
  },

  getGroups: async () => {
    const res = await apiClient.get('/api/processes/groups')
    return res.data
  },

  createGroup: async (data: { name: string; description?: string; color?: string; order_index?: number }) => {
    const res = await apiClient.post('/api/processes/groups', data)
    return res.data
  },

  updateGroup: async (
    id: string,
    data: Partial<{ name: string; description: string; color: string; order_index: number }>,
  ) => {
    const res = await apiClient.patch(`/api/processes/groups/${id}`, data)
    return res.data
  },

  deleteGroup: async (id: string) => {
    const res = await apiClient.delete(`/api/processes/groups/${id}`)
    return res.data
  },
}

// Tasks API
export const tasksAPI = {
  getMyTasks: async () => {
    const response = await apiClient.get('/api/tasks')
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/tasks/${id}`)
    return response.data
  },
  
  start: async (id: string) => {
    const response = await apiClient.post(`/api/jobs/steps/${id}/start`)
    return response.data
  },
  
  complete: async (id: string, data: any) => {
    const response = await apiClient.post(`/api/jobs/steps/${id}/complete`, data)
    return response.data
  },

  // YENİ: Üretim geçmişi
  getHistory: async (params?: { limit?: number; date_from?: string; date_to?: string }) => {
    const response = await apiClient.get('/api/tasks/history', { params })
    return response.data
  },
  
  // YENİ: Üretim istatistikleri
  getStats: async () => {
    const response = await apiClient.get('/api/tasks/stats')
    return response.data
  },
}

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/users')
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/users/${id}`)
    return response.data
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/users', data)
    return response.data
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/api/users/${id}`, data)
    return response.data
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/users/${id}`)
    return response.data
  },
}

// User Roles API
export const userRolesAPI = {
  getUserRoles: async (userId: string) => {
    const response = await apiClient.get(`/api/user-roles/user/${userId}`)
    return response.data
  },

  assignRoles: async (userId: string, data: { role_ids: string[]; primary_role_id?: string }) => {
    const response = await apiClient.post(`/api/user-roles/user/${userId}`, data)
    return response.data
  },

  removeRole: async (userId: string, roleId: string) => {
    const response = await apiClient.delete(`/api/user-roles/user/${userId}/role/${roleId}`)
    return response.data
  },

  setPrimaryRole: async (userId: string, roleId: string) => {
    const response = await apiClient.patch(`/api/user-roles/user/${userId}/primary/${roleId}`)
    return response.data
  },
}

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await apiClient.get('/api/dashboard/stats')
    return response.data
  },
  
  getRecentJobs: async (limit = 10) => {
    const response = await apiClient.get('/api/dashboard/recent-jobs', { params: { limit } })
    return response.data
  },
  
  getActivity: async (limit = 10) => {
    const response = await apiClient.get('/api/dashboard/activity', { params: { limit } })
    return response.data
  },
  
  getJobsByStatus: async () => {
    const response = await apiClient.get('/api/dashboard/chart/jobs-by-status')
    return response.data
  },
  
  getJobsByMonth: async () => {
    const response = await apiClient.get('/api/dashboard/chart/jobs-by-month')
    return response.data
  },

  getAllTasks: async () => {
    const response = await apiClient.get('/api/dashboard/tasks')
    return response.data
  },
}

// Files API
export const filesAPI = {
  // presigned PUT için URL al
  getUploadUrl: async (payload: {
    ref_type: 'job' | 'job_step' | 'user'
    ref_id: string
    filename: string
    content_type: string
    size?: number
  }) => {
    const r = await apiClient.post('/api/files/upload-url', payload)
    return r.data // { bucket, object_key, url, publicUrl? }
  },
  
// yüklenen objeyi DB’ye linkle (bucket + object_key zorunlu)
  link: async (payload: {
    ref_type: 'job' | 'job_step' | 'user'
    ref_id: string
    bucket: string
    object_key: string
    filename: string
    size?: number
    content_type?: string
    url?: string | null
  }) => {
    const r = await apiClient.post('/api/files/link', payload)
    return r.data
  },
  
  linkFile: async (data: {
    object_key: string
    filename: string
    file_size?: number
    content_type?: string
    ref_type: 'job' | 'job_step' | 'user'
    ref_id: string
    folder_path?: string
  }) => {
    const response = await apiClient.post('/api/files/link', data)
    return response.data
  },
  
  getFiles: async (params: { ref_type?: string; ref_id?: string }) => {
    const response = await apiClient.get('/api/files', { params })
    return response.data
  },
  
  // YENİ: İşe ait tüm dosyaları süreçlere göre grupla
  getFilesByJob: async (jobId: string) => {
    const response = await apiClient.get(`/api/files/by-job/${jobId}`)
    return response.data
  },
  
  getDownloadUrl: async (fileId: string) => {
    const response = await apiClient.get(`/api/files/${fileId}/download-url`)
    return response.data
  },
  
  delete: async (fileId: string) => {
    const response = await apiClient.delete(`/api/files/${fileId}`)
    return response.data
  },

  getExplorer: async () => {
    const response = await apiClient.get('/api/files/explorer')
    return response.data
  },
}

// Notifications API
export const notificationsAPI = {
  getAll: async (params?: { is_read?: boolean; limit?: number }) => {
    const response = await apiClient.get('/api/notifications', { params })
    return response.data
  },
  
  getUnreadCount: async () => {
    const response = await apiClient.get('/api/notifications/unread-count')
    return response.data
  },
  
  markAsRead: async (id: string) => {
    const response = await apiClient.patch(`/api/notifications/${id}/read`)
    return response.data
  },
  
  markAllAsRead: async () => {
    const response = await apiClient.patch('/api/notifications/mark-all-read')
    return response.data
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/notifications/${id}`)
    return response.data
  },
}

// Roles API
export const rolesAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/roles')
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/roles/${id}`)
    return response.data
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/roles', data)
    return response.data
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/api/roles/${id}`, data)
    return response.data
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/roles/${id}`)
    return response.data
  },
  
  getResources: async () => {
    const response = await apiClient.get('/api/roles/resources')
    return response.data
  },
}

// Stocks API
export const stocksAPI = {
  getAll: async (params?: { category?: string; critical_only?: boolean }) => {
    const response = await apiClient.get('/api/stocks', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/stocks/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await apiClient.post('/api/stocks', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/api/stocks/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/stocks/${id}`)
    return response.data
  },

  getCategories: async () => {
    const response = await apiClient.get('/api/stocks/categories')
    return response.data
  },

  getSummary: async () => {
    const response = await apiClient.get('/api/stocks/summary')
    return response.data
  },
}

// Stock Movements API
export const stockMovementsAPI = {
  getAll: async (params?: { stock_id?: string; job_id?: string; movement_type?: string; start_date?: string; end_date?: string }) => {
    const response = await apiClient.get('/api/stock-movements', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/stock-movements/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await apiClient.post('/api/stock-movements', data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/stock-movements/${id}`)
    return response.data
  },
}

// Purchase Orders API
export const purchaseOrdersAPI = {
  getAll: async (params?: { stock_id?: string; status?: string }) => {
    const response = await apiClient.get('/api/purchase-orders', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/purchase-orders/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await apiClient.post('/api/purchase-orders', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/api/purchase-orders/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/purchase-orders/${id}`)
    return response.data
  },

  deliver: async (id: string, data?: { document_no?: string; notes?: string }) => {
    const response = await apiClient.post(`/api/purchase-orders/${id}/deliver`, data)
    return response.data
  },

  cancel: async (id: string) => {
    const response = await apiClient.post(`/api/purchase-orders/${id}/cancel`)
    return response.data
  },
}

// Currency Settings API
export const currencySettingsAPI = {
  get: async () => {
    const response = await apiClient.get('/api/currency-settings')
    return response.data
  },

  update: async (data: { usd_to_try?: number; eur_to_try?: number }) => {
    const response = await apiClient.post('/api/currency-settings', data)
    return response.data
  },

  convert: async (data: { amount: number; from_currency: string; to_currency: string }) => {
    const response = await apiClient.post('/api/currency-settings/convert', data)
    return response.data
  },
}
