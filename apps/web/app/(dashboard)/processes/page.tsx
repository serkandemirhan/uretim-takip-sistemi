'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Edit, GripVertical, Plus, Save, Trash2, X } from 'lucide-react'

import { processesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { handleError } from '@/lib/utils/error-handler'

type Process = {
  id: string
  name: string
  code: string
  description?: string | null
  is_machine_based: boolean
  is_production: boolean
  order_index: number
  machine_count?: number
  group_id?: string | null
}

type ProcessGroup = {
  id: string
  name: string
  description?: string | null
  color?: string | null
  order_index: number
  processes: Process[]
}

type GroupForm = {
  name: string
  description: string
}

export default function ProcessesPage() {
  const [loading, setLoading] = useState(true)

  const [groups, setGroups] = useState<ProcessGroup[]>([])
  const [ungrouped, setUngrouped] = useState<Process[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const [editingProcessId, setEditingProcessId] = useState<string | null>(null)
  const [processForm, setProcessForm] = useState<Partial<Process>>({})
  const [savingProcessId, setSavingProcessId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ groupId: string; processId: string } | null>(null)
  const [groupDraggingId, setGroupDraggingId] = useState<string | null>(null)
  const [dirtyGroups, setDirtyGroups] = useState<Set<string>>(new Set())
  const [groupOrderDirty, setGroupOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  const [newGroupForm, setNewGroupForm] = useState<GroupForm>({ name: '', description: '' })
  const [creatingGroup, setCreatingGroup] = useState(false)

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupEditForm, setGroupEditForm] = useState<GroupForm>({ name: '', description: '' })
  const [savingGroup, setSavingGroup] = useState(false)

  const [newProcessTarget, setNewProcessTarget] = useState<string | null>(null)
  const [newProcessForm, setNewProcessForm] = useState({
    name: '',
    code: '',
    is_machine_based: false,
    is_production: false,
  })
  const [creatingProcess, setCreatingProcess] = useState(false)

  const loadProcesses = async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true)
    }

    try {
      const res = await processesAPI.getAll()
      const payload = res?.data ?? res ?? {}
      const fetchedGroups: ProcessGroup[] = (payload.groups ?? []).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        order_index: g.order_index ?? 0,
        processes: (g.processes ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          is_machine_based: !!p.is_machine_based,
          is_production: !!p.is_production,
          order_index: p.order_index ?? 0,
          machine_count: p.machine_count ?? 0,
          group_id: p.group_id ?? g.id,
        })),
      }))

      const fetchedUngrouped: Process[] = (payload.ungrouped ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        is_machine_based: !!p.is_machine_based,
        is_production: !!p.is_production,
        order_index: p.order_index ?? 0,
        machine_count: p.machine_count ?? 0,
        group_id: null,
      }))

      setGroups(fetchedGroups)
      setUngrouped(fetchedUngrouped)

      setExpandedGroups((prev) => {
        const next: Record<string, boolean> = { ...prev }
        fetchedGroups.forEach((g) => {
          if (next[g.id] === undefined) {
            next[g.id] = true
          }
        })
        next['__ungrouped__'] = next['__ungrouped__'] ?? true
        return next
      })
      setDirtyGroups(new Set())
      setGroupOrderDirty(false)
      setGroupDraggingId(null)
      resetNewProcess()
    } catch (error) {
      handleError(error)
      toast.error('Süreçler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProcesses(true)
  }, [])

  const groupOptions = useMemo(() => {
    return [
      { value: '', label: 'Grupsuz' },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ]
  }, [groups])

  const markGroupDirty = (groupId: string) => {
    setDirtyGroups((prev) => {
      const next = new Set(prev)
      next.add(groupId)
      return next
    })
  }

  const resetNewProcess = () => {
    setNewProcessTarget(null)
    setNewProcessForm({
      name: '',
      code: '',
      is_machine_based: false,
      is_production: false,
    })
    setCreatingProcess(false)
  }

  const updateProcessOrder = (list: Process[], groupId: string) => {
    const normalizedGroupId = groupId === '__ungrouped__' ? null : groupId
    return list.map((process, index) => ({
      ...process,
      order_index: index + 1,
      group_id: normalizedGroupId,
    }))
  }

  const reorderGroupsList = (list: ProcessGroup[], draggedId: string, beforeId?: string) => {
    const fromIndex = list.findIndex((group) => group.id === draggedId)
    if (fromIndex === -1) return list

    const working = list.slice()
    const [moved] = working.splice(fromIndex, 1)

    let insertionIndex = beforeId ? working.findIndex((group) => group.id === beforeId) : working.length
    if (insertionIndex === -1) {
      insertionIndex = working.length
    }
    working.splice(insertionIndex, 0, moved)

    const sameOrder = working.every((group, idx) => group.id === list[idx]?.id)
    if (sameOrder) {
      return list
    }

    return working
  }

  const reorderWithinGroup = (
    list: Process[],
    groupId: string,
    processId: string,
    beforeProcessId?: string,
  ) => {
    const fromIndex = list.findIndex((p) => p.id === processId)
    if (fromIndex === -1) return list

    const working = list.slice()
    const [moved] = working.splice(fromIndex, 1)
    const targetIndex = beforeProcessId
      ? working.findIndex((p) => p.id === beforeProcessId)
      : working.length
    const insertionIndex = targetIndex === -1 ? working.length : targetIndex
    working.splice(insertionIndex, 0, moved)

    const hasChanged = working.some((proc, idx) => proc.id !== list[idx]?.id)
    if (!hasChanged) return list

    return updateProcessOrder(working, groupId)
  }

  const moveProcess = (
    sourceGroupId: string,
    targetGroupId: string,
    processId: string,
    beforeProcessId?: string,
  ) => {
    if (sourceGroupId === targetGroupId) {
      if (sourceGroupId === '__ungrouped__') {
        const currentList = ungrouped
        const reordered = reorderWithinGroup(currentList, sourceGroupId, processId, beforeProcessId)
        if (reordered === currentList) return false
        setUngrouped(reordered)
        markGroupDirty(sourceGroupId)
        return true
      }

      const sourceGroupIndex = groups.findIndex((group) => group.id === sourceGroupId)
      if (sourceGroupIndex === -1) return false
      const sourceGroup = groups[sourceGroupIndex]
      const reordered = reorderWithinGroup(sourceGroup.processes, sourceGroupId, processId, beforeProcessId)
      if (reordered === sourceGroup.processes) return false

      const nextGroups = groups.map((group, index) =>
        index === sourceGroupIndex ? { ...group, processes: reordered } : group,
      )
      setGroups(nextGroups)
      markGroupDirty(sourceGroupId)
      return true
    }

    if (sourceGroupId === '__ungrouped__') {
      const targetIndex = groups.findIndex((group) => group.id === targetGroupId)
      if (targetIndex === -1) return false

      const sourceList = ungrouped.slice()
      const processIndex = sourceList.findIndex((process) => process.id === processId)
      if (processIndex === -1) return false

      const [movedProcess] = sourceList.splice(processIndex, 1)
      const updatedUngrouped = updateProcessOrder(sourceList, sourceGroupId)

      const targetGroup = groups[targetIndex]
      const targetProcesses = targetGroup.processes.slice()
      const targetPosition = beforeProcessId
        ? targetProcesses.findIndex((process) => process.id === beforeProcessId)
        : targetProcesses.length
      const insertionIndex = targetPosition === -1 ? targetProcesses.length : targetPosition
      targetProcesses.splice(insertionIndex, 0, movedProcess)
      const updatedTarget = updateProcessOrder(targetProcesses, targetGroupId)

      const nextGroups = groups.map((group, index) =>
        index === targetIndex ? { ...group, processes: updatedTarget } : group,
      )

      setUngrouped(updatedUngrouped)
      setGroups(nextGroups)
      markGroupDirty(sourceGroupId)
      markGroupDirty(targetGroupId)
      setExpandedGroups((prev) => ({ ...prev, [targetGroupId]: true }))
      return true
    }

    if (targetGroupId === '__ungrouped__') {
      const sourceIndex = groups.findIndex((group) => group.id === sourceGroupId)
      if (sourceIndex === -1) return false

      const sourceGroup = groups[sourceIndex]
      const sourceProcesses = sourceGroup.processes.slice()
      const processIndex = sourceProcesses.findIndex((process) => process.id === processId)
      if (processIndex === -1) return false

      const [movedProcess] = sourceProcesses.splice(processIndex, 1)
      const updatedSource = updateProcessOrder(sourceProcesses, sourceGroupId)

      const ungroupedList = ungrouped.slice()
      const targetPosition = beforeProcessId
        ? ungroupedList.findIndex((process) => process.id === beforeProcessId)
        : ungroupedList.length
      const insertionIndex = targetPosition === -1 ? ungroupedList.length : targetPosition
      ungroupedList.splice(insertionIndex, 0, movedProcess)
      const updatedUngrouped = updateProcessOrder(ungroupedList, targetGroupId)

      const nextGroups = groups.map((group, index) =>
        index === sourceIndex ? { ...group, processes: updatedSource } : group,
      )

      setGroups(nextGroups)
      setUngrouped(updatedUngrouped)
      markGroupDirty(sourceGroupId)
      markGroupDirty(targetGroupId)
      setExpandedGroups((prev) => ({ ...prev, [targetGroupId]: true }))
      return true
    }

    const sourceIndex = groups.findIndex((group) => group.id === sourceGroupId)
    const targetIndex = groups.findIndex((group) => group.id === targetGroupId)
    if (sourceIndex === -1 || targetIndex === -1) return false

    const sourceGroup = groups[sourceIndex]
    const targetGroup = groups[targetIndex]

    const sourceProcesses = sourceGroup.processes.slice()
    const processIndex = sourceProcesses.findIndex((process) => process.id === processId)
    if (processIndex === -1) return false

    const [movedProcess] = sourceProcesses.splice(processIndex, 1)
    const updatedSource = updateProcessOrder(sourceProcesses, sourceGroupId)

    const targetProcesses = targetGroup.processes.slice()
    const targetPosition = beforeProcessId
      ? targetProcesses.findIndex((process) => process.id === beforeProcessId)
      : targetProcesses.length
    const insertionIndex = targetPosition === -1 ? targetProcesses.length : targetPosition
    targetProcesses.splice(insertionIndex, 0, movedProcess)
    const updatedTarget = updateProcessOrder(targetProcesses, targetGroupId)

    const nextGroups = groups.map((group, index) => {
      if (index === sourceIndex) {
        return { ...group, processes: updatedSource }
      }
      if (index === targetIndex) {
        return { ...group, processes: updatedTarget }
      }
      return group
    })

    setGroups(nextGroups)
    markGroupDirty(sourceGroupId)
    markGroupDirty(targetGroupId)
    setExpandedGroups((prev) => ({ ...prev, [targetGroupId]: true }))
    return true
  }

  const handleRowDragOver = (targetGroupId: string, targetProcessId: string) => {
    if (!dragging) return
    const { groupId: sourceGroupId, processId } = dragging
    if (processId === targetProcessId && sourceGroupId === targetGroupId) return
    const didChange = moveProcess(sourceGroupId, targetGroupId, processId, targetProcessId)
    if (didChange && sourceGroupId !== targetGroupId) {
      setDragging({ groupId: targetGroupId, processId })
    }
  }

  const handleGroupDragOver = (targetGroupId: string) => {
    if (groupDraggingId) {
      let didChange = false
      setGroups((prev) => {
        const next = reorderGroupsList(
          prev,
          groupDraggingId,
          targetGroupId === '__ungrouped__' ? undefined : targetGroupId,
        )
        if (next === prev) {
          return prev
        }
        didChange = true
        return next
      })
      if (didChange) {
        setGroupOrderDirty(true)
      }
      return
    }

    if (!dragging) return
    const { groupId: sourceGroupId, processId } = dragging
    const didChange = moveProcess(sourceGroupId, targetGroupId, processId)
    if (didChange && sourceGroupId !== targetGroupId) {
      setDragging({ groupId: targetGroupId, processId })
    }
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

const startEditProcess = (process: Process) => {
  setEditingProcessId(process.id)
  setProcessForm({
    name: process.name,
    code: process.code,
    description: process.description ?? '',
    is_machine_based: process.is_machine_based,
    is_production: process.is_production,
  })
  resetNewProcess()
}

  const cancelProcessEdit = () => {
    setEditingProcessId(null)
    setProcessForm({})
  }

  const saveProcess = async (id: string) => {
    const trimmedName = processForm.name?.trim()
    const trimmedCode = processForm.code?.trim()
    if (!trimmedName || !trimmedCode) {
      toast.error('Süreç adı ve dosya ismi zorunludur')
      return
    }
    try {
      setSavingProcessId(id)
      await processesAPI.update(id, {
        name: trimmedName,
        code: trimmedCode.toUpperCase(),
        description: (processForm.description ?? '').trim(),
        is_machine_based: !!processForm.is_machine_based,
        is_production: !!processForm.is_production,
      })
      toast.success('Süreç güncellendi')
      cancelProcessEdit()
      await loadProcesses(false)
    } catch (error) {
      handleError(error)
      toast.error('Süreç güncellenemedi')
    } finally {
      setSavingProcessId(null)
    }
  }

  const handleGroupChange = async (process: Process, targetGroupId: string) => {
    try {
      setSavingProcessId(process.id)
      await processesAPI.update(process.id, {
        group_id: targetGroupId || null,
      })
      toast.success('Süreç grubu güncellendi')
      await loadProcesses(false)
    } catch (error) {
      handleError(error)
      toast.error('Süreç yeniden gruplanamadı')
    } finally {
      setSavingProcessId(null)
    }
  }

  const saveOrder = async ({ silent = false }: { silent?: boolean } = {}) => {
    const groupsToSave = Array.from(dirtyGroups)
    const hasProcessOrderChanges = groupsToSave.length > 0
    const hasGroupOrderChanges = groupOrderDirty
    if (!hasProcessOrderChanges && !hasGroupOrderChanges) return
    try {
      setSavingOrder(true)
      const updates: Promise<any>[] = []

      if (hasProcessOrderChanges) {
        groupsToSave.forEach((groupId) => {
          const list =
            groupId === '__ungrouped__'
              ? ungrouped
              : groups.find((g) => g.id === groupId)?.processes || []
          const normalizedGroupId = groupId === '__ungrouped__' ? null : groupId

          list.forEach((process, index) => {
            updates.push(
              processesAPI.update(process.id, {
                order_index: index + 1,
                group_id: process.group_id ?? normalizedGroupId,
              }),
            )
          })
        })
      }

      if (hasGroupOrderChanges) {
        groups.forEach((group, index) => {
          updates.push(
            processesAPI.updateGroup(group.id, {
              order_index: index + 1,
            }),
          )
        })
      }

      await Promise.all(updates)
      if (!silent) {
        toast.success('Sıralamalar kaydedildi')
      }
      if (hasProcessOrderChanges) {
        setDirtyGroups((prev) => {
          const next = new Set(prev)
          groupsToSave.forEach((groupId) => {
            next.delete(groupId)
          })
          return next
        })
      }
      if (hasGroupOrderChanges) {
        setGroupOrderDirty(false)
        setGroups((prev) =>
          prev.map((group, index) => ({
            ...group,
            order_index: index + 1,
          })),
        )
      }
    } catch (error) {
      handleError(error)
      toast.error('Sıralama kaydedilemedi')
    } finally {
      setSavingOrder(false)
    }
  }

  useEffect(() => {
    if (!dragging && !groupDraggingId && (dirtyGroups.size > 0 || groupOrderDirty) && !savingOrder) {
      void saveOrder({ silent: true })
    }
  }, [dragging, groupDraggingId, dirtyGroups, groupOrderDirty, savingOrder, saveOrder])

  const deleteProcess = async (process: Process) => {
    if (!confirm(`"${process.name}" sürecini silmek istiyor musunuz?`)) return
    try {
      setSavingProcessId(process.id)
      await processesAPI.delete(process.id)
      toast.success('Süreç silindi')
      await loadProcesses(false)
    } catch (error) {
      handleError(error)
      toast.error('Süreç silinemedi')
    } finally {
      setSavingProcessId(null)
    }
  }

const createGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupForm.name.trim()) {
      toast.error('Grup adı zorunludur')
      return
    }
    try {
      setCreatingGroup(true)
      await processesAPI.createGroup({
        name: newGroupForm.name.trim(),
        description: newGroupForm.description.trim() || undefined,
      })
      toast.success('Grup oluşturuldu')
      setNewGroupForm({ name: '', description: '' })
      await loadProcesses(false)
    } catch (error) {
      handleError(error)
      toast.error('Grup oluşturulamadı')
    } finally {
      setCreatingGroup(false)
    }
  }

