import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

interface Project {
  id: string
  name: string
}

interface Investment {
  id: string
  project_id: string
  date: string
  investment_type: string
  amount: string
  description: string | null
  status: string
}

interface Benefit {
  id: string
  project_id: string
  benefit_name: string
  benefit_type: string
  observation_date: string
  amount: string
  status: string
  notes: string | null
}

interface ROISummary {
  roi: string | null
  net_benefit: string | null
  total_investment: string
  total_verified_benefit: string
  missing_inputs: string[]
  display_text: string
}

const INVESTMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'consulting_fees', label: '咨询费' },
  { value: 'client_internal_labor', label: '客户内部人力' },
  { value: 'client_software', label: '客户软件' },
  { value: 'implementation', label: '实施' },
  { value: 'training', label: '培训' },
  { value: 'other', label: '其他' },
]

const BENEFIT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'incremental_revenue', label: '增量收入' },
  { value: 'labor_savings', label: '人力节省' },
  { value: 'tool_savings', label: '工具节省' },
  { value: 'loss_avoidance', label: '风险规避' },
  { value: 'efficiency_gain', label: '效率提升' },
  { value: 'other', label: '其他' },
]

const investmentTypeLabel = (value: string): string =>
  INVESTMENT_TYPE_OPTIONS.find((t) => t.value === value)?.label || value

