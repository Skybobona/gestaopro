// setup-deploy.js
// Script para configurar deploy Vercel + Supabase
// Execute com: node setup-deploy.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.join(__dirname, 'producao-app');
const SUPABASE_DIR = path.join(__dirname, 'supabase');

console.log('🚀 Configurando deploy Vercel + Supabase...\n');

// =============================
// 1. Verificações
// =============================
console.log('🔍 Verificando dependências...');

try {
    execSync('node --version', { stdio: 'ignore' });
    console.log('✅ Node.js:', execSync('node --version').toString().trim());
} catch {
    console.error('❌ Node.js não encontrado. Instale em: https://nodejs.org/');
    process.exit(1);
}

try {
    execSync('npm --version', { stdio: 'ignore' });
} catch {
    console.error('❌ npm não encontrado.');
    process.exit(1);
}

// Instalar Vercel CLI globalmente se necessário
try {
    execSync('vercel --version', { stdio: 'ignore' });
    console.log('✅ Vercel CLI já instalado');
} catch {
    console.log('📦 Instalando Vercel CLI...');
    execSync('npm install -g vercel', { stdio: 'inherit' });
}

// =============================
// 2. Criar .env.example
// =============================
console.log('\n🔐 Gerando .env.example...');

const envExample = `# =============================
# VARIÁVEIS PÚBLICAS (Frontend - Vite)
# =============================
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=/api

# =============================
# VARIÁVEIS PRIVADAS (Backend - Vercel Functions)
# =============================
# Chave de serviço do Supabase (use apenas no backend!)
SUPABASE_SERVICE_ROLE_KEY=

# URL do PostgreSQL para conexões diretas (opcional)
POSTGRES_URL=

# =============================
# CONFIGURAÇÕES GERAIS
# =============================
NODE_ENV=production
`;

fs.writeFileSync(path.join(PROJECT_DIR, '.env.example'), envExample, 'utf8');
console.log('✅ .env.example criado em producao-app/');

// =============================
// 3. Criar config do Supabase
// =============================
console.log('\n🔄 Criando configuração do Supabase...');

const supabaseConfigDir = path.join(PROJECT_DIR, 'backend', 'src', 'config');
if (!fs.existsSync(supabaseConfigDir)) {
    fs.mkdirSync(supabaseConfigDir, { recursive: true });
}

const supabaseConfig = `// backend/src/config/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Tipos para o banco de dados (gerar com: npx supabase gen types typescript)
export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: { id: string; email: string; nome: string; cargo: string | null; ativo: boolean; created_at: string }
        Insert: { email: string; nome: string; cargo?: string | null; ativo?: boolean }
        Update: { email?: string; nome?: string; cargo?: string | null; ativo?: boolean }
      }
      // Adicione outras tabelas conforme necessário
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Cliente para frontend (com RLS - Row Level Security)
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Cliente para backend (sem RLS - use com cuidado!)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// Helper para ambiente
export const isProd = process.env.NODE_ENV === 'production'
export const hasSupabase = !!supabaseUrl
`;

fs.writeFileSync(path.join(supabaseConfigDir, 'supabase.ts'), supabaseConfig, 'utf8');
console.log('✅ backend/src/config/supabase.ts criado');

// =============================
// 4. Atualizar services/api.ts
// =============================
console.log('\n🔄 Atualizando services/api.ts...');

const apiServicePath = path.join(PROJECT_DIR, 'src', 'services', 'api.ts');

// Fazer backup se existir
if (fs.existsSync(apiServicePath)) {
    fs.copyFileSync(apiServicePath, apiServicePath + '.bak');
    console.log('📦 Backup criado: api.ts.bak');
}

const apiService = `// src/services/api.ts
import { supabase } from '../../backend/src/config/supabase'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Tipagem básica para respostas
export type ApiError = { message: string; code?: string }

// Cliente API unificado (Supabase em produção, REST em dev)
export const api = {
  // GET com filtros
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    // Em produção com Supabase configurado
    if (import.meta.env.PROD && import.meta.env.VITE_SUPABASE_URL) {
      let query = supabase.from(endpoint).select('*')
      
      // Aplicar filtros se houver
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }
      
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data as T
    }
    
    // Fallback para API REST local
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const res = await fetch(\`\${API_BASE}/\${endpoint}\${qs}\`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || \`Erro HTTP \${res.status}\`)
    }
    return res.json()
  },

  // POST - criar novo registro
  async post<T>(endpoint: string, data: any): Promise<T> {
    if (import.meta.env.PROD && import.meta.env.VITE_SUPABASE_URL) {
      const { data: result, error } = await supabase
        .from(endpoint)
        .insert(data)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return result as T
    }
    
    const res = await fetch(\`\${API_BASE}/\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || \`Erro ao criar \${endpoint}\`)
    }
    return res.json()
  },

  // PUT - atualizar registro
  async put<T>(endpoint: string, id: string | number, data: any): Promise<T> {
    if (import.meta.env.PROD && import.meta.env.VITE_SUPABASE_URL) {
      const { data: result, error } = await supabase
        .from(endpoint)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return result as T
    }
    
    const res = await fetch(\`\${API_BASE}/\${endpoint}/\${id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || \`Erro ao atualizar \${endpoint}\`)
    }
    return res.json()
  },

  // DELETE - remover registro
  async delete(endpoint: string, id: string | number): Promise<void> {
    if (import.meta.env.PROD && import.meta.env.VITE_SUPABASE_URL) {
      const { error } = await supabase
        .from(endpoint)
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
      return
    }
    
    const res = await fetch(\`\${API_BASE}/\${endpoint}/\${id}\`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || \`Erro ao deletar \${endpoint}\`)
    }
  },

  // Autenticação com Supabase Auth
  auth: {
    async signIn(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },
    async signUp(email: string, password: string, nome: string) {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { nome } }
      })
      if (error) throw error
      return data
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    async getSession() {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    }
  }
}

export default api
`;

