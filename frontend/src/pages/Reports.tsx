import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

type ReportType =
  | 'project-overview'
  | 'time-entry-detail'
  | 'expense-report'
  | 'roi-report'
  | 'consultant-profitability'

interface Project {
  id: string
  name: string
  client_name: string
  status: string
}

interface TimeEntry {
  id: string
  project_id: string
  project_name?: string
  user_name: string
  date: string
  hours: number
  description: string
}

interface ToolExpense {
  id: string
  project_id: string
  project_name?: string
  tool_name: string
  cost: number
  currency: string
  date: string
}

interface RevenueEntry {
  id: string
  project_id: string
  project_name?: string
  amount: number
  currency: string
  date: string
}

interface BenefitEntry {
  id: string
  project_id: string
  project_name?: string
  description: string
  monetary_value: number
  currency: string
  status: string
}

interface ClientInvestment {
  id: string
  project_id: string
  project_name?: string
  amount: number
  currency: string
  date: string
}

interface FinancialSummary {
  confirmed_revenue: string
  total_labor_cost: string
  total_expenses: string
  consultant_profit: string
  consultant_margin: string | null
}

interface RoiSummary {
  roi: number
  payback_months: number
  total_benefits: number
  total_investment: number
  currency: string
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'project-overview', label: '项目总览' },
  { value: 'time-entry-detail', label: '工时明细' },
  { value: 'expense-report', label: '费用报表' },
  { value: 'roi-report', label: 'ROI报表' },
  { value: 'consultant-profitability', label: '顾问利润' },
]

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 4v12m-5-5l5 5 5-5M4 20h16" />
    </svg>
  )
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('project-overview')
  const [projectId, setProjectId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [generatedAt, setGeneratedAt] = useState<string>('')

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
  })

  const projects = projectsQuery.data || []

  const timeEntriesQuery = useQuery({
    queryKey: ['time-entries', projectId, dateFrom, dateTo, reportType],
    enabled: reportType === 'time-entry-detail' || reportType === 'consultant-profitability',
    queryFn: () => apiClient.get<TimeEntry[]>('/time-entries'),
  })

  const expensesQuery = useQuery({
    queryKey: ['tool-expenses', projectId, dateFrom, dateTo, reportType],
    enabled: reportType === 'expense-report',
    queryFn: () => apiClient.get<ToolExpense[]>('/tool-expenses'),
  })

  const revenueQuery = useQuery({
    queryKey: ['revenue-entries', reportType],
    enabled: reportType === 'project-overview',
    queryFn: () => apiClient.get<RevenueEntry[]>('/revenue-entries'),
  })

  const investmentsQuery = useQuery({
    queryKey: ['client-investments', reportType],
    enabled: reportType === 'project-overview',
    queryFn: () => apiClient.get<ClientInvestment[]>('/client-investments'),
  })

  const benefitsQuery = useQuery({
    queryKey: ['benefit-entries', reportType],
    enabled: reportType === 'roi-report',
    queryFn: () => apiClient.get<BenefitEntry[]>('/benefit-entries'),
  })

  const financialSummary = useQuery({
    queryKey: ['financial-summary', projectId, reportType],
    enabled: !!projectId && (reportType === 'project-overview' || reportType === 'roi-report' || reportType === 'consultant-profitability'),
    queryFn: () => apiClient.get<FinancialSummary>(`/aggregations/projects/${projectId}/financial-summary`),
  }).data

  const roiSummaryQuery = useQuery({
    queryKey: ['roi-summary', projectId, reportType],
    enabled: !!projectId && reportType === 'roi-report',
    queryFn: () => apiClient.get<RoiSummary>(`/aggregations/projects/${projectId}/roi-summary`),
  })

  const filterRow = (row: { date?: string; project_id?: string }): boolean => {
    if (projectId && row.project_id && row.project_id !== projectId) return false
    if (dateFrom && row.date && row.date < dateFrom) return false
    if (dateTo && row.date && row.date > dateTo) return false
    return true
  }

  const handleExport = (): void => {
    setGeneratedAt(new Date().toLocaleString())
    if (reportType === 'project-overview') {
      const rows = projects.map((p) => [
        p.id,
        p.name,
        p.client_name,
        p.status,
        (revenueQuery.data || []).filter((r) => r.project_id === p.id).reduce((s, r) => s + r.amount, 0),
        (investmentsQuery.data || []).filter((i) => i.project_id === p.id).reduce((s, i) => s + i.amount, 0),
      ])
      downloadCsv('project-overview.csv', ['项目ID', '项目名称', '客户名称', '状态', '收入合计', '投资合计'], rows)
    } else if (reportType === 'time-entry-detail') {
      const rows = (timeEntriesQuery.data || []).filter(filterRow).map((t) => [
        t.id, t.project_id, t.user_name, t.date, t.hours, t.description,
      ])
      downloadCsv('time-entries.csv', ['ID', '项目ID', '顾问', '日期', '工时', '描述'], rows)
    } else if (reportType === 'expense-report') {
      const rows = (expensesQuery.data || []).filter(filterRow).map((e) => [
        e.id, e.project_id, e.tool_name, e.cost, e.currency, e.date,
      ])
      downloadCsv('expenses.csv', ['ID', '项目ID', '工具名称', '费用', '币种', '日期'], rows)
    } else if (reportType === 'roi-report') {
      const summary = roiSummaryQuery.data
      const rows = (benefitsQuery.data || []).filter((b) => !projectId || b.project_id === projectId).map((b) => [
        b.id, b.project_id, b.description, b.monetary_value, b.currency, b.status,
      ])
      if (summary) {
        rows.push(['', '', 'ROI 汇总', summary.roi, summary.currency, ''])
        rows.push(['', '', '回收期(月)', summary.payback_months, summary.currency, ''])
      }
      downloadCsv('roi-report.csv', ['ID', '项目ID', '描述', '金额', '币种', '状态'], rows)
    } else if (reportType === 'consultant-profitability') {
      const filtered = (timeEntriesQuery.data || []).filter(filterRow)
      const byUser = new Map<string, number>()
      filtered.forEach((t) => byUser.set(t.user_name, (byUser.get(t.user_name) || 0) + t.hours))
      const rows = Array.from(byUser.entries()).map(([name, hours]) => [name, hours])
      if (financialSummary) {
        rows.push(['', ''])
        rows.push(['确认收入', financialSummary.confirmed_revenue])
        rows.push(['劳务成本', financialSummary.total_labor_cost])
        rows.push(['总费用', financialSummary.total_expenses])
        rows.push(['顾问利润', financialSummary.consultant_profit])
        rows.push(['顾问利润率', financialSummary.consultant_margin || 'N/A'])
      }
      downloadCsv('consultant-profitability.csv', ['顾问', '工时合计'], rows)
    }
  }

  const filterSummary = [
    `报表类型: ${REPORT_TYPES.find((r) => r.value === reportType)?.label}`,
    projectId ? `项目: ${projects.find((p) => p.id === projectId)?.name || projectId}` : '项目: 全部',
    `日期范围: ${dateFrom || '不限'} 至 ${dateTo || '不限'}`,
  ].join(' | ')

  const selectStyle: React.CSSProperties = { width: 'auto', minWidth: 140 }
  const dateStyle: React.CSSProperties = { width: 140 }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">报表</span>
        </div>
        <div className="page-header-actions">
          <select
            className="form-input"
            style={selectStyle}
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
          >
            {REPORT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <select
            className="form-input"
            style={selectStyle}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">全部项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="form-input"
            style={dateStyle}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="form-input"
            style={dateStyle}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleExport}>
            <DownloadIcon />
            导出 CSV
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: 'var(--text-3)' }}>
          <span>{filterSummary}</span>
          {generatedAt && <span>生成时间: {generatedAt}</span>}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {reportType === 'project-overview' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>客户名称</th>
                  <th>状态</th>
                  <th className="num">收入合计</th>
                  <th className="num">投资合计</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">暂无数据</td></tr>
                )}
                {projects.map((p) => {
                  const revenue = (revenueQuery.data || []).filter((r) => r.project_id === p.id).reduce((s, r) => s + r.amount, 0)
                  const investment = (investmentsQuery.data || []).filter((i) => i.project_id === p.id).reduce((s, i) => s + i.amount, 0)
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.client_name}</td>
                      <td><span className="badge badge-active">{p.status}</span></td>
                      <td className="num">{revenue}</td>
                      <td className="num">{investment}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {reportType === 'time-entry-detail' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>顾问</th>
                  <th>项目ID</th>
                  <th>日期</th>
                  <th className="num">工时</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody>
                {(timeEntriesQuery.data || []).filter(filterRow).length === 0 && (
                  <tr><td colSpan={5} className="empty-state">暂无数据</td></tr>
                )}
                {(timeEntriesQuery.data || []).filter(filterRow).map((t) => (
                  <tr key={t.id}>
                    <td>{t.user_name}</td>
                    <td>{t.project_id}</td>
                    <td>{t.date}</td>
                    <td className="num">{t.hours}</td>
                    <td>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'expense-report' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>项目ID</th>
                  <th>工具名称</th>
                  <th className="num">费用</th>
                  <th>币种</th>
                  <th>日期</th>
                </tr>
              </thead>
              <tbody>
                {(expensesQuery.data || []).filter(filterRow).length === 0 && (
                  <tr><td colSpan={5} className="empty-state">暂无数据</td></tr>
                )}
                {(expensesQuery.data || []).filter(filterRow).map((e) => (
                  <tr key={e.id}>
                    <td>{e.project_id}</td>
                    <td>{e.tool_name}</td>
                    <td className="num">{e.cost}</td>
                    <td>{e.currency}</td>
                    <td>{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'roi-report' && (
            <>
              {roiSummaryQuery.data && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 12px 0' }}>
                  <span className="badge badge-active">ROI: {roiSummaryQuery.data.roi}</span>
                  <span className="badge badge-pending">回收期: {roiSummaryQuery.data.payback_months} 月</span>
                </div>
              )}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>项目ID</th>
                    <th>描述</th>
                    <th className="num">金额</th>
                    <th>币种</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {(benefitsQuery.data || []).filter((b) => !projectId || b.project_id === projectId).length === 0 && (
                    <tr><td colSpan={5} className="empty-state">暂无数据</td></tr>
                  )}
                  {(benefitsQuery.data || []).filter((b) => !projectId || b.project_id === projectId).map((b) => (
                    <tr key={b.id}>
                      <td>{b.project_id}</td>
                      <td>{b.description}</td>
                      <td className="num">{b.monetary_value}</td>
                      <td>{b.currency}</td>
                      <td><span className="badge badge-info">{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {reportType === 'consultant-profitability' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>顾问</th>
                  <th className="num">工时合计</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = (timeEntriesQuery.data || []).filter(filterRow)
                  const byUser = new Map<string, number>()
                  filtered.forEach((t) => byUser.set(t.user_name, (byUser.get(t.user_name) || 0) + t.hours))
                  const rows = Array.from(byUser.entries())
                  if (rows.length === 0) {
                    return <tr><td colSpan={2} className="empty-state">暂无数据</td></tr>
                  }
                  return rows.map(([name, hours]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="num">{hours}</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
