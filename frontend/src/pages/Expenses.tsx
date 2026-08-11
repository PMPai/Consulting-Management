import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

interface Expense {
  id: string
  project_id: string
  date: string
  name: string
  category: string
  amount: string
  billable_to_client: boolean
  notes: string | null
}

interface Project {
  id: string
  name: string
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ai_tools', label: 'AI工具' },
  { value: 'saas_software', label: 'SaaS软件' },
  { value: 'cloud_services', label: '云服务' },
  { value: 'data_services', label: '数据服务' },
  { value: 'travel', label: '差旅' },
  { value: 'contractors', label: '承包商' },
  { value: 'equipment', label: '设备' },
  { value: 'other', label: '其他' },
]

const categoryLabel = (value: string): string =>
  CATEGORY_OPTIONS.find((c) => c.value === value)?.label || value

function formatAmount(value: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\n')
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  )
}

export default function Expenses() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['tool-expenses'],
    queryFn: () => apiClient.get<Expense[]>('/tool-expenses'),
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tool-expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-expenses'] })
      setDeleteTarget(null)
    },
  })

  const projectName = (projectId: string) =>
    projects?.find((p) => p.id === projectId)?.name || '—'

  const filtered = useMemo(() => {
    return (expenses || []).filter((e) => {
      if (projectFilter && e.project_id !== projectFilter) return false
      if (categoryFilter && e.category !== categoryFilter) return false
      return true
    })
  }, [expenses, projectFilter, categoryFilter])

  const totals = useMemo(() => {
    let total = 0
    let billable = 0
    let nonBillable = 0
    for (const e of filtered) {
      const amt = Number(e.amount) || 0
      total += amt
      if (e.billable_to_client) billable += amt
      else nonBillable += amt
    }
    return { total, billable, nonBillable }
  }, [filtered])

  const handleExport = () => {
    const header = ['日期', '名称', '类别', '金额', '项目', '可计费', '备注']
    const rows = filtered.map((e) => [
      e.date ? new Date(e.date).toLocaleDateString() : '',
      e.name,
      categoryLabel(e.category),
      String(Number(e.amount) || 0),
      projectName(e.project_id),
      e.billable_to_client ? '是' : '否',
      e.notes || '',
    ])
    const csv = buildCsv([header, ...rows])
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">工具费用</span>
        </div>
        <div className="page-header-actions">
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: 160 }}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">全部项目</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: 140 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">全部类别</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={handleExport} disabled={filtered.length === 0}>
            <DownloadIcon />
            导出 CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <PlusIcon />
            添加费用
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">费用总计</div>
            <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{formatAmount(String(totals.total))}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">可计费</div>
            <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>¥{formatAmount(String(totals.billable))}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">不可计费</div>
            <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>¥{formatAmount(String(totals.nonBillable))}</div>
          </div>
        </div>

        <div className="section-title">费用明细</div>

        {isLoading ? (
          <div className="card empty-state">加载中...</div>
        ) : filtered.length > 0 ? (
          <div className="card card-flush">
            <table className="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>名称</th>
                  <th>类别</th>
                  <th className="num">金额</th>
                  <th>项目</th>
                  <th>可计费</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date ? new Date(exp.date).toLocaleDateString() : '—'}</td>
                    <td>{exp.name}</td>
                    <td>{categoryLabel(exp.category)}</td>
                    <td className="num" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{formatAmount(exp.amount)}</td>
                    <td>{projectName(exp.project_id)}</td>
                    <td>
                      <span className={`badge ${exp.billable_to_client ? 'badge-active' : 'badge-pending'}`}>
                        {exp.billable_to_client ? '是' : '否'}
                      </span>
                    </td>
                    <td>{exp.notes || '—'}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(exp); setShowForm(true) }}>
                          <EditIcon />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(exp)}>
                          <TrashIcon />
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
            {expenses && expenses.length > 0 ? '当前筛选条件下无记录' : '暂无费用记录，点击“添加费用”开始'}
          </div>
        )}
      </div>

      {showForm && (
        <ExpenseForm
          expense={editing}
          projects={projects || []}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          expense={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

function ExpenseForm({ expense, projects, onClose, onSaved }: {
  expense: Expense | null
  projects: Project[]
  onClose: () => void
  onSaved: () => void
}) {
  const [projectId, setProjectId] = useState(expense?.project_id || projects[0]?.id || '')
  const [date, setDate] = useState(expense?.date?.split('T')[0] || new Date().toISOString().split('T')[0])
  const [name, setName] = useState(expense?.name || '')
  const [category, setCategory] = useState(expense?.category || 'ai_tools')
  const [amount, setAmount] = useState(expense?.amount || '')
  const [billable, setBillable] = useState(expense?.billable_to_client ?? false)
  const [notes, setNotes] = useState(expense?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = {
        project_id: projectId,
        date,
        name,
        category,
        amount: Number(amount),
        billable_to_client: billable,
        notes: notes || null,
      }
      if (expense) {
        await apiClient.patch(`/tool-expenses/${expense.id}`, data)
      } else {
        await apiClient.post('/tool-expenses', data)
      }
      queryClient.invalidateQueries({ queryKey: ['tool-expenses'] })
      onSaved()
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{expense ? '编辑费用' : '添加费用'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>项目 *</label>
              <select className="form-input" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                <option value="">请选择项目</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>日期 *</label>
                <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>类别 *</label>
                <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>名称 *</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>金额 *</label>
                <input type="number" step="0.01" min="0" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
                  可计费给客户
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ expense, onConfirm, onCancel, loading }: {
  expense: Expense
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>删除费用</h2>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: 'var(--text-2)' }}>
            确认要删除费用 “{expense.name}” 吗？
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
