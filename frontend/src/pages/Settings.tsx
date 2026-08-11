import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { useAuth } from '../lib/auth'

interface Organization {
  id: string
  name: string
  currency: string
  timezone: string
}

interface RoleRate {
  id: string | null
  role: string
  internal_cost_rate: string
  client_billing_rate: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: '管理员',
  assistant: '助理',
  consultant: '顾问',
  viewer: '访客',
}

const ROLE_ORDER: string[] = ['owner', 'assistant', 'consultant', 'viewer']

const DEFAULT_ROLE_RATES: RoleRate[] = ROLE_ORDER.map((role) => ({
  id: null,
  role,
  internal_cost_rate: '0',
  client_billing_rate: '0',
}))

export default function Settings() {
  const { user } = useAuth()

  const orgQuery = useQuery({
    queryKey: ['organization'],
    queryFn: () => apiClient.get<Organization>('/organizations/me'),
    retry: false,
  })

  const ratesQuery = useQuery({
    queryKey: ['role-rates'],
    queryFn: () => apiClient.get<RoleRate[]>('/role-rates'),
    retry: false,
  })

  const org = orgQuery.data
  const fetchedRates = ratesQuery.data || []
  const orderedRates = ROLE_ORDER.map(
    (role) => fetchedRates.find((r) => r.role === role) || {
      id: null,
      role,
      internal_cost_rate: '0',
      client_billing_rate: '0',
    },
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">设置</span>
        </div>
        <div className="page-header-actions" />
      </div>

      <div className="page-body">
        <div className="section-title">角色费率</div>
        <RoleRatesSection rates={orderedRates} defaults={DEFAULT_ROLE_RATES} />

        <div className="section-title" style={{ marginTop: 24 }}>组织信息</div>
        <div className="card">
          <InfoRow label="组织名称" value={org?.name || '—'} />
          <InfoRow label="币种" value={org?.currency || '—'} />
          <InfoRow label="默认时区" value={org?.timezone || '—'} />
        </div>

        <div className="section-title" style={{ marginTop: 24 }}>当前用户</div>
        <div className="card">
          <InfoRow label="姓名" value={user?.name || '—'} />
          <InfoRow label="邮箱" value={user?.email || '—'} />
          <InfoRow label="角色" value={(user?.role && ROLE_LABELS[user.role]) || user?.role || '—'} />
          <InfoRow label="时区" value={user?.timezone || '—'} />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ width: 140, fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{value}</div>
    </div>
  )
}

function RoleRatesSection({
  rates,
  defaults,
}: {
  rates: RoleRate[]
  defaults: RoleRate[]
}) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, { internal_cost_rate: string; client_billing_rate: string }>>({})
  const [savedRole, setSavedRole] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState('')

  void defaults

  useEffect(() => {
    const next: Record<string, { internal_cost_rate: string; client_billing_rate: string }> = {}
    for (const r of rates) {
      if (drafts[r.role] === undefined) {
        next[r.role] = {
          internal_cost_rate: r.internal_cost_rate,
          client_billing_rate: r.client_billing_rate,
        }
      }
    }
    if (Object.keys(next).length > 0) {
      setDrafts((prev) => ({ ...prev, ...next }))
    }
  }, [rates, drafts])

  const updateField = (role: string, field: 'internal_cost_rate' | 'client_billing_rate', value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }))
    setSavedRole(null)
  }

  const isDirty = (role: string): boolean => {
    const original = rates.find((r) => r.role === role)
    const draft = drafts[role]
    if (!original || !draft) return false
    return original.internal_cost_rate !== draft.internal_cost_rate || original.client_billing_rate !== draft.client_billing_rate
  }

  const anyDirty = rates.some((r) => isDirty(r.role))

  const mutation = useMutation({
    mutationFn: async (role: string) => {
      const draft = drafts[role]
      if (!draft) throw new Error('缺少费率数据')
      return apiClient.put<RoleRate>(`/role-rates/${role}`, {
        internal_cost_rate: draft.internal_cost_rate,
        client_billing_rate: draft.client_billing_rate,
      })
    },
    onSuccess: (_data, role) => {
      setSavedRole(role)
      queryClient.invalidateQueries({ queryKey: ['role-rates'] })
    },
    onError: (err: unknown) => {
      const e = err as { message?: string }
      setGlobalError(e.message || '保存失败')
    },
  })

  const saveAll = () => {
    setGlobalError('')
    const dirtyRoles = rates.filter((r) => isDirty(r.role)).map((r) => r.role)
    for (const role of dirtyRoles) {
      mutation.mutate(role)
    }
  }

  const moneyInputStyle: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', maxWidth: 180 }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>角色</th>
            <th className="num">内部成本费率</th>
            <th className="num">客户计费费率</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => {
            const draft = drafts[r.role] || { internal_cost_rate: r.internal_cost_rate, client_billing_rate: r.client_billing_rate }
            const dirty = isDirty(r.role)
            const justSaved = savedRole === r.role
            return (
              <tr key={r.role}>
                <td><span className="badge badge-active">{ROLE_LABELS[r.role] || r.role}</span></td>
                <td className="num">
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    style={moneyInputStyle}
                    value={draft.internal_cost_rate}
                    onChange={(e) => updateField(r.role, 'internal_cost_rate', e.target.value)}
                  />
                </td>
                <td className="num">
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    style={moneyInputStyle}
                    value={draft.client_billing_rate}
                    onChange={(e) => updateField(r.role, 'client_billing_rate', e.target.value)}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => mutation.mutate(r.role)}
                    disabled={!dirty || mutation.isPending}
                  >
                    {justSaved ? '已保存' : '保存'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 12 }}>
        <button
          className="btn btn-primary"
          onClick={saveAll}
          disabled={!anyDirty || mutation.isPending}
        >
          {mutation.isPending ? '保存中...' : '保存全部'}
        </button>
      </div>
      {globalError && (
        <div style={{ color: 'var(--error)', fontSize: 12, padding: '0 12px 12px' }}>{globalError}</div>
      )}
    </div>
  )
}
