// src/services/api.ts
// API que usa Edge Functions da Vercel

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export type ApiError = { message: string; code?: string };

// Helper para headers
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const api = {
  // GET
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const res = await fetch(`${API_BASE}/${endpoint}${qs}`, {
      headers: getHeaders(),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro HTTP ${res.status}`);
    }
    return res.json();
  },

  // POST
  async post<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao criar ${endpoint}`);
    }
    return res.json();
  },

  // PUT
  async put<T>(endpoint: string, id: string | number, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao atualizar ${endpoint}`);
    }
    return res.json();
  },

  // DELETE
  async delete(endpoint: string, id?: string | number): Promise<void> {
    const url = id ? `${API_BASE}/${endpoint}/${id}` : `${API_BASE}/${endpoint}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao deletar ${endpoint}`);
    }
  },

  // Autenticação
  auth: {
    async signIn(email: string, password: string) {
      const res = await fetch(`${API_BASE}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Usuário ou senha inválidos');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      return data;
    },

    async signOut() {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
    },

    async getSession() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('auth_user');
      return token && user ? { user: JSON.parse(user), token } : null;
    },
  },
};

export default api;
