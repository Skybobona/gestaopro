// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rkevumamwghkqkajrnkj.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1H-WA09VVILYF2Knf1LJiw_UQ7J9Y-i'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper para login com senha em texto (temporário para teste)
// Em produção, use Auth do Supabase ou hash no banco
export async function loginSimples(email: string, senha: string) {
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error || !usuarios) {
    throw new Error('Usuário não encontrado')
  }
  
  // Verificação simples (em produção use bcrypt)
  if (usuarios.senha_hash !== senha) {
    throw new Error('Senha incorreta')
  }
  
  // Criar sessão manual
  const session = {
    user: {
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      perfil: usuarios.perfil,
    },
    token: btoa(JSON.stringify({ id: usuarios.id, email: usuarios.email, exp: Date.now() + 86400000 }))
  }
  
  localStorage.setItem('token', session.token)
  localStorage.setItem('auth_user', JSON.stringify(session.user))
  
  return session
}

export async function getSession() {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('auth_user')
  
  if (!token || !user) return null
  
  try {
    const payload = JSON.parse(atob(token))
    if (payload.exp < Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('auth_user')
      return null
    }
    return { user: JSON.parse(user), token }
  } catch {
    return null
  }
}

export async function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('auth_user')
}

export default supabase