// Garantir que o diretório existe
const apiDir = path.dirname(apiServicePath);
if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
}

fs.writeFileSync(apiServicePath, apiService, 'utf8');
console.log('✅ src/services/api.ts atualizado');

// =============================
// 5. Atualizar vercel.json
// =============================
console.log('\n⚙️ Configurando vercel.json...');

const vercelConfig = {
    version: 2,
    buildCommand: "npm run build",
    outputDirectory: "dist",
    framework: "vite",
    rewrites: [
        { source: "/api/(.*)", destination: "/api" },
        { source: "/(.*)", destination: "/" }
    ],
    env: {
        NODE_ENV: "production"
    },
    build: {
        env: {
            VITE_API_URL: "/api"
        }
    }
};

fs.writeFileSync(
    path.join(PROJECT_DIR, 'vercel.json'),
    JSON.stringify(vercelConfig, null, 2),
    'utf8'
);
console.log('✅ vercel.json configurado');

// =============================
// 6. Gerar schema SQL para Supabase
// =============================
console.log('\n🗄️ Gerando schema para Supabase...');

if (!fs.existsSync(SUPABASE_DIR)) {
    fs.mkdirSync(SUPABASE_DIR, { recursive: true });
}

const supabaseSchema = `-- Schema para Supabase - GestãoPro (Indústria de Alumínio)
-- Execute no SQL Editor: https://app.supabase.com/project/_/sql

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Usuários do sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  contato TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ordens de Produção
CREATE TABLE IF NOT EXISTS ordens_producao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  liga TEXT NOT NULL,
  dimensao TEXT,
  peso_previsto NUMERIC(10,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apontamentos de Produção (Lançamentos)
CREATE TABLE IF NOT EXISTS lancamentos_producao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ordem_id UUID REFERENCES ordens_producao(id) ON DELETE CASCADE,
  operacao TEXT NOT NULL, -- 'fundicao', 'laminacao', 'corte', 'desbaste', 'expedicao'
  maquina TEXT,
  operador_id UUID REFERENCES usuarios(id),
  peso_real NUMERIC(10,2),
  temperatura NUMERIC(5,1),
  tempo_execucao_min INTEGER,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de Perdas
CREATE TABLE IF NOT EXISTS perdas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lancamento_id UUID REFERENCES lancamentos_producao(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('oxidacao', 'refugo', 'quebra', 'ajuste', 'outro')),
  peso NUMERIC(10,2) NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auditoria / Logs
CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  tabela_afetada TEXT,
  registro_id UUID,
  detalhes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_lancamentos_ordem ON lancamentos_producao(ordem_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_operacao ON lancamentos_producao(operacao);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos_producao(created_at);
CREATE INDEX IF NOT EXISTS idx_perdas_lancamento ON perdas(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Habilitar RLS nas tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE perdas ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ler dados (ajuste conforme sua regra de negócio)
CREATE POLICY "Usuarios autenticados podem ler" ON usuarios
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados podem ler producao" ON lancamentos_producao
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados podem inserir producao" ON lancamentos_producao
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para auditoria: apenas leitura, sem inserção manual
CREATE POLICY "Auditoria apenas leitura" ON auditoria
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS E FUNÇÕES
-- ============================================
-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para tabela usuarios
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registrar ações na auditoria (exemplo)
CREATE OR REPLACE FUNCTION log_auditoria_producao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auditoria (usuario_id, acao, tabela_afetada, registro_id, detalhes)
  VALUES (
    auth.uid(), -- ID do usuário autenticado
    TG_OP, -- 'INSERT', 'UPDATE', 'DELETE'
    TG_TABLE_NAME,
    NEW.id,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Comentado: Ative se quiser auditoria automática
-- CREATE TRIGGER trigger_auditoria_lancamentos
--   AFTER INSERT OR UPDATE ON lancamentos_producao
--   FOR EACH ROW
--   EXECUTE FUNCTION log_auditoria_producao();

-- ============================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================
INSERT INTO usuarios (email, nome, cargo) VALUES 
  ('admin@gestaopro.com.br', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;
`;

