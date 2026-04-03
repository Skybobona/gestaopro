<#
.SYNOPSIS
    Script de configuração para deploy Vercel + Supabase
    Projeto: GestãoPro - Sistema de Produção (Indústria de Alumínio)
    
.USO
    .\deploy-setup.ps1
#>

Write-Host "🚀 Configurando deploy Vercel + Supabase..." -ForegroundColor Cyan

# =============================
# 1. VERIFICAÇÕES INICIAIS
# =============================
Write-Host "`n🔍 Verificando dependências..." -ForegroundColor Yellow

# Verificar Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js não encontrado. Instale em: https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $(node -v)" -ForegroundColor Green

# Verificar npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm não encontrado." -ForegroundColor Red
    exit 1
}

# Instalar Vercel CLI se necessário
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}
Write-Host "✅ Vercel CLI instalado" -ForegroundColor Green

# Instalar Supabase CLI se necessário
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
}
Write-Host "✅ Supabase CLI instalado" -ForegroundColor Green

# =============================
# 2. GERAR .ENV.EXAMPLE
# =============================
Write-Host "`n🔐 Gerando .env.example..." -ForegroundColor Yellow

$envExample = @"
# =============================
# VARIÁVEIS PÚBLICAS (Frontend)
# =============================
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=/api

# =============================
# VARIÁVEIS PRIVADAS (Backend)
# =============================
# Para produção (Vercel + Supabase):
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Para desenvolvimento local (SQLite):
DATABASE_URL=file:./backend/producao.db

# =============================
# CONFIGURAÇÕES GERAIS
# =============================
NODE_ENV=production
VITE_APP_NAME=GestãoPro
VITE_APP_VERSION=1.0.0

# =============================
# OPICIONAL: Pool de Conexão (Recomendado para Vercel)
# =============================
# Use a URL com pooler para serverless functions:
# POSTGRES_URL=postgres://usuario:senha@aws-0.sa-east-1.pooler.supabase.com:6543/producao
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
"@

$envExample | Out-File -FilePath ".\producao-app\.env.example" -Encoding utf8
Write-Host "✅ .env.example gerado em ./producao-app/" -ForegroundColor Green

# =============================
# 3. ADAPTAR BACKEND PARA SUPABASE
# =============================
Write-Host "`n🔄 Adaptando backend para Supabase..." -ForegroundColor Yellow

# Criar arquivo de configuração do Supabase
$supabaseConfig = @"
// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Cliente para operações do frontend (com RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente para operações do backend (sem RLS - use com cuidado!)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Helper para verificar ambiente
export const isProduction = process.env.NODE_ENV === 'production'
export const isUsingSupabase = !!supabaseUrl
"@

$supabaseConfig | Out-File -FilePath ".\producao-app\backend\src\config\supabase.ts" -Encoding utf8
Write-Host "✅ Configuração Supabase criada" -ForegroundColor Green

# =============================
# 4. ATUALIZAR API SERVICE
# =============================
Write-Host "`n🔄 Atualizando services/api.ts..." -ForegroundColor Yellow

# Backup do arquivo original
$apiPath = ".\producao-app\src\services\api.ts"
if (Test-Path $apiPath) {
    Copy-Item $apiPath "$apiPath.bak" -Force
    Write-Host "📦 Backup criado: api.ts.bak" -ForegroundColor Gray
}

