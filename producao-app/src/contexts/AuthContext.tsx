// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { loginSimples, getSession, logout as logoutSupabase } from '../services/supabase'

type LocalUser = {
  id: number
  nome: string
  email: string
  perfil: string
  permissoes: Record<string, string[]>
}

type AuthContextType = {
  user: LocalUser | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>
  logout: () => void
  isAdmin: boolean
  podeVer: (modulo: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sessão salva
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        setToken(session.token)
        setUser(session.user as LocalUser)
      }
      setLoading(false)
    }
    checkSession()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const session = await loginSimples(email, password)
      
      setToken(session.token)
      setUser(session.user as LocalUser)
      
      return { error: null }
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao fazer login' } }
    }
  }

  const clearSession = () => {
    setToken(null)
    setUser(null)
    logoutSupabase()
  }

  const signOut = async () => { clearSession() }
  const logout = () => { clearSession() }

  const signUp = async (email: string, password: string, nome: string) => {
    return { error: { message: 'Funcionalidade desabilitada no modo de demonstração.' } }
  }

  // Verifica se o usuário é admin
  const isAdmin = user?.perfil === 'admin'

  // Verifica permissões
  const podeVer = (modulo: string) => {
    if (!user) return false
    if (user.perfil === 'admin') return true

    try {
      const perms = typeof user.permissoes === 'string' ? JSON.parse(user.permissoes) : user.permissoes
      const modPerms = perms[modulo]
      return modPerms === undefined || modPerms.includes('ver')
    } catch {
      return true
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, signUp, logout, isAdmin, podeVer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
