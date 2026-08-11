import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { useAuth } from '../lib/auth'

interface TimeEntry {
  id: string
  project_id: string
  phase_id: string | null
  work_date: string
  duration_minutes: number
  billable: boolean
  labor_cost: string
  billable_amount: string
  source: string
  timer_status: string | null
  timer_started_at: string | null
  project_name: string | null
  phase_name: string | null
}

interface Project {
  id: string
  name: string
}

interface Phase {
  id: string
  name: string
  project_id: string
}

type Visibility = 'private' | 'internal' | 'client_visible'

const formatDuration = (minutes: number): string => {
  const m = Math.max(0, Math.floor(minutes))
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}:${mm.toString().padStart(2, '0')}`
}

const formatElapsed = (startedAt: string | null): number => {
  if (!startedAt) return 0
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return 0
  return (Date.now() - start) / 60000
}

const escapeCsv = (value: unknown): string => {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const downloadCsv = (rows: string[][]) => {
  const body = rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `time-entries-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function TimeTracking() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tick, setTick] = useState(0)
  const [showManual, setShowManual] = useState(false)
  const [stopTarget, setStopTarget] = useState<TimeEntry | null>(null)
  const [notice, setNotice] = useState('')
  const [startProjectId, setStartProjectId] = useState('')
  const [startPhaseId, setStartPhaseId] = useState('')
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['time-entries'],
    queryFn: () => apiClient.get<TimeEntry[]>('/time-entries'),
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
  })

  const phasesQuery = useQuery({
    queryKey: ['phases', startProjectId],
    queryFn: () => apiClient.get<Phase[]>('/phases'),
    enabled: !!startProjectId,
  })

  const runningTimer = useMemo(
    () => entries?.find((e) => e.timer_status === 'running') ?? null,
    [entries],
  )

  useEffect(() => {
    if (runningTimer && runningTimer.timer_started_at) {
      if (tickRef.current) clearInterval(tickRef.current)
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000)
      return () => {
        if (tickRef.current) {
          clearInterval(tickRef.current)
          tickRef.current = null
        }
      }
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    return undefined
  }, [runningTimer?.id, runningTimer?.timer_started_at])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['time-entries'] })
  }

  const startMutation = useMutation({
    mutationFn: (vars: { project_id: string; phase_id?: string }) =>
      apiClient.post<TimeEntry>('/time-entries/timer/start', vars),
    onSuccess: () => {
      setNotice('')
      invalidateAll()
    },
    onError: (err: unknown) => {
      const e = err as { message?: string }
      setNotice(e.message || '无法启动计时器')
    },
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => apiClient.post<TimeEntry>(`/time-entries/timer/${id}/pause`),
    onSuccess: invalidateAll,
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => apiClient.post<TimeEntry>(`/time-entries/timer/${id}/resume`),
    onSuccess: invalidateAll,
  })

  const stopMutation = useMutation({
    mutationFn: (vars: {
      id: string
      body: { activitySummary: string; activityDetails?: string; tags?: string; visibility?: Visibility }
    }) => apiClient.post<TimeEntry>(`/time-entries/timer/${vars.id}/stop`, vars.body),
    onSuccess: () => {
      setStopTarget(null)
      invalidateAll()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/time-entries/${id}`),
    onSuccess: invalidateAll,
  })

  const handleStart = () => {
    if (runningTimer) {
      setNotice('已有正在运行的计时器，请先停止后再启动新的。')
      return
    }
    if (!startProjectId) {
      setNotice('请先选择项目')
      return
    }
    setNotice('')
    startMutation.mutate({
      project_id: startProjectId,
      phase_id: startPhaseId || undefined,
    })
  }

  const handleStop = () => {
    if (!runningTimer) return
    setStopTarget(runningTimer)
  }

  const handleCsvExport = async () => {
    try {
      const data = await apiClient.get<TimeEntry[]>('/time-entries')
      const rows: string[][] = [
        [
          '日期', '项目', '阶段', '时长(分钟)', '是否计费',
          '人工成本', '计费金额', '来源', '计时状态',
        ],
      ]
      for (const e of data) {
        rows.push([
          e.work_date,
          e.project_name ?? '',
          e.phase_name ?? '',
          String(e.duration_minutes),
          e.billable ? '是' : '否',
          e.labor_cost,
          e.billable_amount,
          e.source,
          e.timer_status ?? '',
        ])
      }
      downloadCsv(rows)
    } catch (err) {
      const e = err as { message?: string }
      setNotice(e.message || '导出失败')
    }
  }

  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name || id
  const projectOptions = projects ?? []
  const phaseOptions =
    phasesQuery.data?.filter((p) => p.project_id === startProjectId) ?? []

  const liveMinutes = runningTimer ? formatElapsed(runningTimer.timer_started_at) : 0
  void tick

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>我的工时</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleCsvExport}>导出 CSV</button>
          <button className="btn btn-primary" onClick={() => setShowManual(true)}>+ 添加工时</button>
        </div>
      </div>

      {user?.name && (
        <div style={{ marginBottom: 8, color: 'var(--secondary-text)', fontSize: 13 }}>
          当前用户：{user.name}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>计时器</h2>
        {runningTimer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(liveMinutes + (runningTimer.duration_minutes || 0))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--secondary-text)' }}>
              项目：{projectName(runningTimer.project_id)}
              {runningTimer.phase_name ? ` · ${runningTimer.phase_name}` : ''}
              {' · '}
              <span className="badge badge-active">运行中</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {runningTimer.timer_status === 'running' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => pauseMutation.mutate(runningTimer.id)}
                  disabled={pauseMutation.isPending}
                >
                  暂停
                </button>
              )}
              {runningTimer.timer_status === 'paused' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => resumeMutation.mutate(runningTimer.id)}
                  disabled={resumeMutation.isPending}
                >
                  继续
                </button>
              )}
              <button
                className="btn btn-danger"
                onClick={handleStop}
                disabled={stopMutation.isPending}
              >
                停止
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>0:00</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                <label>项目 *</label>
                <select
                  className="form-input"
                  value={startProjectId}
                  onChange={(e) => { setStartProjectId(e.target.value); setStartPhaseId('') }}
                >
                  <option value="">请选择项目</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                <label>阶段</label>
                <select
                  className="form-input"
                  value={startPhaseId}
                  onChange={(e) => setStartPhaseId(e.target.value)}
                  disabled={!startProjectId}
                >
                  <option value="">不指定</option>
                  {phaseOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? '启动中...' : '开始计时'}
              </button>
            </div>
          </div>
        )}
        {notice && (
          <div style={{ marginTop: 12, color: 'var(--error)', fontSize: 13 }}>{notice}</div>
        )}
      </div>

      {isLoading ? (
        <div className="empty-state">加载中...</div>
      ) : entries && entries.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>项目</th>
                <th>时长</th>
                <th>计费</th>
                <th>人工成本</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.work_date).toLocaleDateString()}</td>
                  <td>{e.project_name ?? projectName(e.project_id)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDuration(e.duration_minutes)}</td>
                  <td>
                    {e.billable ? (
                      <span className="badge badge-active">计费</span>
                    ) : (
                      <span className="badge badge-pending">非计费</span>
                    )}
                  </td>
                  <td>{e.labor_cost}</td>
                  <td>{e.source === 'manual' ? '手动' : e.source === 'timer' ? '计时器' : e.source}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => deleteMutation.mutate(e.id)}
                      disabled={deleteMutation.isPending}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty-state">暂无工时记录，点击"+ 添加工时"或启动计时器开始。</div>
      )}

      {showManual && (
        <ManualEntryForm
          projects={projectOptions}
          phases={phaseOptions}
          onClose={() => setShowManual(false)}
          onSaved={() => {
            setShowManual(false)
            invalidateAll()
          }}
        />
      )}

      {stopTarget && (
        <StopTimerForm
          loading={stopMutation.isPending}
          onCancel={() => setStopTarget(null)}
          onSubmit={(body) =>
            stopMutation.mutate({ id: stopTarget.id, body })
          }
        />
      )}
    </div>
  )
}

function ManualEntryForm({
  projects,
  phases,
  onClose,
  onSaved,
}: {
  projects: Project[]
  phases: Phase[]
  onClose: () => void
  onSaved: () => void
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [phaseId, setPhaseId] = useState('')
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [billable, setBillable] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const availablePhases = phases.filter((p) => p.project_id === projectId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!projectId) {
      setError('请选择项目')
      return
    }
    const h = parseInt(hours, 10) || 0
    const m = parseInt(minutes, 10) || 0
    const durationMinutes = h * 60 + m
    if (durationMinutes <= 0) {
      setError('请填写有效的时长')
      return
    }
    setSaving(true)
    try {
      await apiClient.post<TimeEntry>('/time-entries', {
        project_id: projectId,
        phase_id: phaseId || undefined,
        work_date: workDate,
        duration_minutes: durationMinutes,
        billable,
        source: 'manual',
      })
      onSaved()
    } catch (err: unknown) {
      const ex = err as { message?: string }
      setError(ex.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>添加工时</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>项目 *</label>
            <select
              className="form-input"
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setPhaseId('') }}
              required
            >
              <option value="">请选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>阶段</label>
            <select
              className="form-input"
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              disabled={!projectId}
            >
              <option value="">不指定</option>
              {availablePhases.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>工作日期 *</label>
            <input
              type="date"
              className="form-input"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>小时</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>分钟</label>
              <input
                type="number"
                min="0"
                max="59"
                className="form-input"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              可计费
            </label>
          </div>
          {error && (
            <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StopTimerForm({
  loading,
  onCancel,
  onSubmit,
}: {
  loading: boolean
  onCancel: () => void
  onSubmit: (body: {
    activitySummary: string
    activityDetails?: string
    tags?: string
    visibility?: Visibility
  }) => void
}) {
  const [activitySummary, setActivitySummary] = useState('')
  const [activityDetails, setActivityDetails] = useState('')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('internal')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activitySummary.trim()) {
      setError('请填写活动摘要')
      return
    }
    setError('')
    onSubmit({
      activitySummary: activitySummary.trim(),
      activityDetails: activityDetails.trim() || undefined,
      tags: tags.trim() || undefined,
      visibility,
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>停止计时并记录工作</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>活动摘要 *</label>
            <input
              className="form-input"
              value={activitySummary}
              onChange={(e) => setActivitySummary(e.target.value)}
              required
              placeholder="简要描述本次工作内容"
            />
          </div>
          <div className="form-group">
            <label>活动详情</label>
            <textarea
              className="form-input"
              rows={3}
              value={activityDetails}
              onChange={(e) => setActivityDetails(e.target.value)}
              placeholder="补充详细信息"
            />
          </div>
          <div className="form-group">
            <label>标签（逗号分隔）</label>
            <input
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. design,review"
            />
          </div>
          <div className="form-group">
            <label>可见性</label>
            <select
              className="form-input"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
            >
              <option value="private">私有</option>
              <option value="internal">内部</option>
              <option value="client_visible">客户可见</option>
            </select>
          </div>
          {error && (
            <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '提交中...' : '确认停止'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}