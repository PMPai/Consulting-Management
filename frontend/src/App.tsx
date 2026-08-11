import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import TimeTracking from './pages/TimeTracking'
import Expenses from './pages/Expenses'
import ClientROI from './pages/ClientROI'
import Reports from './pages/Reports'
import ApiIntegrations from './pages/ApiIntegrations'
import Settings from './pages/Settings'

const ROLE_LABELS: Record<string, string> = {
  owner: '管理员',
  assistant: '助理',
  consultant: '顾问',
  viewer: '访客',
}

function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  )
}

const ICONS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  time: 'M12 8v4l3 3M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  expenses: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  roi: 'M3 3v18h18M7 14l4-4 3 3 5-6',
  reports: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h2v5H8zM12 10h2v8h-2zM16 15h2v3h-2z',
  api: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
}

const NAV_ITEMS = [
  { path: '/', label: '总览', icon: ICONS.dashboard },
  { path: '/projects', label: '项目', icon: ICONS.projects },
  { path: '/time', label: '我的工时', icon: ICONS.time },
  { path: '/expenses', label: '工具费用', icon: ICONS.expenses },
  { path: '/roi', label: '客户 ROI', icon: ICONS.roi },
  { path: '/reports', label: '报表', icon: ICONS.reports },
  { path: '/api', label: 'API 与集成', icon: ICONS.api },
  { path: '/settings', label: '设置', icon: ICONS.settings },
]

export default function App() {
  const { user, loading, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  if (darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>加载中...</span>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/branding/precisiondata-logo.png" alt="精铭数据" />
          <span className="brand-name">顾问项目 ROI</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon"><Icon path={item.icon} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div style={{ fontWeight: 500, color: 'var(--sidebar-text-active)', marginBottom: 2 }}>{user.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{ROLE_LABELS[user.role] || user.role}</span>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--sidebar-text)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '2px 6px',
                }}
              >
                {darkMode ? '浅色' : '深色'}
              </button>
            </div>
          </div>
        </div>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '▶' : '◀'}
        </button>
      </aside>

      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="page-header">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="mobile-menu-btn btn btn-secondary btn-sm">
            <Icon path="M3 12h18M3 6h18M3 18h18" size={16} />
          </button>
          <div className="page-header-left">
          </div>
          <div className="page-header-actions">
            <button className="btn btn-ghost btn-sm" onClick={logout} title="退出登录">
              <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={14} />
            </button>
          </div>
        </div>
        <div className="page-body">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/time" element={<TimeTracking />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/roi" element={<ClientROI />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/api" element={<ApiIntegrations />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
