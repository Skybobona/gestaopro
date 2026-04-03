-- Schema para Supabase - GestãoPro (Indústria de Alumínio)
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
