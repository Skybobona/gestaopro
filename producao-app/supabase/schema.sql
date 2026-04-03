-- ============================================================
-- GestãoPro · Schema Supabase (AJUSTADO para bater com o Backend Local)
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABELAS
-- ============================================================

create table if not exists usuarios (
  id            bigserial primary key,
  nome          text      not null,
  email         text      unique not null,
  senha         text      not null, -- Ajustado de 'senha_hash' para 'senha'
  perfil        text      not null default 'operador',
  permissoes    jsonb     not null default '{}',
  ativo         integer   not null default 1, -- Ajustado para INTEGER (boolean do SQLite vira 0/1)
  criado_em     timestamptz not null default now()
);

create table if not exists clientes (
  id            bigserial primary key,
  nome          text      not null,
  codigo        text      unique not null, -- Adicionado para bater com o local
  cnpj          text,
  telefone      text,
  email         text,
  endereco      text,
  ativo         integer   not null default 1,
  criado_em     timestamptz not null default now()
);

create table if not exists chapas (
  id            bigserial primary key,
  codigo        text      unique not null,
  liga          text      not null,
  espessura     numeric(10,3) not null, -- Ajustado de espessura_mm
  largura       numeric(10,2) not null, -- Ajustado de largura_mm
  comprimento   numeric(10,2) not null, -- Ajustado de comprimento_mm
  peso_kg       numeric(10,4) not null default 0,
  quantidade    integer   not null default 0, -- Ajustado de estoque_atual
  fornecedor    text,
  lote          text, -- Adicionado
  criado_em     timestamptz not null default now()
);

create table if not exists estufas (
  id            bigserial primary key,
  nome          text      not null,
  numero        integer   unique not null, -- Adicionado
  capacidade_kg numeric(10,2) not null,
  temperatura_max numeric(6,1) not null default 600,
  ativa         integer   not null default 1,
  criado_em     timestamptz not null default now()
);

create table if not exists horarios_estufa (
  id            bigserial primary key,
  estufa_id     bigint    not null references estufas(id),
  dia_semana    text      not null,
  hora_inicio   text      not null,
  hora_fim      text      not null,
  ativo         integer   not null default 1,
  criado_em     timestamptz not null default now()
);

create table if not exists ordens_servico (
  id                bigserial primary key,
  numero            text      unique not null,
  cliente_id        bigint    not null references clientes(id),
  chapa_id          bigint    references chapas(id),
  descricao         text,
  qtd_chapas        integer   not null default 1,
  qtd_pedacos       integer   not null default 0,
  corte_mm          numeric(10,3),
  desbaste_mm       numeric(10,3),
  laminar_pct       numeric(5,2),
  medida_final      text,
  tempera           text,
  peso_unitario_kg  numeric(12,6),
  peso_total_kg     numeric(12,4),
  status            text      not null default 'aberta',
  data_emissao      date      not null default current_date,
  data_previsao     date,
  criado_em         timestamptz not null default now()
);

create table if not exists lancamentos_producao (
  id                  bigserial primary key,
  os_id               bigint    not null references ordens_servico(id),
  operador_id         bigint    not null references usuarios(id),
  operacao            text      not null,
  hora_inicio         text,
  hora_fim            text,
  tem_refeicao        integer   not null default 0,
  horas_lancadas      numeric(8,2) not null default 0,
  quantidade_produzida integer  not null default 0,
  peso_produzido      numeric(12,4) not null default 0,
  data_lancamento     date      not null default current_date,
  observacoes         text,
  operador_texto      text,
  equipamento         text,
  peso_liquido        numeric(12,4),
  quebra_pct          numeric(6,2),
  criado_em           timestamptz not null default now()
);

create table if not exists lancamento_periodos (
  id              bigserial primary key,
  lancamento_id   bigint    not null references lancamentos_producao(id) on delete cascade,
  hora_inicio     text      not null,
  hora_fim        text      not null,
  tem_refeicao    integer   not null default 0,
  horas           numeric(8,2) not null default 0,
  operacao        text      not null default 'Desbaste'
);

create table if not exists envios_estufa (
  id          bigserial primary key,
  estufa_id   bigint    not null references estufas(id),
  os_id       bigint    not null references ordens_servico(id),
  quantidade  integer   not null,
  peso_kg     numeric(10,3) not null,
  data_envio  date      not null default current_date,
  hora_envio  text,
  status      text      not null default 'aguardando',
  observacoes text,
  criado_em   timestamptz not null default now()
);

create table if not exists perdas (
  id              bigserial primary key,
  os_id           bigint    not null references ordens_servico(id),
  tipo_perda      text      not null,
  peso_bruto      numeric(12,4) not null,
  peso_liquido    numeric(12,4) not null,
  perda_kg        numeric(12,4) not null,
  perda_percentual numeric(6,2) not null,
  data_registro   date      not null default current_date,
  operador_id     bigint    references usuarios(id),
  observacoes     text
);

