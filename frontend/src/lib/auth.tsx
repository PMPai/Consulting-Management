import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from './api'

interface User {
  id: string
  email: string
  name: string
  role: string
  organization_id: string
  timezone: string
  status: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setup: (data: { org_name: string; email: string; name: string; password: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      apiClient.get<{ id: string; email: string; name: string; role: string; organization_id: string; timezone: string; status: string }>('/auth/me')
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiClient.post<{ user: User; tokens: { access_token: string; refresh_token: string } }>('/auth/login', { email, password })
    localStorage.setItem('token', res.tokens.access_token)
    localStorage.setItem('refresh_token', res.tokens.refresh_token)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const setup = async (data: { org_name: string; email: string; name: string; password: string }) => {
    const res = await apiClient.post<{ user: User; tokens: { access_token: string; refresh_token: string } }>('/auth/setup', data)
    localStorage.setItem('token', res.tokens.access_token)
    localStorage.setItem('refresh_token', res.tokens.refresh_token)
    setUser(res.user)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