const startGroupEdit = (group: ProcessGroup) => {
  setEditingGroupId(group.id)
  setGroupEditForm({
    name: group.name,
    description: group.description ?? '',
  })
}

const cancelGroupEdit = () => {
  setEditingGroupId(null)
  setGroupEditForm({ name: '', description: '' })
}

const saveGroup = async () => {
  if (!editingGroupId) return
    if (!groupEditForm.name.trim()) {
      toast.error('Grup adı zorunludur')
      return
    }
    try {
      setSavingGroup(true)
      await processesAPI.updateGroup(editingGroupId, {
        name: groupEditForm.name.trim(),
        description: groupEditForm.description.trim() || undefined,
      })
      toast.success('Grup güncellendi')
      cancelGroupEdit()
      await loadProcesses(false)
    } catch (error) {
      handleError(error)
      toast.error('Grup güncellenemedi')
    } finally {
      setSavingGroup(false)
    }
  }

const deleteGroup = async (group: ProcessGroup) => {
  if (!confirm(`"${group.name}" grubunu silmek istiyor musunuz?`)) return
  try {
    setSavingGroup(true)
    await processesAPI.deleteGroup(group.id)
    toast.success('Grup silindi')
    await loadProcesses(false)
  } catch (error) {
    handleError(error)
    toast.error('Grup silinemedi')
  } finally {
    setSavingGroup(false)
  }
}

