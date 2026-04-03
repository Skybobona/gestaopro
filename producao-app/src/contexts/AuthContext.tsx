// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

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
  // Funções que o Layout.tsx precisa:
  logout: () => void
  isAdmin: boolean
  podeVer: (modulo: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const API_URL = 'http://localhost:3001/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password })
      })

      const data = await res.json()

      if (!res.ok) {
        return { error: { message: data.error || 'Erro ao fazer login' } }
      }

      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))

      return { error: null }
    } catch (err) {
      return { error: { message: 'Erro de conexão com o servidor' } }
    }
  }

  const clearSession = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  const signOut = async () => { clearSession() }
  const logout = () => { clearSession() }

  const signUp = async (email: string, password: string, nome: string) => {
    return { error: { message: 'Funcionalidade desabilitada no modo local.' } }
  }

  // Verifica se o usuário é admin (para mostrar menu de Sistema)
  const isAdmin = user?.perfil === 'admin'

  // Verifica se o usuário tem permissão para ver um módulo específico
  const podeVer = (modulo: string) => {
    if (!user) return false
    // Se for admin, pode ver tudo
    if (user.perfil === 'admin') return true

    // Se não for admin, verifica no JSON de permissões
    try {
      const perms = typeof user.permissoes === 'string' ? JSON.parse(user.permissoes) : user.permissoes
      const modPerms = perms[modulo]
      // Se não houver configuração para o módulo, permite ver (padrão aberto)
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