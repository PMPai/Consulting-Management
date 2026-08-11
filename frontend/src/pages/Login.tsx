import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login, setup } = useAuth()
  const [mode, setMode] = useState<'login' | 'setup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await setup({ org_name: orgName, email, name, password })
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '认证失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-app)',
    }}>
      {/* Left panel — brand */}
      <div style={{
        flex: '0 0 360px',
        background: 'var(--sidebar-bg)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '40px 32px',
      }}>
        <div>
          <img src="/branding/precisiondata-logo.png" alt="精铭数据" style={{ height: 40, marginBottom: 32 }} />
          <h1 style={{
            fontSize: 20, fontWeight: 600, color: '#F4F5F7',
            letterSpacing: '-0.02em', marginBottom: 8,
          }}>
            顾问项目 ROI 管理台
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
            精铭数据 — 咨询项目管理和客户 ROI 分析平台
          </p>
        </div>
        <div style={{ fontSize: 11, color: '#3A3E47' }}>
          PrecisionData © 2026
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ width: 360, maxWidth: '100%' }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setMode('login')}
              style={{
                padding: '8px 16px', border: 'none', background: 'transparent',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                color: mode === 'login' ? 'var(--text-1)' : 'var(--text-3)',
                borderBottom: mode === 'login' ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              登录
            </button>
            <button
              onClick={() => setMode('setup')}
              style={{
                padding: '8px 16px', border: 'none', background: 'transparent',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                color: mode === 'setup' ? 'var(--text-1)' : 'var(--text-3)',
                borderBottom: mode === 'setup' ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              初始化系统
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'setup' && (
              <>
                <div className="form-group">
                  <label>组织名称</label>
                  <input className="form-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>您的姓名</label>
                  <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </>
            )}
            <div className="form-group">
              <label>邮箱</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>密码</label>
              <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && (
              <div style={{
                color: 'var(--error)', fontSize: 12, marginBottom: 12,
                padding: '6px 10px', background: 'var(--error-bg)',
                borderRadius: 'var(--radius-sm)',
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: 36 }}
            >
              {loading ? '请稍候...' : mode === 'login' ? '登录' : '创建账户'}
            </button>
          </form>

          {mode === 'login' && (
            <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 16, textAlign: 'center' }}>
              演示账户：admin@demo.com / demo1234
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