const startNewProcess = (targetGroupId: string) => {
  setEditingProcessId(null)
  setProcessForm({})
  setNewProcessTarget(targetGroupId)
  setNewProcessForm({
    name: '',
    code: '',
    is_machine_based: false,
    is_production: false,
  })
}

const cancelNewProcess = () => {
  resetNewProcess()
}

const handleCreateProcess = async (targetGroupId: string) => {
  if (!newProcessForm.name.trim() || !newProcessForm.code.trim()) {
    toast.error('Süreç adı ve dosya ismi zorunludur')
    return
  }

  try {
    setCreatingProcess(true)
    const orderIndex =
      targetGroupId === '__ungrouped__'
        ? ungrouped.length + 1
        : (groups.find((g) => g.id === targetGroupId)?.processes.length || 0) + 1

    await processesAPI.create({
      name: newProcessForm.name.trim(),
      code: newProcessForm.code.trim().toUpperCase(),
      description: undefined,
      is_machine_based: newProcessForm.is_machine_based,
      is_production: newProcessForm.is_production,
      order_index: orderIndex,
      group_id: targetGroupId === '__ungrouped__' ? null : targetGroupId,
    })
    toast.success('Süreç oluşturuldu')
    resetNewProcess()
    await loadProcesses(false)
  } catch (error) {
    handleError(error)
    toast.error('Süreç oluşturulamadı')
  } finally {
    setCreatingProcess(false)
  }
}

