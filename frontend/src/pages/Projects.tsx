import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

interface Project {
  id: string
  name: string
  code: string | null
  client_id: string
  owner_user_id: string
  status: string
  billing_model: string
  start_date: string | null
  end_date: string | null
  total_quote: string | null
  final_goal: string | null
  notes: string | null
  objective: string | null
  description: string | null
  version: number
}

interface Client {
  id: string
  name: string
  code: string | null
  status: string
}

interface Phase {
  id: string
  project_id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: string
  completion_pct: number
  planned_hours: string | null
  kpi_definition: string | null
  milestone_goal: string | null
  estimated_expense: string | null
  color: string | null
  display_order: number
}

interface ProjectFile {
  id: string
  project_id: string
  filename: string
  file_type: string | null
  file_size: number | null
  description: string | null
  category: string | null
  created_at: string
}

interface FinancialSummary {
  total_revenue: string | null
  total_expense: string | null
  profit: string | null
  profit_margin: number | null
}

interface PhaseDraft {
  tempId: string
  name: string
  start_date: string
  end_date: string
  planned_hours: string
  kpi_definition: string
  milestone_goal: string
  estimated_expense: string
  color: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const statusLabels: Record<string, string> = {
  planning: '规划中',
  active: '进行中',
  on_hold: '暂停',
  completed: '已完成',
  cancelled: '已取消',
}

const statusBadgeClass: Record<string, string> = {
  planning: 'badge-info',
  active: 'badge-active',
  on_hold: 'badge-pending',
  completed: 'badge-active',
  cancelled: 'badge-inactive',
}

const billingLabels: Record<string, string> = {
  hourly: '按时计费',
  fixed_fee: '固定费用',
  retainer: '预付包月',
  hybrid: '混合',
}

const phaseStatusLabels: Record<string, string> = {
  planning: '规划中',
  active: '进行中',
  on_hold: '暂停',
  completed: '已完成',
  cancelled: '已取消',
}

const phaseStatusBadgeClass: Record<string, string> = {
  planning: 'badge-info',
  active: 'badge-active',
  on_hold: 'badge-pending',
  completed: 'badge-active',
  cancelled: 'badge-inactive',
}

function newPhaseDraft(): PhaseDraft {
  return {
    tempId: Math.random().toString(36).slice(2),
    name: '',
    start_date: '',
    end_date: '',
    planned_hours: '',
    kpi_definition: '',
    milestone_goal: '',
    estimated_expense: '',
    color: '#2E6FF2',
  }
}

function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return value
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('zh-CN')
}

async function uploadFile(
  projectId: string,
  file: File,
  phaseId: string | null,
  description: string | null,
  category: string | null,
): Promise<ProjectFile> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('projectId', projectId)
  if (phaseId) fd.append('phaseId', phaseId)
  if (description) fd.append('description', description)
  if (category) fd.append('category', category)

  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}/project-files/upload`, {
    method: 'POST',
    headers,
    body: fd,
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message || '上传失败')
  }
  return body.data as ProjectFile
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function IconOpen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusBadgeClass[status] || 'badge-info'}`}>
      {statusLabels[status] || status}
    </span>
  )
}

function PhaseStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${phaseStatusBadgeClass[status] || 'badge-info'}`}>
      {phaseStatusLabels[status] || status}
    </span>
  )
}

export default function Projects() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [detailTarget, setDetailTarget] = useState<Project | null>(null)
  const queryClient = useQueryClient()

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.get<Client[]>('/clients'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDeleteTarget(null)
    },
  })

  const clientName = (clientId: string) =>
    clients?.find((c) => c.id === clientId)?.name || '—'

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">项目</span>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
            <IconPlus />
            新建项目
          </button>
        </div>
      </div>

      <div className="page-body">
        {isLoading ? (
          <div className="empty-state">加载中...</div>
        ) : projects && projects.length > 0 ? (
          <div className="card card-flush">
            <table className="data-table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>客户</th>
                  <th>状态</th>
                  <th className="num">总体报价</th>
                  <th>开始日期</th>
                  <th>结束日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="text-2">{clientName(p.client_id)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="num">
                      {p.total_quote ? `¥${formatMoney(p.total_quote)}` : '—'}
                    </td>
                    <td className="text-2">{formatDate(p.start_date)}</td>
                    <td className="text-2">{formatDate(p.end_date)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="打开项目"
                          onClick={() => setDetailTarget(p)}
                        >
                          <IconOpen />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="编辑"
                          onClick={() => { setEditing(p); setShowForm(true) }}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="删除"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card empty-state">
            暂无项目，点击"新建项目"开始
          </div>
        )}
      </div>

      {showForm && (
        <ProjectForm
          project={editing}
          clients={clients || []}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['projects'] })
          }}
        />
      )}

      {detailTarget && (
        <ProjectDetail
          project={detailTarget}
          clientName={clientName(detailTarget.client_id)}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          project={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

function ProjectForm({ project, clients, onClose, onSaved }: {
  project: Project | null
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(project?.name || '')
  const [code, setCode] = useState(project?.code || '')
  const [clientId, setClientId] = useState(project?.client_id || clients[0]?.id || '')
  const [ownerUserId, setOwnerUserId] = useState(project?.owner_user_id || '')
  const [status, setStatus] = useState(project?.status || 'planning')
  const [billingModel, setBillingModel] = useState(project?.billing_model || 'hourly')
  const [startDate, setStartDate] = useState(project?.start_date?.split('T')[0] || '')
  const [endDate, setEndDate] = useState(project?.end_date?.split('T')[0] || '')
  const [totalQuote, setTotalQuote] = useState(project?.total_quote || '')
  const [finalGoal, setFinalGoal] = useState(project?.final_goal || '')
  const [notes, setNotes] = useState(project?.notes || '')
  const [phases, setPhases] = useState<PhaseDraft[]>(project ? [] : [newPhaseDraft()])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const isEdit = !!project

  const addPhase = () => setPhases((p) => [...p, newPhaseDraft()])
  const removePhase = (tempId: string) =>
    setPhases((p) => p.filter((ph) => ph.tempId !== tempId))
  const updatePhase = (tempId: string, field: keyof PhaseDraft, value: string) =>
    setPhases((p) => p.map((ph) => (ph.tempId === tempId ? { ...ph, [field]: value } : ph)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data: Record<string, unknown> = {
        name,
        code: code || null,
        client_id: clientId,
        owner_user_id: ownerUserId || null,
        status,
        billing_model: billingModel,
        start_date: startDate || null,
        end_date: endDate || null,
        total_quote: totalQuote === '' ? null : totalQuote,
        final_goal: finalGoal || null,
        notes: notes || null,
      }

      let projectId = project?.id

      if (project) {
        await apiClient.patch(`/projects/${project.id}`, data)
      } else {
        let ownerId = ownerUserId
        if (!ownerId) {
          const me = await apiClient.get<{ id: string }>('/auth/me')
          ownerId = me.id
        }
        const created = await apiClient.post<Project>('/projects', { ...data, owner_user_id: ownerId })
        projectId = created.id
      }

      if (!isEdit && projectId && phases.length > 0) {
        const validPhases = phases.filter((ph) => ph.name.trim() !== '')
        for (let i = 0; i < validPhases.length; i++) {
          const ph = validPhases[i]
          await apiClient.post('/phases', {
            project_id: projectId,
            name: ph.name,
            start_date: ph.start_date || null,
            end_date: ph.end_date || null,
            planned_hours: ph.planned_hours === '' ? null : ph.planned_hours,
            kpi_definition: ph.kpi_definition || null,
            milestone_goal: ph.milestone_goal || null,
            estimated_expense: ph.estimated_expense === '' ? null : ph.estimated_expense,
            color: ph.color || '#2E6FF2',
            display_order: i,
            status: 'planning',
            completion_pct: 0,
          })
        }
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onSaved()
    } catch (err: unknown) {
      const e2 = err as { message?: string }
      setError(e2.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 760, maxWidth: '92vw' }}>
        <div className="modal-header">
          <h2>{isEdit ? '编辑项目' : '新建项目'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="关闭">
            <IconClose />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>项目名称 *</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>项目代码</label>
                <input className="form-input" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>客户 *</label>
                <select className="form-input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                  <option value="">请选择客户</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>负责人 (owner_user_id)</label>
              <input
                className="form-input"
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
                placeholder="留空则使用当前用户"
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>状态</label>
                <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>计费模式</label>
                <select className="form-input" value={billingModel} onChange={(e) => setBillingModel(e.target.value)}>
                  {Object.entries(billingLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>开始日期</label>
                <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>结束日期</label>
                <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>总体报价 (total_quote)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={totalQuote}
                onChange={(e) => setTotalQuote(e.target.value)}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            <div className="form-group">
              <label>最终目标 (final_goal)</label>
              <input className="form-input" value={finalGoal} onChange={(e) => setFinalGoal(e.target.value)} />
            </div>
            <div className="form-group">
              <label>备注 (notes)</label>
              <textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {!isEdit && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>阶段 (Phases)</div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addPhase}>
                    <IconPlus />
                    添加阶段
                  </button>
                </div>
                <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8, background: 'var(--bg-app)' }}>
                  {phases.length === 0 ? (
                    <div className="empty-state" style={{ padding: 16 }}>暂无阶段，点击"添加阶段"</div>
                  ) : (
                    phases.map((ph, idx) => (
                      <div key={ph.tempId} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 8, background: 'var(--bg-panel)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div className="card-title" style={{ marginBottom: 0, fontSize: 13 }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: ph.color || '#2E6FF2', marginRight: 8, verticalAlign: 'middle' }} />
                            阶段 {idx + 1}
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            title="删除阶段"
                            onClick={() => removePhase(ph.tempId)}
                          >
                            <IconTrash />
                          </button>
                        </div>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label>阶段名称 *</label>
                          <input className="form-input" value={ph.name} onChange={(e) => updatePhase(ph.tempId, 'name', e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div className="form-group" style={{ flex: 1, marginBottom: 8 }}>
                            <label>开始日期</label>
                            <input type="date" className="form-input" value={ph.start_date} onChange={(e) => updatePhase(ph.tempId, 'start_date', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ flex: 1, marginBottom: 8 }}>
                            <label>结束日期</label>
                            <input type="date" className="form-input" value={ph.end_date} onChange={(e) => updatePhase(ph.tempId, 'end_date', e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div className="form-group" style={{ flex: 1, marginBottom: 8 }}>
                            <label>预估工时</label>
                            <input className="form-input" type="number" step="0.01" value={ph.planned_hours} onChange={(e) => updatePhase(ph.tempId, 'planned_hours', e.target.value)} style={{ fontVariantNumeric: 'tabular-nums' }} />
                          </div>
                          <div className="form-group" style={{ flex: 1, marginBottom: 8 }}>
                            <label>预估支出</label>
                            <input className="form-input" type="number" step="0.01" value={ph.estimated_expense} onChange={(e) => updatePhase(ph.tempId, 'estimated_expense', e.target.value)} style={{ fontVariantNumeric: 'tabular-nums' }} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label>KPI 定义</label>
                          <input className="form-input" value={ph.kpi_definition} onChange={(e) => updatePhase(ph.tempId, 'kpi_definition', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label>阶段性目标</label>
                          <input className="form-input" value={ph.milestone_goal} onChange={(e) => updatePhase(ph.tempId, 'milestone_goal', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>颜色</label>
                          <input type="color" className="form-input" style={{ height: 32, padding: 2 }} value={ph.color} onChange={(e) => updatePhase(ph.tempId, 'color', e.target.value)} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {error && <div style={{ color: 'var(--error)', fontSize: 13, padding: '0 20px 8px' }}>{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.6 }}>
      <span className="text-3" style={{ flexShrink: 0, width: 84 }}>{label}</span>
      <span style={{ color: 'var(--text-1)' }}>{children}</span>
    </div>
  )
}

function ProjectDetail({ project, clientName, onClose }: {
  project: Project
  clientName: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)

  const { data: phases, isLoading: phasesLoading } = useQuery({
    queryKey: ['phases', project.id],
    queryFn: () => apiClient.get<Phase[]>(`/phases?projectId=${project.id}`),
  })

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['project-files', project.id],
    queryFn: () => apiClient.get<ProjectFile[]>(`/project-files?projectId=${project.id}`),
  })

  const { data: financial } = useQuery({
    queryKey: ['financial-summary', project.id],
    queryFn: () => apiClient.get<FinancialSummary>(`/aggregations/projects/${project.id}/financial-summary`),
  })

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-files/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-files', project.id] }),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      await uploadFile(project.id, file, null, uploadDesc || null, uploadCategory || null)
      queryClient.invalidateQueries({ queryKey: ['project-files', project.id] })
      setUploadDesc('')
      setUploadCategory('')
      setFileInputKey((k) => k + 1)
    } catch (err: unknown) {
      const e2 = err as { message?: string }
      setUploadError(e2.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 820, maxWidth: '92vw' }}>
        <div className="modal-header">
          <h2>{project.name}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="关闭">
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">基本信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailField label="客户">{clientName}</DetailField>
              <DetailField label="状态"><StatusBadge status={project.status} /></DetailField>
              <DetailField label="计费模式">{billingLabels[project.billing_model] || project.billing_model}</DetailField>
              <DetailField label="总体报价">
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {project.total_quote ? `¥${formatMoney(project.total_quote)}` : '—'}
                </span>
              </DetailField>
              <DetailField label="开始日期">{formatDate(project.start_date)}</DetailField>
              <DetailField label="结束日期">{formatDate(project.end_date)}</DetailField>
            </div>
            {project.final_goal && (
              <div style={{ marginTop: 12 }}>
                <DetailField label="最终目标">{project.final_goal}</DetailField>
              </div>
            )}
            {project.notes && (
              <div style={{ marginTop: 8 }}>
                <DetailField label="备注">{project.notes}</DetailField>
              </div>
            )}
            {financial && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                <div className="section-title" style={{ marginBottom: 8 }}>财务概要</div>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  <span><span className="text-3">收入 </span>¥{formatMoney(financial.total_revenue)}</span>
                  <span><span className="text-3">支出 </span>¥{formatMoney(financial.total_expense)}</span>
                  <span><span className="text-3">利润 </span>¥{formatMoney(financial.profit)}</span>
                  {financial.profit_margin !== null && (
                    <span><span className="text-3">利润率 </span>{(financial.profit_margin * 100).toFixed(1)}%</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="section-title">阶段</div>
          {phasesLoading ? (
            <div className="empty-state">加载中...</div>
          ) : phases && phases.length > 0 ? (
            <div className="card card-flush" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>阶段</th>
                    <th>日期</th>
                    <th>状态</th>
                    <th>KPI</th>
                    <th>阶段性目标</th>
                    <th className="num">预估支出</th>
                    <th className="num">实际支出</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((ph) => (
                    <tr key={ph.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: ph.color || '#2E6FF2' }} />
                          {ph.name}
                        </span>
                      </td>
                      <td className="text-2">{formatDate(ph.start_date)} ~ {formatDate(ph.end_date)}</td>
                      <td><PhaseStatusBadge status={ph.status} /></td>
                      <td className="text-2">{ph.kpi_definition || '—'}</td>
                      <td className="text-2">{ph.milestone_goal || '—'}</td>
                      <td className="num">{ph.estimated_expense ? `¥${formatMoney(ph.estimated_expense)}` : '—'}</td>
                      <td className="num">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card empty-state" style={{ marginBottom: 16 }}>暂无阶段</div>
          )}

          <div className="section-title">文件</div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                placeholder="描述"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
              />
              <input
                className="form-input"
                placeholder="分类"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
              />
              <input
                type="file"
                key={fileInputKey}
                id={`file-upload-${project.id}`}
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
              <label
                htmlFor={`file-upload-${project.id}`}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}
              >
                <IconUpload />
                {uploading ? '上传中...' : '上传文件'}
              </label>
            </div>
            {uploadError && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>{uploadError}</div>}
            {filesLoading ? (
              <div className="empty-state">加载中...</div>
            ) : files && files.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>类型</th>
                    <th className="num">大小</th>
                    <th>描述</th>
                    <th>分类</th>
                    <th>上传时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id}>
                      <td>{f.filename}</td>
                      <td className="text-2">{f.file_type || '—'}</td>
                      <td className="num">{f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                      <td className="text-2">{f.description || '—'}</td>
                      <td className="text-2">{f.category || '—'}</td>
                      <td className="text-2">{formatDate(f.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="删除文件"
                          onClick={() => deleteFileMutation.mutate(f.id)}
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">暂无文件</div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ project, onConfirm, onCancel, loading }: {
  project: Project
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
        <div className="modal-header">
          <h2>删除项目</h2>
          <button className="btn btn-ghost btn-icon" onClick={onCancel} title="关闭">
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
            确认要删除项目 "{project.name}" 吗？相关的时间记录、费用、投资和收益数据将保留但不再显示。
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>取消</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading ? '删除中...' : '确认删除'}</button>
        </div>
      </div>
    </div>
  )
}