# Novo conteúdo para api.ts (adaptável para Supabase)
$apiService = @"
// src/services/api.ts
import { supabase } from '../../backend/src/config/supabase'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Função genérica para requisições
export const api = {
  // GET
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    if (import.meta.env.PROD && import.meta.env.VITE_USE_SUPABASE === 'true') {
      const { data, error } = await supabase
        .from(endpoint)
        .select('*')
        .match(params || {})
      if (error) throw error
      return data as T
    }
    
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const res = await fetch(\`\${API_URL}/\${endpoint}\${qs}\`)
    if (!res.ok) throw new Error(\`Erro ao buscar \${endpoint}\`)
    return res.json()
  },

  // POST
  async post<T>(endpoint: string, data: any): Promise<T> {
    if (import.meta.env.PROD && import.meta.env.VITE_USE_SUPABASE === 'true') {
      const { data: result, error } = await supabase
        .from(endpoint)
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return result as T
    }
    
    const res = await fetch(\`\${API_URL}/\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(\`Erro ao criar em \${endpoint}\`)
    return res.json()
  },

  // PUT/PATCH
  async put<T>(endpoint: string, id: string | number, data: any): Promise<T> {
    if (import.meta.env.PROD && import.meta.env.VITE_USE_SUPABASE === 'true') {
      const { data: result, error } = await supabase
        .from(endpoint)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return result as T
    }
    
    const res = await fetch(\`\${API_URL}/\${endpoint}/\${id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(\`Erro ao atualizar \${endpoint}/\${id}\`)
    return res.json()
  },

  // DELETE
  async delete(endpoint: string, id: string | number): Promise<void> {
    if (import.meta.env.PROD && import.meta.env.VITE_USE_SUPABASE === 'true') {
      const { error } = await supabase
        .from(endpoint)
        .delete()
        .eq('id', id)
      if (error) throw error
      return
    }
    
    const res = await fetch(\`\${API_URL}/\${endpoint}/\${id}\`, { method: 'DELETE' })
    if (!res.ok) throw new Error(\`Erro ao deletar \${endpoint}/\${id}\`)
  }
}

export default api
"@

$apiService | Out-File -FilePath $apiPath -Encoding utf8
Write-Host "✅ services/api.ts atualizado para suportar Supabase" -ForegroundColor Green

# =============================
# 5. CONFIGURAR VERCEL.JSON
# =============================
Write-Host "`n⚙️ Configurando vercel.json..." -ForegroundColor Yellow

$vercelConfig = @"
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/(.*)", "destination": "/" }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "VITE_API_URL": "/api"
    }
  }
}
"@

$vercelConfig | Out-File -FilePath ".\producao-app\vercel.json" -Encoding utf8
Write-Host "✅ vercel.json configurado" -ForegroundColor Green

# =============================
# 6. GERAR SCHEMA SUPABASE
# =============================
Write-Host "`n🗄️ Gerando schema para Supabase..." -ForegroundColor Yellow

$supabaseSchema = @"
-- Schema para Supabase - GestãoPro (Indústria de Alumínio)
-- Execute no SQL Editor do Supabase ou via CLI

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  contato TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: ordens_producao
CREATE TABLE IF NOT EXISTS ordens_producao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  liga TEXT NOT NULL,
  dimensao TEXT,
  peso_previsto NUMERIC,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: lancamentos_producao (apontamentos)
CREATE TABLE IF NOT EXISTS lancamentos_producao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ordem_id UUID REFERENCES ordens_producao(id),
  operacao TEXT NOT NULL, -- 'fundicao', 'laminacao', 'corte', etc.
  maquina TEXT,
  operador_id UUID REFERENCES usuarios(id),
  peso_real NUMERIC,
  temperatura NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: perdas
CREATE TABLE IF NOT EXISTS perdas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lancamento_id UUID REFERENCES lancamentos_producao(id),
  tipo TEXT NOT NULL, -- 'oxidação', 'refugo', 'quebra', etc.
  peso NUMERIC NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: auditoria (logs)
CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  tabela TEXT,
  registro_id UUID,
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_ordem ON lancamentos_producao(ordem_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_operacao ON lancamentos_producao(operacao);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);

-- Row Level Security (RLS) - Exemplo básico
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_producao ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ler dados (ajuste conforme necessidade)
CREATE POLICY "Usuarios podem ler dados" ON usuarios
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios podem ler producao" ON lancamentos_producao
  FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