const renderProcessRow = (process: Process, groupId: string) => {
  const isEditing = editingProcessId === process.id
  return (
      <tr
        key={process.id}
        className="border-b align-top"
        draggable
        onDragStart={() => setDragging({ groupId, processId: process.id })}
        onDragEnd={() => setDragging(null)}
        onDragOver={(e) => {
          e.preventDefault()
          handleRowDragOver(groupId, process.id)
        }}
        onDrop={(e) => e.preventDefault()}
      >
        <td className="py-3 px-4 w-[32px] align-top text-sm text-gray-400">
          <span className="flex items-center justify-center text-gray-400">
            <GripVertical className="h-4 w-4" />
          </span>
        </td>
        <td className="py-3 px-4">
          {isEditing ? (
            <Input
              value={processForm.name ?? ''}
              onChange={(e) => setProcessForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          ) : (
            <span className="font-medium text-gray-900">{process.name}</span>
          )}
        </td>
        <td className="py-3 px-4">
          {isEditing ? (
            <Input
              value={processForm.code ?? ''}
              onChange={(e) => setProcessForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Dosya İsmi"
            />
          ) : (
            <span className="rounded bg-gray-100 px-2 py-1 text-xs uppercase text-gray-700">
              {process.code}
            </span>
          )}
        </td>
        <td className="py-3 px-4 text-sm text-gray-500">
          <select
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
            value={process.group_id ?? ''}
            onChange={(e) => handleGroupChange(process, e.target.value)}
            disabled={savingProcessId === process.id}
          >
            {groupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </td>
        <td className="py-3 px-4 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelProcessEdit}
                disabled={savingProcessId === process.id}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => saveProcess(process.id)}
                disabled={savingProcessId === process.id}
              >
                {savingProcessId === process.id ? 'Kaydediliyor...' : <Save className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => startEditProcess(process)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => deleteProcess(process)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </td>
      </tr>
  )
}

const renderNewProcessRow = (groupId: string) => {
  const isUngrouped = groupId === '__ungrouped__'
  const groupName = isUngrouped
    ? 'Grupsuz'
    : groups.find((g) => g.id === groupId)?.name || 'Grup'

  return (
    <tr className="border-b bg-blue-50">
      <td className="py-3 px-4 w-[32px] align-top text-sm text-gray-400">
        <span className="flex items-center justify-center text-blue-400">
          <GripVertical className="h-4 w-4" />
        </span>
      </td>
      <td className="py-3 px-4">
        <Input
          autoFocus
          value={newProcessForm.name}
          onChange={(e) => setNewProcessForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Süreç adı"
          disabled={creatingProcess}
        />
      </td>
      <td className="py-3 px-4">
        <Input
          value={newProcessForm.code}
          onChange={(e) =>
            setNewProcessForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
          }
          placeholder="Dosya İsmi"
          disabled={creatingProcess}
        />
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">
        <span className="text-xs uppercase text-gray-500">{groupName}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={cancelNewProcess} disabled={creatingProcess}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => handleCreateProcess(groupId)} disabled={creatingProcess}>
            {creatingProcess ? 'Ekleniyor...' : <Save className="h-4 w-4" />}
          </Button>
        </div>
      </td>
    </tr>
  )
}

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">Süreç Yönetimi</h1>
        <p className="text-gray-600">Süreçleri tanımlayın, gruplayın ve düzenleyin</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Yeni Grup Oluştur</CardTitle>
              <p className="text-sm text-gray-500">Süreçler için dosya klasörlerini ve grupları yönetin</p>
            </div>
            {(dirtyGroups.size > 0 || groupOrderDirty) && (
              <Button size="sm" className="gap-2" onClick={() => saveOrder()} disabled={savingOrder}>
                <Save className="h-4 w-4" />
                {savingOrder ? 'Kaydediliyor...' : 'Sıralamayı Kaydet'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end" onSubmit={createGroup}>
            <div className="space-y-2">
              <Label htmlFor="group_name">Grup Adı *</Label>
              <Input
                id="group_name"
                value={newGroupForm.name}
                onChange={(e) => setNewGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: Dijital Baskı"
                required
                disabled={creatingGroup}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_desc">Açıklama</Label>
              <Input
                id="group_desc"
                value={newGroupForm.description}
                onChange={(e) => setNewGroupForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="İsteğe bağlı açıklama"
                disabled={creatingGroup}
              />
            </div>
            <Button type="submit" disabled={creatingGroup} className="mt-2 sm:mt-0">
              {creatingGroup ? 'Ekleniyor...' : 'Grup Oluştur'}
            </Button>
          </form>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="hidden lg:table w-full border text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2 px-4 w-[32px]"></th>
                    <th className="py-2 px-4 text-left">Süreç</th>
                    <th className="py-2 px-4 text-left">Dosya İsmi</th>
                    <th className="py-2 px-4 text-left">Grup</th>
                    <th className="py-2 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const isExpanded = expandedGroups[group.id] ?? true
                    return (
                      <Fragment key={group.id}>
                        <tr
                          key={group.id}
                          className="border-b bg-gray-100"
                          onDragOver={(e) => {
                            e.preventDefault()
                            handleGroupDragOver(group.id)
                          }}
                          onDrop={(e) => e.preventDefault()}
                        >
                          <td className="py-3 px-4 w-[64px]">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-gray-400 hover:text-gray-500 cursor-grab"
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = 'move'
                                  event.dataTransfer.setData('text/plain', group.id)
                                  setGroupDraggingId(group.id)
                                }}
                                onDragEnd={() => setGroupDraggingId(null)}
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleGroup(group.id)}
                                className="text-gray-600"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td colSpan={3} className="py-3 px-4">
                            {editingGroupId === group.id ? (
                                <div className="grid gap-3 md:grid-cols-[2fr_3fr_auto] items-center">
                                <Input
                                  value={groupEditForm.name}
                                  onChange={(e) => setGroupEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                />
                                <Input
                                  value={groupEditForm.description}
                                  onChange={(e) => setGroupEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                  placeholder="Açıklama"
                                />
                                <div className="flex justify-end gap-2 md:col-span-1">
                                  <Button variant="outline" size="sm" onClick={cancelGroupEdit} disabled={savingGroup}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" onClick={saveGroup} disabled={savingGroup}>
                                    {savingGroup ? 'Kaydediliyor...' : <Save className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                                  {group.description && (
                                    <p className="text-xs text-gray-500">{group.description}</p>
                                  )}
                                </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startNewProcess(group.id)}
                            disabled={creatingProcess && newProcessTarget === group.id}
                            className="border-dashed border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startGroupEdit(group)}
                                    disabled={savingGroup}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => deleteGroup(group)}
                                    disabled={savingGroup}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-gray-500">
                            {group.processes.length} süreç
                          </td>
                        </tr>
                        {isExpanded &&
                          group.processes.map((process) => renderProcessRow(process, group.id))}
                        {isExpanded && newProcessTarget === group.id && renderNewProcessRow(group.id)}
                        {isExpanded && group.processes.length === 0 && newProcessTarget !== group.id && (
                          <tr
                            className="border-b"
                            onDragOver={(e) => {
                              e.preventDefault()
                              handleGroupDragOver(group.id)
                            }}
                            onDrop={(e) => e.preventDefault()}
                          >
                            <td colSpan={5} className="py-4 px-4 text-center text-xs text-gray-500">
                              Bu gruba henüz süreç eklenmemiş.
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}

                  <tr
                    className="border-b bg-gray-100"
                    onDragOver={(e) => {
                      e.preventDefault()
                      handleGroupDragOver('__ungrouped__')
                    }}
                    onDrop={(e) => e.preventDefault()}
                  >
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleGroup('__ungrouped__')}
                        className="text-gray-600"
                      >
                        {expandedGroups['__ungrouped__'] ?? true ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td colSpan={4} className="py-3 px-4 text-sm font-semibold text-gray-900">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>Atanmamış Süreçler ({ungrouped.length})</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startNewProcess('__ungrouped__')}
                          disabled={creatingProcess && newProcessTarget === '__ungrouped__'}
                          className="border-dashed border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {(expandedGroups['__ungrouped__'] ?? true) &&
                    ((ungrouped.length > 0 || newProcessTarget === '__ungrouped__') ? (
                      <>
                        {ungrouped.map((process) => renderProcessRow(process, '__ungrouped__'))}
                        {newProcessTarget === '__ungrouped__' && renderNewProcessRow('__ungrouped__')}
                      </>
                    ) : (
                      <tr
                        className="border-b"
                        onDragOver={(e) => {
                          e.preventDefault()
                          handleGroupDragOver('__ungrouped__')
                        }}
                        onDrop={(e) => e.preventDefault()}
                      >
                        <td colSpan={5} className="py-4 px-4 text-center text-xs text-gray-500">
                          Grupsuz süreç yok.
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className="lg:hidden space-y-4">
                {groups.map((group) => {
                  const isExpanded = expandedGroups[group.id] ?? true
                  return (
                    <div
                      key={group.id}
                      className="border rounded-lg overflow-hidden"
                      onDragOver={(e) => {
                        e.preventDefault()
                        handleGroupDragOver(group.id)
                      }}
                      onDrop={(e) => e.preventDefault()}
                    >
                      <div className="bg-gray-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className="text-gray-400 hover:text-gray-500 cursor-grab"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move'
                                event.dataTransfer.setData('text/plain', group.id)
                                setGroupDraggingId(group.id)
                              }}
                              onDragEnd={() => setGroupDraggingId(null)}
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{group.name}</p>
                                {group.description && (
                                  <p className="text-xs text-gray-500">{group.description}</p>
                                )}
                              </div>
                            </button>
                          </div>
                          <div className="flex gap-2">
                            {editingGroupId === group.id ? (
                              <>
                                <Button variant="outline" size="sm" onClick={cancelGroupEdit} disabled={savingGroup}>
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={saveGroup} disabled={savingGroup}>
                                  <Save className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startNewProcess(group.id)}
                                  className="border-dashed border-blue-200 text-blue-600"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => startGroupEdit(group)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => deleteGroup(group)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {editingGroupId === group.id && (
                          <div className="mt-3 space-y-2">
                            <Input
                              value={groupEditForm.name}
                              onChange={(e) => setGroupEditForm((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="Grup adı"
                            />
                            <Input
                              value={groupEditForm.description}
                              onChange={(e) => setGroupEditForm((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="Açıklama"
                            />
                          </div>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="divide-y">
                          {group.processes.length === 0 && newProcessTarget !== group.id ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                              Bu gruba henüz süreç eklenmemiş.
                            </div>
                          ) : (
                            <>
                              {group.processes.map((process) => {
                                const isEditing = editingProcessId === process.id
                                return (
                                  <div key={process.id} className="p-4 bg-white">
                                    <div className="flex items-start gap-3">
                                      <GripVertical className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                                      <div className="flex-1 space-y-3">
                                        {isEditing ? (
                                          <>
                                            <Input
                                              value={processForm.name ?? ''}
                                              onChange={(e) => setProcessForm((prev) => ({ ...prev, name: e.target.value }))}
                                              placeholder="Süreç adı"
                                            />
                                            <Input
                                              value={processForm.code ?? ''}
                                              onChange={(e) => setProcessForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                              placeholder="Dosya İsmi"
                                            />
                                            <select
                                              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                                              value={process.group_id ?? ''}
                                              onChange={(e) => handleGroupChange(process, e.target.value)}
                                            >
                                              {groupOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                  {option.label}
                                                </option>
                                              ))}
                                            </select>
                                          </>
                                        ) : (
                                          <>
                                            <div>
                                              <p className="font-medium text-gray-900">{process.name}</p>
                                              <span className="inline-block mt-1 rounded bg-gray-100 px-2 py-1 text-xs uppercase text-gray-700">
                                                {process.code}
                                              </span>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                              <select
                                                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                                value={process.group_id ?? ''}
                                                onChange={(e) => handleGroupChange(process, e.target.value)}
                                                disabled={savingProcessId === process.id}
                                              >
                                                {groupOptions.map((option) => (
                                                  <option key={option.value} value={option.value}>
                                                    {option.label}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          </>
                                        )}
                                        <div className="flex gap-2">
                                          {isEditing ? (
                                            <>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={cancelProcessEdit}
                                                disabled={savingProcessId === process.id}
                                                className="flex-1"
                                              >
                                                <X className="h-4 w-4 mr-1" />
                                                İptal
                                              </Button>
                                              <Button
                                                size="sm"
                                                onClick={() => saveProcess(process.id)}
                                                disabled={savingProcessId === process.id}
                                                className="flex-1"
                                              >
                                                <Save className="h-4 w-4 mr-1" />
                                                Kaydet
                                              </Button>
                                            </>
                                          ) : (
                                            <>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => startEditProcess(process)}
                                                className="flex-1"
                                              >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Düzenle
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-red-600"
                                                onClick={() => deleteProcess(process)}
                                              >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Sil
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              {newProcessTarget === group.id && (
                                <div className="p-4 bg-blue-50">
                                  <div className="space-y-3">
                                    <Input
                                      autoFocus
                                      value={newProcessForm.name}
                                      onChange={(e) => setNewProcessForm((prev) => ({ ...prev, name: e.target.value }))}
                                      placeholder="Süreç adı"
                                      disabled={creatingProcess}
                                    />
                                    <Input
                                      value={newProcessForm.code}
                                      onChange={(e) =>
                                        setNewProcessForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                                      }
                                      placeholder="Dosya İsmi"
                                      disabled={creatingProcess}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={cancelNewProcess}
                                        disabled={creatingProcess}
                                        className="flex-1"
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        İptal
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleCreateProcess(group.id)}
                                        disabled={creatingProcess}
                                        className="flex-1"
                                      >
                                        <Save className="h-4 w-4 mr-1" />
                                        {creatingProcess ? 'Ekleniyor...' : 'Ekle'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Ungrouped Processes - Mobile */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleGroup('__ungrouped__')}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        {expandedGroups['__ungrouped__'] ?? true ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <p className="font-semibold text-gray-900">
                          Atanmamış Süreçler ({ungrouped.length})
                        </p>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startNewProcess('__ungrouped__')}
                        className="border-dashed border-blue-200 text-blue-600"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(expandedGroups['__ungrouped__'] ?? true) && (
                    <div className="divide-y">
                      {ungrouped.length === 0 && newProcessTarget !== '__ungrouped__' ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Grupsuz süreç yok.
                        </div>
                      ) : (
                        <>
                          {ungrouped.map((process) => {
                            const isEditing = editingProcessId === process.id
                            return (
                              <div key={process.id} className="p-4 bg-white">
                                <div className="flex items-start gap-3">
                                  <GripVertical className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                                  <div className="flex-1 space-y-3">
                                    {isEditing ? (
                                      <>
                                        <Input
                                          value={processForm.name ?? ''}
                                          onChange={(e) => setProcessForm((prev) => ({ ...prev, name: e.target.value }))}
                                          placeholder="Süreç adı"
                                        />
                                        <Input
                                          value={processForm.code ?? ''}
                                          onChange={(e) => setProcessForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                          placeholder="Dosya İsmi"
                                        />
                                        <select
                                          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                                          value={process.group_id ?? ''}
                                          onChange={(e) => handleGroupChange(process, e.target.value)}
                                        >
                                          {groupOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </>
                                    ) : (
                                      <>
                                        <div>
                                          <p className="font-medium text-gray-900">{process.name}</p>
                                          <span className="inline-block mt-1 rounded bg-gray-100 px-2 py-1 text-xs uppercase text-gray-700">
                                            {process.code}
                                          </span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          <select
                                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={process.group_id ?? ''}
                                            onChange={(e) => handleGroupChange(process, e.target.value)}
                                            disabled={savingProcessId === process.id}
                                          >
                                            {groupOptions.map((option) => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </>
                                    )}
                                    <div className="flex gap-2">
                                      {isEditing ? (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={cancelProcessEdit}
                                            disabled={savingProcessId === process.id}
                                            className="flex-1"
                                          >
                                            <X className="h-4 w-4 mr-1" />
                                            İptal
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => saveProcess(process.id)}
                                            disabled={savingProcessId === process.id}
                                            className="flex-1"
                                          >
                                            <Save className="h-4 w-4 mr-1" />
                                            Kaydet
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => startEditProcess(process)}
                                            className="flex-1"
                                          >
                                            <Edit className="h-4 w-4 mr-1" />
                                            Düzenle
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-red-600"
                                            onClick={() => deleteProcess(process)}
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Sil
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {newProcessTarget === '__ungrouped__' && (
                            <div className="p-4 bg-blue-50">
                              <div className="space-y-3">
                                <Input
                                  autoFocus
                                  value={newProcessForm.name}
                                  onChange={(e) => setNewProcessForm((prev) => ({ ...prev, name: e.target.value }))}
                                  placeholder="Süreç adı"
                                  disabled={creatingProcess}
                                />
                                <Input
                                  value={newProcessForm.code}
                                  onChange={(e) =>
                                    setNewProcessForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                                  }
                                  placeholder="Dosya İsmi"
                                  disabled={creatingProcess}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelNewProcess}
                                    disabled={creatingProcess}
                                    className="flex-1"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    İptal
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleCreateProcess('__ungrouped__')}
                                    disabled={creatingProcess}
                                    className="flex-1"
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    {creatingProcess ? 'Ekleniyor...' : 'Ekle'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