create table if not exists fundicao_registros (
  id          bigserial primary key,
  data        date      not null unique,
  total_kg    numeric(12,3) not null default 0,
  paletes     integer   not null default 0,
  borra_kg    numeric(10,3) not null default 0,
  gas_glp     numeric(10,3) not null default 0,
  observacoes text,
  operador_id bigint    references usuarios(id),
  criado_em   timestamptz not null default now()
);

create table if not exists fundicao_materias_primas (
  id              bigserial primary key,
  registro_id     bigint    not null references fundicao_registros(id) on delete cascade,
  material        text      not null,
  quantidade_kg   numeric(12,3) not null default 0
);

create table if not exists fundicao_materiais_config (
  id      bigserial primary key,
  nome    text      unique not null,
  ordem   integer   not null default 0,
  ativo   integer   not null default 1,
  tipo    text      not null default 'mp'
);

create table if not exists fundicao_produtos (
  id              bigserial primary key,
  codigo          text      unique not null,
  descricao       text      not null,
  espessura_mm    numeric(8,3) not null,
  comprimento_mm  numeric(8,2) not null,
  largura_mm      numeric(8,2),
  ativo           integer   not null default 1,
  criado_em       timestamptz not null default now()
);

create table if not exists laminacao_maquinas_config (
  id      bigserial primary key,
  turno   integer   not null,
  maquina text      not null,
  ordem   integer   not null default 0,
  ativo   integer   not null default 1,
  unique(turno, maquina)
);

create table if not exists laminacao_registros (
  id          bigserial primary key,
  data        date      not null unique,
  observacoes text,
  operador_id bigint    references usuarios(id),
  criado_em   timestamptz not null default now()
);

create table if not exists laminacao_producao (
  id          bigserial primary key,
  registro_id bigint    not null references laminacao_registros(id) on delete cascade,
  turno       integer   not null,
  maquina     text      not null,
  valor       integer   not null default 0
);

create table if not exists manutencao_maquinas (
  id              bigserial primary key,
  nome            text      not null,
  codigo          text      unique not null,
  tipo            text      not null default 'maquina',
  setor           text,
  fabricante      text,
  modelo          text,
  ano_fabricacao  integer,
  custo_hora      numeric(10,2) not null default 0,
  ativo           integer   not null default 1,
  criado_em       timestamptz not null default now()
);

create table if not exists manutencao_registros (
  id              bigserial primary key,
  maquina_id      bigint    not null references manutencao_maquinas(id),
  tipo_manutencao text      not null default 'corretiva',
  data_inicio     date      not null,
  data_fim        date,
  horas_paradas   numeric(8,2),
  custo_total     numeric(12,2),
  descricao       text      not null,
  tecnico         text,
  pecas_utilizadas text,
  status          text      not null default 'aberta',
  criado_em       timestamptz not null default now()
);

create table if not exists fundicao_manutencao (
  id          bigserial primary key,
  data        date      not null,
  maquina     text      not null,
  descricao   text      not null,
  horas_paradas numeric(8,2),
  tecnico     text,
  custo       numeric(12,2),
  criado_em   timestamptz not null default now()
);

create table if not exists audit_log (
  id              bigserial primary key,
  usuario_id      bigint,
  usuario_nome    text      not null default 'sistema',
  acao            text      not null,
  modulo          text      not null,
  registro_id     text,
  descricao       text,
  dados_antes     jsonb,
  dados_depois    jsonb,
  ip              text,
  criado_em       timestamptz not null default now()
);

-- ============================================================
-- DADOS INICIAIS (Senha: 123456 criptografada)
-- ============================================================
insert into usuarios (nome, email, senha, perfil, permissoes)
values ('Administrador', 'admin@admin.com', '$2b$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', 'admin', '{"admin": true}')
on conflict (email) do nothing;

insert into estufas (nome, numero, capacidade_kg) values 
  ('Estufa 1', 1, 500),
  ('Estufa 2', 2, 500),
  ('Estufa 3', 3, 500)
on conflict do nothing;

insert into fundicao_materiais_config (nome, ordem, tipo) values
  ('BISNAGA F', 1, 'mp'), ('BOLSA', 2, 'mp'), ('CABO', 3, 'mp'),
  ('RETALHO', 4, 'mp'), ('PANELA', 5, 'mp'), ('STAMPARIA', 6, 'mp'),
  ('OFF-SET', 7, 'mp'), ('BISNAGA', 8, 'mp'), ('TITANEO', 9, 'mp'),
  ('LINGOTE', 10, 'mp'), ('BICO KASTELINE', 11, 'especial')
on conflict (nome) do nothing;

insert into laminacao_maquinas_config (turno, maquina, ordem) values 
  (1, 'Desbaste 01', 1), (1, 'Desbaste 02', 2), (1, 'Desbaste 03', 3),
  (2, 'Desbaste 01', 1), (2, 'Desbaste 02', 2), (2, 'Desbaste 03', 3),
  (3, 'Desbaste 01', 1), (3, 'Desbaste 02', 2)
on conflict (turno, maquina) do nothing;