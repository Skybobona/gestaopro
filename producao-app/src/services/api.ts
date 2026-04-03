// src/services/api.ts

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export type ApiError = { message: string; code?: string }

export const api = {
  // GET
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    const res = await fetch(`${API_BASE}/${endpoint}${qs}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Erro HTTP ${res.status}`)
    }
    return res.json()
  },

  // POST
  async post<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Erro ao criar ${endpoint}`)
    }
    return res.json()
  },

  // PUT
  async put<T>(endpoint: string, id: string | number, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Erro ao atualizar ${endpoint}`)
    }
    return res.json()
  },

  // PATCH
  async patch<T>(endpoint: string, id: string | number, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Erro ao atualizar ${endpoint}`)
    }
    return res.json()
  },

  // DELETE
  async delete(endpoint: string, id?: string | number): Promise<void> {
    const url = id ? `${API_BASE}/${endpoint}/${id}` : `${API_BASE}/${endpoint}`;
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Erro ao deletar ${endpoint}`)
    }
  },

  // Autenticação
  auth: {
    async signIn(email: string, password: string) {
      const res = await fetch(`${API_BASE}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password })
      })

      if (!res.ok) {
        throw new Error('Usuario ou senha invalidos');
      }

      const data = await res.json();
      localStorage.setItem('auth_user', JSON.stringify(data));
      return data;
    },

    async signOut() {
      localStorage.removeItem('auth_user');
    },

    async getSession() {
      const user = localStorage.getItem('auth_user');
      return user ? { user: JSON.parse(user) } : null;
    }
  }
}

export default api
