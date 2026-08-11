const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

interface ApiResponse<T> {
  data: T
  meta: {
    requestId: string
    page?: number
    pageSize?: number
    total?: number
  }
  error: null
}

interface ApiError {
  data: null
  meta: { requestId: string }
  error: {
    code: string
    message: string
    details: unknown[]
  }
}

export class ApiClientError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const body = await response.json()

  if (!response.ok) {
    const err = body as ApiError
    throw new ApiClientError(
      err.error?.code || 'UNKNOWN',
      err.error?.message || 'Request failed',
      response.status,
    )
  }

  const success = body as ApiResponse<T>
  return success.data
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
