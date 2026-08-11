import { useState } from 'react'

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function DocsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 3v5h5" />
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ width: 160, fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-1)', minWidth: 0, flex: 1 }}>{value}</div>
    </div>
  )
}

export default function ApiIntegrations() {
  const [copied, setCopied] = useState(false)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
  const docsUrl = apiBaseUrl.replace('/api/v1', '') + '/docs'

  const handleCopy = (): void => {
    navigator.clipboard.writeText(apiBaseUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">API 与集成</span>
        </div>
        <div className="page-header-actions">
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <DocsIcon />
            打开 /docs
          </a>
        </div>
      </div>

      <div className="page-body">
        <div className="section-title">API 访问</div>
        <div className="card">
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 0, marginBottom: 16 }}>
            当前使用用户登录令牌（Bearer Token）进行 API 认证。API 密钥管理功能可通过后端 API 使用。
          </p>
          <InfoRow
            label="API Base URL"
            value={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ fontSize: 13, color: 'var(--text-1)', fontFamily: 'var(--font-mono, monospace)' }}>
                  {apiBaseUrl}
                </code>
                <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  <CopyIcon />
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            }
          />
          <InfoRow
            label="OpenAPI / Swagger"
            value={
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}
              >
                {docsUrl}
              </a>
            }
          />
          <InfoRow
            label="认证方式"
            value={<span className="badge badge-info">Bearer Token</span>}
          />
        </div>
      </div>
    </div>
  )
}
