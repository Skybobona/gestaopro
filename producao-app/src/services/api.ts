// src/services/api.ts
// API usando Supabase diretamente (sem backend)

import { supabase } from './supabase'

export type ApiError = { message: string; code?: string }

// Helper para headers com auth
const getAuth = () => {
  const token = localStorage.getItem('token')
  return token
}

export const api = {
  // GET
  async get<T>(table: string, params?: Record<string, any>): Promise<T[]> {
    let query = supabase.from(table).select('*')
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }
    
    const { data, error } = await query
    
    if (error) throw new Error(error.message)
    return data || []
  },

  // POST
  async post<T>(table: string, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return result
  },

  // PUT
  async put<T>(table: string, id: string | number, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return result
  },

  // DELETE
  async delete(table: string, id: string | number): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(error.message)
  },

  // Autenticação
  auth: {
    async signIn(email: string, password: string) {
      const { loginSimples } = await import('./supabase')
      return loginSimples(email, password)
    },

    async signOut() {
      const { logout } = await import('./supabase')
      return logout()
    },

    async getSession() {
      const { getSession } = await import('./supabase')
      return getSession()
    }
  }
}

export default api
