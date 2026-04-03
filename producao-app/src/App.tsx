// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'

// Páginas principais
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Chapas from './pages/Chapas'
import Estufas from './pages/Estufas'
import Ordens from './pages/Ordens'
import Lancamentos from './pages/Lancamentos'
import Eficiencia from './pages/Eficiencia'
import Perdas from './pages/Perdas'
import Usuarios from './pages/Usuarios'
import Relatorios from './pages/Relatorios'
import Auditoria from './pages/Auditoria'
import Fundicao from './pages/Fundicao'
import Laminacao from './pages/Laminacao'
import Manutencao from './pages/Manutencao'

// Páginas de operações
import Desbaste from './pages/ops/Desbaste'
import LaminacaoOp from './pages/ops/LaminacaoOp'
import Corte from './pages/ops/Corte'
import Expedicao from './pages/ops/Expedicao'

// ✅ Componente para proteger rotas (sem Routes aninhado)
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="p-8">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />

  return children
}

// ✅ Todas as rotas em um único <Routes>
function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública: Login */}
      <Route
        path="/login"
        element={
          <Login />
        }
      />

      {/* Rotas protegidas: Todas usam o mesmo Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="chapas" element={<Chapas />} />
        <Route path="estufas" element={<Estufas />} />
        <Route path="ordens" element={<Ordens />} />
        <Route path="lancamentos" element={<Lancamentos />} />
        <Route path="eficiencia" element={<Eficiencia />} />
        <Route path="perdas" element={<Perdas />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="fundicao" element={<Fundicao />} />
        <Route path="laminacao" element={<Laminacao />} />
        <Route path="manutencao" element={<Manutencao />} />

        {/* Operações */}
        <Route path="desbaste" element={<Desbaste />} />
        <Route path="laminacao-op" element={<LaminacaoOp />} />
        <Route path="corte" element={<Corte />} />
        <Route path="expedicao" element={<Expedicao />} />
      </Route>

      {/* Rota curinga: redireciona para dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}