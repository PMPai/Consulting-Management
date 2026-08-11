import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { apiClient } from '../lib/api'

interface DashboardData {
  roi: string | null
  roi_display: string
  project_completion: number
  consultant_input_cost: string
  verified_benefits: string
  investment_vs_benefit: { date: string; investment: string; benefit: string }[]
  phase_count: number
  warnings: string[]
}

interface GanttPhase {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: string
  completion_pct: number
  planned_hours: string | null
  owner_user_id: string | null
  color: string | null
  display_order: number
  predecessor_ids: string[]
  kpi_definition: string | null
  milestone_goal: string | null
  estimated_expense: string | null
  actual_time: { actual_minutes: number; actual_cost: string }
  actual_expense: string
  expense_variance: string | null
}

interface GanttData {
  project: {
    id: string; name: string; start_date: string | null; end_date: string | null
    status: string; total_quote: string | null; final_goal: string | null
    objective: string | null; notes: string | null
  }
  phases: GanttPhase[]
  milestones: { id: string; name: string; date: string | null; status: string; phase_id: string | null }[]
}

interface FinancialSummary {
  total_quote: string | null
  consultant_input_cost: string
  estimated_expense: string
  actual_expense: string
  expense_variance: string | null
  phases: {
    phase_id: string; phase_name: string; planned_hours: string | null
    actual_minutes: number; actual_cost: string
    estimated_expense: string; actual_expense: string; expense_variance: string | null
  }[]
}

