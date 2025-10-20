/**
 * Procurement System API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

const getHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

export const purchaseRequestsAPI = {
  list: async (filters?: any) => {
    const params = new URLSearchParams(filters)
    const response = await fetch(`${API_BASE}/api/purchase-requests?${params}`, {
      headers: getHeaders()
    })
    return response.json()
  },

  get: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/purchase-requests/${id}`, {
      headers: getHeaders()
    })
    return response.json()
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/purchase-requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
    return response.json()
  },

  submit: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/purchase-requests/${id}/submit`, {
      method: 'POST',
      headers: getHeaders()
    })
    return response.json()
  },

  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/purchase-requests/${id}/approve`, {
      method: 'POST',
      headers: getHeaders()
    })
    return response.json()
  },

  reject: async (id: string, reason: string) => {
    const response = await fetch(`${API_BASE}/api/purchase-requests/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rejection_reason: reason })
    })
    return response.json()
  }
}

export const goodsReceiptsAPI = {
  list: async (filters?: any) => {
    const params = new URLSearchParams(filters)
    const response = await fetch(`${API_BASE}/api/goods-receipts?${params}`, {
      headers: getHeaders()
    })
    return response.json()
  },

  getPendingOrders: async () => {
    const response = await fetch(`${API_BASE}/api/goods-receipts/pending-orders`, {
      headers: getHeaders()
    })
    return response.json()
  }
}

export const jobMaterialsAPI = {
  list: async (jobId: string) => {
    const response = await fetch(`${API_BASE}/api/jobs/${jobId}/materials`, {
      headers: getHeaders()
    })
    return response.json()
  },

  checkAvailability: async (jobId: string) => {
    const response = await fetch(`${API_BASE}/api/jobs/${jobId}/materials/check-availability`, {
      method: 'POST',
      headers: getHeaders()
    })
    return response.json()
  }
}
