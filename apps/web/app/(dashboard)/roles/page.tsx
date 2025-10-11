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