const fmtMoney = (v: string | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (!isFinite(n)) return '—'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const fmtPct = (n: number): string => `${Math.round(n)}%`

const statusLabel = (status: string): string => {
  switch (status) {
    case 'completed': case 'done': return '已完成'
    case 'in_progress': case 'active': return '进行中'
    case 'not_started': return '未开始'
    case 'on_hold': return '暂停'
    default: return status
  }
}

const toMs = (d: string | null): number => (d ? new Date(d).getTime() : NaN)
const ONE_DAY = 86400000

function GanttChart({ gantt }: { gantt: GanttData }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const datedPhases = gantt.phases.filter(
    (p) => p.start_date && p.end_date && toMs(p.end_date) > toMs(p.start_date),
  )
  if (datedPhases.length === 0) return <div className="empty-state">暂无含有效日期的阶段</div>

  const minDate = Math.min(...datedPhases.map((p) => toMs(p.start_date)))
  const maxDate = Math.max(...datedPhases.map((p) => toMs(p.end_date)))
  const today = Date.now()
  const range = Math.max(maxDate - minDate, ONE_DAY)
  const pad = range * 0.05
  const start = minDate - pad
  const end = maxDate + pad
  const span = end - start

  const LC = 200
  const RH = 36
  const RG = 4
  const HH = 48
  const PPD = 36
  const EXP_H = 56

  const days = Math.ceil(span / ONE_DAY)
  const tw = Math.max(days * PPD, 400)

  const xAt = (ts: number) => ((ts - start) / span) * tw

  const months: { l: string; x: number }[] = []
  const mc = new Date(start); mc.setDate(1); mc.setHours(0, 0, 0, 0)
  while (mc.getTime() < end) {
    if (mc.getTime() >= start) months.push({ l: `${mc.getMonth() + 1}月`, x: xAt(mc.getTime()) })
    mc.setMonth(mc.getMonth() + 1)
  }

  const days2: { l: string; x: number }[] = []
  const dc = new Date(start); dc.setHours(0, 0, 0, 0)
  while (dc.getTime() < end) {
    if (dc.getTime() >= start) days2.push({ l: `${dc.getDate()}`, x: xAt(dc.getTime()) })
    dc.setDate(dc.getDate() + 1)
  }

  const todayX = xAt(today)
  const todayVis = today >= start && today <= end
  const phases = [...gantt.phases].sort((a, b) => a.display_order - b.display_order)

  const colors = ['#2E6FF2', '#22C55E', '#F59E0B', '#9333EA', '#EF4444', '#0891B2']
  const phaseColor = (p: GanttPhase, i: number) => p.color?.trim() || colors[i % colors.length]

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Inner content sized to total width */}
      <div style={{ display: 'inline-block', minWidth: '100%', position: 'relative' }}>
        {/* Header — sticky */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: HH,
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            width: `calc(200px + ${tw}px)`,
            minWidth: `calc(200px + ${tw}px)`,
          }}
        >
          {/* Left column */}
          <div
            style={{
              width: LC,
              flex: `0 0 ${LC}px`,
              borderRight: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-3)',
            }}
          >
            阶段
          </div>
          {/* Date axis */}
          <div style={{ position: 'relative', width: tw, height: HH, flex: `0 0 ${tw}px` }}>
            {months.map((m, i) => (
              <div
                key={`m${i}`}
                style={{
                  position: 'absolute',
                  left: m.x,
                  top: 0,
                  bottom: 0,
                  borderLeft: '1px solid var(--border)',
                  paddingLeft: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-3)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {m.l}
              </div>
            ))}
            {days2.map((d, i) => (
              <div
                key={`d${i}`}
                style={{
                  position: 'absolute',
                  left: d.x,
                  top: 22,
                  bottom: 0,
                  borderLeft: '1px solid var(--border-light)',
                  opacity: 0.4,
                  fontSize: 9,
                  color: 'var(--text-4)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  paddingBottom: 2,
                }}
              >
                <span style={{ paddingLeft: 1 }}>{d.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body — rows rendered in flow, not absolute */}
        <div style={{ position: 'relative', width: `calc(200px + ${tw}px)`, minWidth: `calc(200px + ${tw}px)` }}>
          {/* Today marker — spans full body height */}
          {todayVis && (
            <div
              style={{
                position: 'absolute',
                left: `calc(${LC}px + ${todayX}px)`,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'var(--error)',
                opacity: 0.4,
                zIndex: 1,
                pointerEvents: 'none',
              }}
              title="今天"
            />
          )}

          {phases.map((p, idx) => {
            const hd = p.start_date && p.end_date && toMs(p.end_date) > toMs(p.start_date)
            const barLeft = hd ? xAt(toMs(p.start_date!)) : 0
            const barWidth = hd ? Math.max(xAt(toMs(p.end_date!)) - barLeft, 6) : 0
            const color = phaseColor(p, idx)
            const comp = Math.max(0, Math.min(100, p.completion_pct || 0))
            const exp = expandedId === p.id

            return (
              <div key={p.id}>
                {/* Row */}
                <div
                  style={{
                    display: 'flex',
                    height: RH,
                    borderBottom: '1px solid var(--border-light)',
                    background: exp ? 'var(--bg-active)' : 'transparent',
                  }}
                >
                  {/* Left info */}
                  <div
                    style={{
                      width: LC,
                      flex: `0 0 ${LC}px`,
                      borderRight: '1px solid var(--border)',
                      padding: '2px 12px',
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                    onClick={() => setExpandedId(exp ? null : p.id)}
                  >
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-3)', fontSize: 10 }}>
                      <span
                        className={`badge ${p.status === 'completed' ? 'badge-active' : 'badge-pending'}`}
                        style={{ fontSize: 9, padding: '0 6px' }}
                      >
                        {statusLabel(p.status)}
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtPct(comp)}</span>
                    </div>
                  </div>
                  {/* Timeline */}
                  <div style={{ position: 'relative', width: tw, flex: `0 0 ${tw}px`, height: RH }}>
                    {hd ? (
                      <div
                        style={{
                          position: 'absolute',
                          left: barLeft,
                          top: 4,
                          width: barWidth,
                          height: RH - 8,
                          borderRadius: 'var(--radius-sm)',
                          background: color,
                          opacity: 0.25,
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                        onClick={() => setExpandedId(exp ? null : p.id)}
                        title={p.name}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${comp}%`,
                            borderRadius: 'var(--radius-sm)',
                            background: color,
                            opacity: 1,
                          }}
                        />
                        {p.estimated_expense && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 4,
                              top: 0,
                              bottom: 0,
                              right: 4,
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: 10,
                              color: '#fff',
                              fontWeight: 600,
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            ¥{fmtMoney(p.estimated_expense)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          left: 8,
                          top: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: 10,
                          color: 'var(--text-4)',
                        }}
                      >
                        无日期
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded detail — inline, pushes content down */}
                {exp && hd && (
                  <div
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--bg-elevated)',
                      padding: '8px 12px 8px 0',
                      fontSize: 11,
                      color: 'var(--text-2)',
                      gap: 0,
                    }}
                  >
                    <div style={{ width: LC, flex: `0 0 ${LC}px`, borderRight: '1px solid var(--border)' }} />
                    <div
                      style={{
                        width: tw,
                        flex: `0 0 ${tw}px`,
                        padding: '0 12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2px 20px',
                      }}
                    >
                      <span><strong style={{ color: 'var(--text-1)' }}>KPI：</strong>{p.kpi_definition || '—'}</span>
                      <span><strong style={{ color: 'var(--text-1)' }}>目标：</strong>{p.milestone_goal || '—'}</span>
                      <span><strong style={{ color: 'var(--text-1)' }}>预估：</strong>¥{fmtMoney(p.estimated_expense)}</span>
                      <span><strong style={{ color: 'var(--text-1)' }}>实际：</strong>¥{fmtMoney(p.actual_expense)}</span>
                      <span><strong style={{ color: 'var(--text-1)' }}>差异：</strong>{p.expense_variance ? `¥${fmtMoney(p.expense_variance)}` : '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Milestones */}
          {gantt.milestones.map((m) => {
            if (!m.date) return null
            const mx = xAt(toMs(m.date))
            if (mx < 0 || mx > tw) return null
            const pi = phases.findIndex((p) => p.id === m.phase_id)
            if (pi < 0) return null
            let offset = 0
            for (let i = 0; i < pi; i++) {
              offset += RH + RG
              if (expandedId === phases[i].id) offset += EXP_H
            }
            const top = offset + RH / 2 - 3
            return (
              <div
                key={m.id}
                title={m.name}
                style={{
                  position: 'absolute',
                  left: `calc(${LC}px + ${mx}px - 3px)`,
                  top,
                  width: 0,
                  height: 0,
                  borderLeft: '3px solid transparent',
                  borderRight: '3px solid transparent',
                  borderBottom: '6px solid var(--warning)',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RoiGauge({ value, display }: { value: string | null; display: string }) {
  const num = value !== null ? Number(value) : NaN
  const valid = value !== null && isFinite(num)
  const pct = valid ? Math.max(-100, Math.min(100, num)) : 0
  const angle = valid ? (pct / 100) * 180 : 0
  const color = !valid ? 'var(--text-4)' : num >= 0 ? 'var(--success)' : 'var(--error)'
  const data = [
    { v: valid ? Math.abs(pct) : 0 },
    { v: valid ? 100 - Math.abs(pct) : 100 },
  ]
  return (
    <div style={{ position: 'relative', width: 96, height: 52, margin: '0 auto' }}>
      <PieChart width={96} height={52} style={{ overflow: 'visible' }}>
        <Pie data={data} dataKey="v" startAngle={180} endAngle={0} cx={48} cy={46} innerRadius={26} outerRadius={36} stroke="none">
          <Cell fill={color} />
          <Cell fill="var(--border)" />
        </Pie>
      </PieChart>
      <div style={{
        position: 'absolute', left: 48, top: 44, width: 2, height: 16,
        background: color, transformOrigin: 'bottom center',
        transform: `rotate(${angle - 90}deg)`,
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 14,
        textAlign: 'center', fontSize: 12, fontWeight: 600, color,
        fontVariantNumeric: 'tabular-nums',
      }}>{display}</div>
    </div>
  )
}

function CompletionRing({ pct }: { pct: number }) {
  const c = Math.max(0, Math.min(100, pct || 0))
  const color = c >= 100 ? 'var(--success)' : c >= 50 ? 'var(--accent)' : 'var(--warning)'
  const data = [{ v: c }, { v: 100 - c }]
  return (
    <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto' }}>
      <PieChart width={88} height={88}>
        <Pie data={data} dataKey="v" startAngle={90} endAngle={-270} cx={44} cy={44} innerRadius={30} outerRadius={38} stroke="none">
          <Cell fill={color} />
          <Cell fill="var(--border)" />
        </Pie>
      </PieChart>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 16, fontWeight: 600, color,
        fontVariantNumeric: 'tabular-nums',
      }}>{fmtPct(c)}</div>
    </div>
  )
}

export default function Dashboard() {
  const [sel, setSel] = useState<string | null>(null)

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ id: string; name: string }[]>('/projects'),
  })

  useEffect(() => {
    if (projects?.length && !sel) setSel(projects[0].id)
  }, [projects, sel])

  const { data: dash } = useQuery({
    queryKey: ['dash', sel],
    queryFn: () => apiClient.get<DashboardData>(`/aggregations/dashboard${sel ? `?projectId=${sel}` : ''}`),
    enabled: !!sel,
  })

  const { data: gantt } = useQuery({
    queryKey: ['gantt', sel],
    queryFn: () => apiClient.get<GanttData>(`/aggregations/projects/${sel}/gantt`),
    enabled: !!sel,
  })

  const { data: fin } = useQuery({
    queryKey: ['fin', sel],
    queryFn: () => apiClient.get<FinancialSummary>(`/aggregations/projects/${sel}/financial-summary`),
    enabled: !!sel,
  })

  const roiN = dash?.roi != null ? Number(dash.roi) : NaN
  const roiValid = !isNaN(roiN) && isFinite(roiN)
  const roiDisp = dash?.roi_display || (roiValid ? `${roiN.toFixed(1)}%` : '无法计算')

  const ivb = (dash?.investment_vs_benefit || []).map((d) => ({
    date: d.date, investment: Number(d.investment) || 0, benefit: Number(d.benefit) || 0,
  }))

  const ph = (fin?.phases || []).map((p) => ({
    name: p.phase_name,
    planned: p.planned_hours ? Number(p.planned_hours) : 0,
    actual: Number((p.actual_minutes / 60).toFixed(1)),
    estExp: Number(p.estimated_expense) || 0,
    actExp: Number(p.actual_expense) || 0,
  }))

  const pi = gantt?.project

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">总览</span>
        </div>
        <div className="page-header-actions">
          <select className="form-input" style={{ width: 'auto', minWidth: 200 }}
            value={sel || ''} onChange={(e) => setSel(e.target.value || null)}>
            <option value="">选择项目</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="page-body">
        {!sel ? (
          <div className="card empty-state">请选择一个项目以查看仪表盘</div>
        ) : (
          <>
            {/* KPI row */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">客户 ROI</div>
                <RoiGauge value={dash?.roi ?? null} display={roiDisp} />
                <div className="kpi-sub">项目周期</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">项目完成度</div>
                <CompletionRing pct={dash?.project_completion || 0} />
              </div>
              <div className="kpi-card">
                <div className="kpi-label">顾问投入成本</div>
                <div className="kpi-value">¥{fmtMoney(dash?.consultant_input_cost)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">已核实客户收益</div>
                <div className="kpi-value positive">¥{fmtMoney(dash?.verified_benefits)}</div>
              </div>
            </div>

            {/* Warnings */}
            {dash?.warnings.length ? (
              <div style={{
                padding: '8px 12px', marginBottom: 16, fontSize: 12,
                background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--warning)',
              }}>
                ⚠ {dash.warnings.map((w) => w === 'MISSING_CLIENT_INVESTMENT' ? '缺少已确认投资' : w === 'NO_VERIFIED_BENEFITS' ? '缺少已验证收益' : w).join('；')}
              </div>
            ) : null}

            {/* Project info + chart */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div className="card" style={{ flex: '1 1 260px', minWidth: 240 }}>
                <div className="section-title">项目概况</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <Row label="总体报价" value={pi?.total_quote ? `¥${fmtMoney(pi.total_quote)}` : '—'} strong />
                  <Row label="最终目标" value={pi?.final_goal || '—'} />
                  <Row label="起止" value={`${pi?.start_date ? new Date(pi.start_date).toLocaleDateString() : '—'} → ${pi?.end_date ? new Date(pi.end_date).toLocaleDateString() : '—'}`} />
                  {pi?.notes && <Row label="备注" value={pi.notes} />}
                  {fin && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                      <Row label="总成本" value={`¥${fmtMoney(fin.actual_expense)}`} />
                      {fin.total_quote && <Row label="报价利润" value={`¥${fmtMoney(fin.expense_variance)}`} strong />}
                    </div>
                  )}
                </div>
              </div>
              <div className="card" style={{ flex: '2 1 400px', minWidth: 300 }}>
                <div className="section-title">投入 vs 收益</div>
                {ivb.length ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={ivb} margin={{ top: 0, right: 0, bottom: 0, left: -8 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={48} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="investment" name="投入" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="benefit" name="收益" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state">暂无数据</div>}
              </div>
            </div>

            {/* Gantt */}
            <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'visible' }}>
              <div style={{ padding: '12px 16px 8px' }}>
                <div className="section-title mb-0">项目甘特图</div>
              </div>
              {gantt?.phases.length ? <GanttChart gantt={gantt} /> : <div className="empty-state">暂无甘特图数据</div>}
            </div>

            {/* Phase health */}
            <div className="card card-flush">
              <div style={{ padding: '12px 16px 8px' }}>
                <div className="section-title mb-0">阶段健康度</div>
              </div>
              {ph.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>阶段</th>
                        <th className="num">计划工时</th>
                        <th className="num">实际工时</th>
                        <th className="num">差异</th>
                        <th className="num">预估费用</th>
                        <th className="num">实际费用</th>
                        <th className="num">费用差异</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ph.map((p) => {
                        const hv = p.actual - p.planned
                        const ev = p.actExp - p.estExp
                        return (
                          <tr key={p.name}>
                            <td>{p.name}</td>
                            <td className="num">{p.planned.toFixed(1)}h</td>
                            <td className="num">{p.actual.toFixed(1)}h</td>
                            <td className="num" style={{ color: hv > 0 ? 'var(--warning)' : 'var(--text-2)' }}>
                              {hv > 0 ? '+' : ''}{hv.toFixed(1)}h
                            </td>
                            <td className="num">¥{fmtMoney(String(p.estExp))}</td>
                            <td className="num">¥{fmtMoney(String(p.actExp))}</td>
                            <td className="num" style={{ color: ev > 0 ? 'var(--warning)' : 'var(--success)' }}>
                              {ev > 0 ? '+' : ''}¥{fmtMoney(String(ev))}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-state">暂无数据</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontWeight: strong ? 600 : 400, color: strong ? 'var(--accent)' : 'var(--text-1)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}