\$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Dados iniciais (opcional)
INSERT INTO usuarios (email, nome, cargo) VALUES 
  ('admin@gestaopro.com.br', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;
"@

$supabaseSchema | Out-File -FilePath ".\supabase\schema_prod.sql" -Encoding utf8
Write-Host "✅ Schema Supabase gerado em ./supabase/schema_prod.sql" -ForegroundColor Green

# =============================
# 7. GERAR CHECKLIST DE DEPLOY
# =============================
Write-Host "`n📋 Gerando CHECKLIST_DEPLOY.md..." -ForegroundColor Yellow

$checklist = @"
# ✅ Checklist de Deploy - Vercel + Supabase

## 🔐 1. Configurar Supabase
- [ ] Criar projeto em https://supabase.com
- [ ] Anotar: **Project URL** e **anon/public key**
- [ ] Anotar: **service_role key** (use apenas no backend!)
- [ ] Executar script \`./supabase/schema_prod.sql\` no SQL Editor do Supabase
- [ ] Configurar Auth (se usar login): habilitar Email/Password

## 🔐 2. Configurar Variáveis na Vercel
No dashboard da Vercel → Project Settings → Environment Variables:

### Públicas (NEXT_PUBLIC_*)
- [ ] \`NEXT_PUBLIC_SUPABASE_URL\` = https://xxx.supabase.co
- [ ] \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` = eyJhbG...

### Privadas (NÃO exponha no frontend!)
- [ ] \`SUPABASE_SERVICE_ROLE_KEY\` = eyJhbG... (apenas backend)
- [ ] \`SUPABASE_JWT_SECRET\` = (opcional, para validação customizada)

### Produção
- [ ] \`NODE_ENV\` = production

## 🚀 3. Deploy na Vercel
1. Conectar repositório GitHub na Vercel
2. Configurar:
   - Framework Preset: **Vite**
   - Build Command: \`npm run build\`
   - Output Directory: \`dist\`
3. Adicionar variáveis de ambiente (acima)
4. Clicar em **Deploy**

## 🔄 4. Migração de Dados (SQLite → Supabase)
Se tiver dados locais no \`backend/producao.db\`:

\`\`\`bash
# Instalar sqlite3 e pgloader (ou usar script manual)
# Exemplo manual: exportar para CSV e importar no Supabase

# Ou usar o script de migração (em desenvolvimento):
node ./scripts/migrate-sqlite-to-supabase.js
\`\`\`

## 🧪 5. Testes Pós-Deploy
- [ ] Acessar URL da Vercel
- [ ] Testar login (se aplicável)
- [ ] Verificar se dados estão sendo salvos no Supabase
- [ ] Testar em dispositivo móvel
- [ ] Verificar logs em: Vercel → Logs / Supabase → Logs

## 🔧 6. Opcional: Domínio Customizado
- [ ] Configurar domínio em Vercel → Settings → Domains
- [ ] Atualizar DNS no provedor do domínio
- [ ] Configurar redirect URLs no Supabase Auth

---
> 💡 **Dica**: Use a integração oficial [Supabase + Vercel](https://vercel.com/marketplace/supabase) para sincronizar variáveis automaticamente! [[13]]
"@

$checklist | Out-File -FilePath ".\CHECKLIST_DEPLOY.md" -Encoding utf8
Write-Host "✅ Checklist gerado: CHECKLIST_DEPLOY.md" -ForegroundColor Green

# =============================
# 8. FINALIZAÇÃO
# =============================
Write-Host "`n" -NoNewline
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n📁 Arquivos criados/atualizados:" -ForegroundColor Yellow
Write-Host "   • producao-app/.env.example"
Write-Host "   • producao-app/backend/src/config/supabase.ts"
Write-Host "   • producao-app/src/services/api.ts (atualizado)"
Write-Host "   • producao-app/vercel.json (atualizado)"
Write-Host "   • supabase/schema_prod.sql"
Write-Host "   • CHECKLIST_DEPLOY.md"
Write-Host "`n🚀 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Revise o arquivo .env.example e preencha com seus dados"
Write-Host "   2. Renomeie para .env.local (apenas para teste local)"
Write-Host "   3. Siga o CHECKLIST_DEPLOY.md para configurar Supabase e Vercel"
Write-Host "   4. Execute: cd producao-app && vercel --prod"
Write-Host "`n⚠️  LEMBRE-SE: Nunca commit .env.local no Git!" -ForegroundColor Red
Write-Host "`n"