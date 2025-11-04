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
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">Roller</h3>
          {selectedRoleIds.length > 0 && (
            <Badge variant="secondary" className="text-xs">{selectedRoleIds.length} seçildi</Badge>
          )}
        </div>
        <p className="text-xs text-gray-600">
          Kullanıcının sahip olacağı rolleri seçin. Primary rol, kullanıcının ana yetki düzeyini belirler.
        </p>
      </div>

      <div className="space-y-1.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {roles.map((role) => {
          const isSelected = selectedRoleIds.includes(role.id)
          const isPrimary = primaryRoleId === role.id

          return (
            <div
              key={role.id}
              className={`relative border rounded-md p-2.5 transition-all ${
                isSelected
                  ? isPrimary
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Checkbox */}
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer mt-0.5 flex-shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}
                  onClick={() => handleRoleToggle(role.id, !isSelected)}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>

                {/* Role Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleRoleToggle(role.id, !isSelected)}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium text-sm text-gray-900">{role.name}</span>
                    {isPrimary && (
                      <Badge className="bg-blue-600 text-xs h-4 px-1.5">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-tight">{role.description}</p>
                </div>

                {/* Primary Radio */}
                {isSelected && selectedRoleIds.length > 1 && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                        isPrimary
                          ? 'border-blue-600 bg-white'
                          : 'border-gray-300 bg-white'
                      }`}
                      onClick={() => handlePrimaryChange(role.id)}
                      title="Primary olarak ayarla"
                    >
                      {isPrimary && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedRoleIds.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-xs">
          En az bir rol seçmelisiniz
        </div>
      )}
    </div>
  )
}