fs.writeFileSync(
    path.join(SUPABASE_DIR, 'schema_prod.sql'),
    supabaseSchema,
    'utf8'
);
console.log('✅ supabase/schema_prod.sql gerado');

// =============================
// 7. Gerar checklist
// =============================
console.log('\n📋 Gerando CHECKLIST_DEPLOY.md...');

const checklist = `# ✅ Checklist de Deploy - Vercel + Supabase

## 🔐 1. Configurar Supabase
- [ ] Criar projeto em https://supabase.com
- [ ] Copiar **Project URL** (ex: \`https://xyz.supabase.co\`)
- [ ] Copiar **anon/public key** (Settings → API → Project API keys)
- [ ] Copiar **service_role key** (use APENAS no backend!)
- [ ] Executar \`supabase/schema_prod.sql\` no SQL Editor do Supabase
- [ ] (Opcional) Configurar Auth: Settings → Authentication → Providers → Email

## 🔐 2. Configurar Variáveis na Vercel
Acesse: Dashboard do Projeto → Settings → Environment Variables

### Variáveis Públicas (disponíveis no frontend)
| Variável | Valor Exemplo | Escopo |
|----------|--------------|--------|
| \`VITE_SUPABASE_URL\` | \`https://xyz.supabase.co\` | Production + Preview |
| \`VITE_SUPABASE_ANON_KEY\` | \`eyJhbG...\` | Production + Preview |
| \`VITE_API_URL\` | \`/api\` | Production + Preview |

### Variáveis Privadas (apenas backend - NÃO exponha!)
| Variável | Valor Exemplo | Escopo |
|----------|--------------|--------|
| \`SUPABASE_SERVICE_ROLE_KEY\` | \`eyJhbG...\` | **Apenas Production** 🔒 |

### Produção
| Variável | Valor |
|----------|-------|
| \`NODE_ENV\` | \`production\` |

## 🚀 3. Deploy na Vercel
1. Conectar repositório GitHub/GitLab na Vercel
2. Configurar projeto:
   - **Framework Preset**: Vite
   - **Build Command**: \`npm run build\`
   - **Output Directory**: \`dist\`
3. Adicionar variáveis de ambiente (acima)
4. Clicar em **Deploy** 🎉

## 🔄 4. Migração de Dados (SQLite → Supabase)
Se tiver dados locais em \`backend/producao.db\`:

### Opção A: Manual (CSV)
\`\`\`bash
# Exportar do SQLite
sqlite3 backend/producao.db ".mode csv" ".output lancamentos.csv" "SELECT * FROM lancamentos_producao;"

# Importar no Supabase: Dashboard → Table Editor → ⋮ → Import data
\`\`\`

### Opção B: Script Node.js (em desenvolvimento)
\`\`\`bash
# Criar script de migração (posso ajudar a criar!)
node scripts/migrate-sqlite-to-supabase.js
\`\`\`

## 🧪 5. Testes Pós-Deploy
- [ ] Acessar URL da Vercel (ex: https://seu-projeto.vercel.app)
- [ ] Testar login (se usar Supabase Auth)
- [ ] Criar um lançamento de produção e verificar no Supabase Dashboard
- [ ] Testar em dispositivo móvel
- [ ] Verificar logs: Vercel → Logs / Supabase → Logs

## 🔧 6. Opcional: Domínio Customizado
- [ ] Vercel → Settings → Domains → Add Domain
- [ ] Configurar DNS no seu provedor (Cloudflare, Registro.br, etc.)
- [ ] Supabase → Authentication → URL Configuration → Atualizar Site URL

---
> 💡 **Dica Pro**: Use a integração oficial [Supabase + Vercel](https://vercel.com/marketplace/supabase) para sincronizar variáveis automaticamente e criar branches de preview com bancos isolados!

> ⚠️ **Segurança**: Nunca commit arquivos \`.env*\` no Git! Eles já estão no \`.gitignore\`.
`;

fs.writeFileSync('CHECKLIST_DEPLOY.md', checklist, 'utf8');
console.log('✅ CHECKLIST_DEPLOY.md gerado na raiz');

// =============================
// 8. Finalização
// =============================
console.log('\n' + '═'.repeat(50));
console.log('🎉 CONFIGURAÇÃO CONCLUÍDA!');
console.log('═'.repeat(50));
console.log(`
📁 Arquivos criados/atualizados:
   • producao-app/.env.example
   • producao-app/backend/src/config/supabase.ts
   • producao-app/src/services/api.ts (atualizado)
   • producao-app/vercel.json (atualizado)
   • supabase/schema_prod.sql
   • CHECKLIST_DEPLOY.md

🚀 Próximos passos:
   1. Revise producao-app/.env.example e preencha com seus dados do Supabase
   2. Para teste local: renomeie para .env.local
   3. Siga CHECKLIST_DEPLOY.md para configurar Supabase e Vercel
   4. Deploy: cd producao-app && vercel --prod

⚠️  IMPORTANTE: Nunca commit .env.local no Git!
`);