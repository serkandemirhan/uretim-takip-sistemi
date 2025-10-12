'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { rolesAPI } from '@/lib/api/client'
import { CheckCircle2, Check } from 'lucide-react'

interface Role {
  id: string
  code: string
  name: string
  description: string
}

interface MultiRoleSelectorProps {
  selectedRoleIds: string[]
  primaryRoleId?: string
  onChange: (roleIds: string[], primaryRoleId?: string) => void
}

export function MultiRoleSelector({ selectedRoleIds, primaryRoleId, onChange }: MultiRoleSelectorProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    try {
      const response = await rolesAPI.getAll()
      setRoles(response.data || [])
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleRoleToggle(roleId: string, checked: boolean) {
    let newRoleIds = [...selectedRoleIds]

    if (checked) {
      // Rol eklendi
      if (!newRoleIds.includes(roleId)) {
        newRoleIds.push(roleId)
      }
      // Eğer ilk rol seçiliyorsa, onu primary yap
      if (newRoleIds.length === 1) {
        onChange(newRoleIds, roleId)
        return
      }
    } else {
      // Rol kaldırıldı
      newRoleIds = newRoleIds.filter(id => id !== roleId)

      // Eğer primary rol kaldırıldıysa, ilk rolü primary yap
      if (primaryRoleId === roleId && newRoleIds.length > 0) {
        onChange(newRoleIds, newRoleIds[0])
        return
      }
    }

    onChange(newRoleIds, primaryRoleId)
  }

  function handlePrimaryChange(roleId: string) {
    onChange(selectedRoleIds, roleId)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roller</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Roller
          {selectedRoleIds.length > 0 && (
            <Badge variant="secondary">{selectedRoleIds.length} rol seçildi</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Kullanıcının sahip olacağı rolleri seçin. Primary rol, kullanıcının ana yetki düzeyini belirler.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {roles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.id)
            const isPrimary = primaryRoleId === role.id

            return (
              <div
                key={role.id}
                className={`relative border rounded-lg p-4 transition-all ${
                  isSelected
                    ? isPrimary
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer mt-0.5 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}
                    onClick={() => handleRoleToggle(role.id, !isSelected)}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Role Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleRoleToggle(role.id, !isSelected)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{role.name}</span>
                      {isPrimary && (
                        <Badge className="bg-blue-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>

                  {/* Primary Radio */}
                  {isSelected && selectedRoleIds.length > 1 && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                          isPrimary
                            ? 'border-blue-600 bg-white'
                            : 'border-gray-300 bg-white'
                        }`}
                        onClick={() => handlePrimaryChange(role.id)}
                      >
                        {isPrimary && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                      <span className="text-xs text-gray-600">Primary</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {selectedRoleIds.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            En az bir rol seçmelisiniz
          </div>
        )}
      </CardContent>
    </Card>
  )
}