const benefitTypeLabel = (value: string): string =>
  BENEFIT_TYPE_OPTIONS.find((t) => t.value === value)?.label || value

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
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

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export default function ClientROI() {
  const [projectId, setProjectId] = useState('')
  const [showInvestmentForm, setShowInvestmentForm] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [deleteInvestment, setDeleteInvestment] = useState<Investment | null>(null)
  const [showBenefitForm, setShowBenefitForm] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null)
  const [deleteBenefit, setDeleteBenefit] = useState<Benefit | null>(null)
  const queryClient = useQueryClient()

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
  })

  const { data: roiSummary } = useQuery({
    queryKey: ['roi-summary', projectId],
    queryFn: () => apiClient.get<ROISummary>(`/aggregations/projects/${projectId}/roi-summary`),
    enabled: !!projectId,
  })

  const deleteInvestmentMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/client-investments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-investments'] })
      queryClient.invalidateQueries({ queryKey: ['roi-summary', projectId] })
      setDeleteInvestment(null)
    },
  })

  const deleteBenefitMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/benefit-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-entries'] })
      queryClient.invalidateQueries({ queryKey: ['roi-summary', projectId] })
      setDeleteBenefit(null)
    },
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">客户 ROI</span>
        </div>
        <div className="page-header-actions">
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: 200 }}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">选择项目</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="page-body">
        {!projectId ? (
          <div className="card empty-state">请选择一个项目以查看 ROI 数据</div>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">ROI</div>
                <div className={`kpi-value ${roiSummary?.roi ? (Number(roiSummary.roi) >= 0 ? 'positive' : 'warning') : ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {roiSummary?.roi ? `${Number(roiSummary.roi).toFixed(1)}%` : '无法计算'}
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">净收益</div>
                <div className={`kpi-value ${roiSummary?.net_benefit ? (Number(roiSummary.net_benefit) >= 0 ? 'positive' : 'warning') : ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {roiSummary?.net_benefit ? `¥${Number(roiSummary.net_benefit).toLocaleString()}` : '—'}
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">总投入</div>
                <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {roiSummary ? `¥${Number(roiSummary.total_investment).toLocaleString()}` : '—'}
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">已核实收益</div>
                <div className="kpi-value positive" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {roiSummary ? `¥${Number(roiSummary.total_verified_benefit).toLocaleString()}` : '—'}
                </div>
              </div>
            </div>

            {roiSummary && roiSummary.missing_inputs.length > 0 && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--warning)',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  缺少以下输入
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)' }}>
                  {roiSummary.missing_inputs.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="section-title mb-0">客户投资</div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditingInvestment(null); setShowInvestmentForm(true) }}>
                    <PlusIcon />
                    添加
                  </button>
                </div>
                <InvestmentsSection
                  projectId={projectId}
                  onEdit={(inv) => { setEditingInvestment(inv); setShowInvestmentForm(true) }}
                  onDelete={(inv) => setDeleteInvestment(inv)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="section-title mb-0">客户收益</div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditingBenefit(null); setShowBenefitForm(true) }}>
                    <PlusIcon />
                    添加
                  </button>
                </div>
                <BenefitsSection
                  projectId={projectId}
                  onEdit={(b) => { setEditingBenefit(b); setShowBenefitForm(true) }}
                  onDelete={(b) => setDeleteBenefit(b)}
                />
              </div>
            </div>

            {showInvestmentForm && (
              <InvestmentForm
                investment={editingInvestment}
                projectId={projectId}
                onClose={() => setShowInvestmentForm(false)}
                onSaved={() => {
                  setShowInvestmentForm(false)
                  queryClient.invalidateQueries({ queryKey: ['client-investments'] })
                  queryClient.invalidateQueries({ queryKey: ['roi-summary', projectId] })
                }}
              />
            )}

            {showBenefitForm && (
              <BenefitForm
                benefit={editingBenefit}
                projectId={projectId}
                onClose={() => setShowBenefitForm(false)}
                onSaved={() => {
                  setShowBenefitForm(false)
                  queryClient.invalidateQueries({ queryKey: ['benefit-entries'] })
                  queryClient.invalidateQueries({ queryKey: ['roi-summary', projectId] })
                }}
              />
            )}

            {deleteInvestment && (
              <DeleteConfirm
                title="删除投资"
                message="确认要删除该投资记录吗？"
                onConfirm={() => deleteInvestmentMutation.mutate(deleteInvestment.id)}
                onCancel={() => setDeleteInvestment(null)}
                loading={deleteInvestmentMutation.isPending}
              />
            )}

            {deleteBenefit && (
              <DeleteConfirm
                title="删除收益"
                message={`确认要删除收益 “${deleteBenefit.benefit_name}” 吗？`}
                onConfirm={() => deleteBenefitMutation.mutate(deleteBenefit.id)}
                onCancel={() => setDeleteBenefit(null)}
                loading={deleteBenefitMutation.isPending}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function InvestmentsSection({ projectId, onEdit, onDelete }: {
  projectId: string
  onEdit: (inv: Investment) => void
  onDelete: (inv: Investment) => void
}) {
  const { data: investments, isLoading } = useQuery({
    queryKey: ['client-investments', projectId],
    queryFn: () => apiClient.get<Investment[]>('/client-investments'),
  })

  const filtered = investments?.filter((i) => i.project_id === projectId) || []

  if (isLoading) {
    return <div className="card empty-state">加载中...</div>
  }

  if (filtered.length === 0) {
    return <div className="card empty-state">暂无投资记录</div>
  }

  return (
    <div className="card card-flush">
      <table className="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th className="num">金额</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.date ? new Date(inv.date).toLocaleDateString() : '—'}</td>
              <td>{investmentTypeLabel(inv.investment_type)}</td>
              <td className="num" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{Number(inv.amount).toLocaleString()}</td>
              <td>
                <span className={`badge ${inv.status === 'confirmed' ? 'badge-active' : 'badge-pending'}`}>
                  {inv.status === 'confirmed' ? '已确认' : '预估'}
                </span>
              </td>
              <td>
                <div className="actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => onEdit(inv)}>
                    <EditIcon />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(inv)}>
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BenefitsSection({ projectId, onEdit, onDelete }: {
  projectId: string
  onEdit: (b: Benefit) => void
  onDelete: (b: Benefit) => void
}) {
  const { data: benefits, isLoading } = useQuery({
    queryKey: ['benefit-entries', projectId],
    queryFn: () => apiClient.get<Benefit[]>('/benefit-entries'),
  })

  const filtered = benefits?.filter((b) => b.project_id === projectId) || []

  if (isLoading) {
    return <div className="card empty-state">加载中...</div>
  }

  if (filtered.length === 0) {
    return <div className="card empty-state">暂无收益记录</div>
  }

  return (
    <div className="card card-flush">
      <table className="data-table">
        <thead>
          <tr>
            <th>观测日期</th>
            <th>名称</th>
            <th>类型</th>
            <th className="num">金额</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((b) => (
            <tr key={b.id}>
              <td>{b.observation_date ? new Date(b.observation_date).toLocaleDateString() : '—'}</td>
              <td>{b.benefit_name}</td>
              <td>{benefitTypeLabel(b.benefit_type)}</td>
              <td className="num" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{Number(b.amount).toLocaleString()}</td>
              <td>
                <span className={`badge ${b.status === 'verified' ? 'badge-active' : 'badge-pending'}`}>
                  {b.status === 'verified' ? '已核实' : '预估'}
                </span>
              </td>
              <td>
                <div className="actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => onEdit(b)}>
                    <EditIcon />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(b)}>
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvestmentForm({ investment, projectId, onClose, onSaved }: {
  investment: Investment | null
  projectId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(investment?.date?.split('T')[0] || new Date().toISOString().split('T')[0])
  const [investmentType, setInvestmentType] = useState(investment?.investment_type || 'consulting_fees')
  const [amount, setAmount] = useState(investment?.amount || '')
  const [description, setDescription] = useState(investment?.description || '')
  const [status, setStatus] = useState(investment?.status || 'estimated')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = {
        project_id: projectId,
        date,
        investment_type: investmentType,
        amount: Number(amount),
        description: description || null,
        status,
      }
      if (investment) {
        await apiClient.patch(`/client-investments/${investment.id}`, data)
      } else {
        await apiClient.post('/client-investments', data)
      }
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
          <h2>{investment ? '编辑投资' : '添加投资'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>日期 *</label>
                <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>类型 *</label>
                <select className="form-input" value={investmentType} onChange={(e) => setInvestmentType(e.target.value)}>
                  {INVESTMENT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>金额 *</label>
                <input type="number" step="0.01" min="0" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>状态 *</label>
                <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="estimated">预估</option>
                  <option value="confirmed">已确认</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea className="form-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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

function BenefitForm({ benefit, projectId, onClose, onSaved }: {
  benefit: Benefit | null
  projectId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [benefitName, setBenefitName] = useState(benefit?.benefit_name || '')
  const [benefitType, setBenefitType] = useState(benefit?.benefit_type || 'incremental_revenue')
  const [observationDate, setObservationDate] = useState(benefit?.observation_date?.split('T')[0] || new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState(benefit?.amount || '')
  const [status, setStatus] = useState(benefit?.status || 'estimated')
  const [notes, setNotes] = useState(benefit?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = {
        project_id: projectId,
        benefit_name: benefitName,
        benefit_type: benefitType,
        observation_date: observationDate,
        amount: Number(amount),
        status,
        notes: notes || null,
      }
      if (benefit) {
        await apiClient.patch(`/benefit-entries/${benefit.id}`, data)
      } else {
        await apiClient.post('/benefit-entries', data)
      }
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
          <h2>{benefit ? '编辑收益' : '添加收益'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>收益名称 *</label>
              <input className="form-input" value={benefitName} onChange={(e) => setBenefitName(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>类型 *</label>
                <select className="form-input" value={benefitType} onChange={(e) => setBenefitType(e.target.value)}>
                  {BENEFIT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>观测日期 *</label>
                <input type="date" className="form-input" value={observationDate} onChange={(e) => setObservationDate(e.target.value)} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>金额 *</label>
                <input type="number" step="0.01" min="0" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>状态 *</label>
                <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="estimated">预估</option>
                  <option value="verified">已核实</option>
                </select>
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

function DeleteConfirm({ title, message, onConfirm, onCancel, loading }: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: 'var(--text-2)' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>取消</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading ? '删除中...' : '确认删除'}</button>
        </div>
      </div>
    </div>
  )
}
