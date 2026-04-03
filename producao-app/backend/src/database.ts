import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, '..', 'producao.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'operador',
      permissoes TEXT NOT NULL DEFAULT '{}',
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      cnpj TEXT,
      telefone TEXT,
      email TEXT,
      endereco TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      liga TEXT NOT NULL,
      espessura REAL NOT NULL,
      largura REAL NOT NULL,
      comprimento REAL NOT NULL,
      peso_kg REAL NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      fornecedor TEXT,
      lote TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS estufas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      numero INTEGER UNIQUE NOT NULL,
      capacidade_kg REAL NOT NULL,
      temperatura_max REAL NOT NULL DEFAULT 600,
      ativa INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS horarios_estufa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estufa_id INTEGER NOT NULL REFERENCES estufas(id),
      dia_semana TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ordens_servico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      chapa_id INTEGER REFERENCES chapas(id),
      descricao TEXT,
      qtd_chapas INTEGER NOT NULL DEFAULT 1,
      qtd_pedacos INTEGER NOT NULL DEFAULT 0,
      corte_mm REAL,
      desbaste_mm REAL,
      laminar_pct REAL,
      medida_final TEXT,
      tempera TEXT,
      peso_unitario_kg REAL,
      peso_total_kg REAL,
      status TEXT NOT NULL DEFAULT 'aberta',
      data_emissao TEXT NOT NULL DEFAULT (date('now')),
      data_previsao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lancamentos_producao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL REFERENCES ordens_servico(id),
      operador_id INTEGER NOT NULL REFERENCES usuarios(id),
      operacao TEXT NOT NULL,
      hora_inicio TEXT,
      hora_fim TEXT,
      tem_refeicao INTEGER NOT NULL DEFAULT 0,
      horas_lancadas REAL NOT NULL DEFAULT 0,
      quantidade_produzida INTEGER NOT NULL,
      peso_produzido REAL NOT NULL,
      data_lancamento TEXT NOT NULL DEFAULT (date('now')),
      observacoes TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lancamento_periodos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lancamento_id INTEGER NOT NULL REFERENCES lancamentos_producao(id) ON DELETE CASCADE,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      tem_refeicao INTEGER NOT NULL DEFAULT 0,
      horas REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS envios_estufa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estufa_id INTEGER NOT NULL REFERENCES estufas(id),
      os_id INTEGER NOT NULL REFERENCES ordens_servico(id),
      quantidade INTEGER NOT NULL,
      peso_kg REAL NOT NULL,
      data_envio TEXT NOT NULL DEFAULT (date('now')),
      hora_envio TEXT,
      status TEXT NOT NULL DEFAULT 'aguardando',
      observacoes TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS perdas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL REFERENCES ordens_servico(id),
      tipo_perda TEXT NOT NULL,
      peso_bruto REAL NOT NULL,
      peso_liquido REAL NOT NULL,
      perda_kg REAL NOT NULL,
      perda_percentual REAL NOT NULL,
      data_registro TEXT NOT NULL DEFAULT (date('now')),
      operador_id INTEGER REFERENCES usuarios(id),
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS fundicao_registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL UNIQUE,
      total_kg REAL NOT NULL DEFAULT 0,
      paletes INTEGER NOT NULL DEFAULT 0,
      borra_kg REAL NOT NULL DEFAULT 0,
      gas_glp REAL NOT NULL DEFAULT 0,
      observacoes TEXT,
      operador_id INTEGER REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fundicao_materias_primas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registro_id INTEGER NOT NULL REFERENCES fundicao_registros(id) ON DELETE CASCADE,
      material TEXT NOT NULL,
      quantidade_kg REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS fundicao_materiais_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      tipo TEXT NOT NULL DEFAULT 'mp'
    );

    CREATE TABLE IF NOT EXISTS fundicao_produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      descricao TEXT NOT NULL,
      espessura_mm REAL NOT NULL,
      comprimento_mm REAL NOT NULL,
      largura_mm REAL,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS laminacao_maquinas_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turno INTEGER NOT NULL,
      maquina TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      UNIQUE(turno, maquina)
    );

    CREATE TABLE IF NOT EXISTS laminacao_registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL UNIQUE,
      observacoes TEXT,
      operador_id INTEGER REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS laminacao_producao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registro_id INTEGER NOT NULL REFERENCES laminacao_registros(id) ON DELETE CASCADE,
      turno INTEGER NOT NULL,
      maquina TEXT NOT NULL,
      valor INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      usuario_nome TEXT NOT NULL DEFAULT 'sistema',
      acao TEXT NOT NULL,
      modulo TEXT NOT NULL,
      registro_id TEXT,
      descricao TEXT,
      dados_antes TEXT,
      dados_depois TEXT,
      ip TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS manutencao_maquinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'maquina',
      setor TEXT,
      fabricante TEXT,
      modelo TEXT,
      ano_fabricacao INTEGER,
      custo_hora REAL NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS manutencao_registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maquina_id INTEGER NOT NULL REFERENCES manutencao_maquinas(id),
      tipo_manutencao TEXT NOT NULL DEFAULT 'corretiva',
      data_inicio TEXT NOT NULL,
      data_fim TEXT,
      horas_paradas REAL,
      custo_total REAL,
      descricao TEXT NOT NULL,
      tecnico TEXT,
      pecas_utilizadas TEXT,
      status TEXT NOT NULL DEFAULT 'aberta',
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fundicao_manutencao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      maquina TEXT NOT NULL,
      descricao TEXT NOT NULL,
      horas_paradas REAL,
      tecnico TEXT,
      custo REAL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrations para banco existente
  const migrateTable = (table: string, migrations: { col: string; def: string }[]) => {
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((c: any) => c.name);
    for (const m of migrations) {
      if (!cols.includes(m.col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${m.col} ${m.def}`);
    }
  };

  migrateTable('usuarios', [
    { col: 'permissoes', def: `TEXT NOT NULL DEFAULT '{}'` },
  ]);

  migrateTable('ordens_servico', [
    { col: 'chapa_id', def: 'INTEGER REFERENCES chapas(id)' },
    { col: 'qtd_chapas', def: 'INTEGER NOT NULL DEFAULT 1' },
    { col: 'qtd_pedacos', def: 'INTEGER NOT NULL DEFAULT 0' },
    { col: 'corte_mm', def: 'REAL' },
    { col: 'desbaste_mm', def: 'REAL' },
    { col: 'laminar_pct', def: 'REAL' },
    { col: 'medida_final', def: 'TEXT' },
    { col: 'tempera', def: 'TEXT' },
    { col: 'peso_unitario_kg', def: 'REAL' },
    { col: 'peso_total_kg', def: 'REAL' },
  ]);

  migrateTable('fundicao_registros', [
    { col: 'produto_id', def: 'INTEGER REFERENCES fundicao_produtos(id)' },
  ]);

  migrateTable('lancamentos_producao', [
    { col: 'operador_texto', def: 'TEXT' },
    { col: 'equipamento', def: 'TEXT' },
    { col: 'peso_liquido', def: 'REAL' },
    { col: 'quebra_pct', def: 'REAL' },
  ]);
  migrateTable('lancamento_periodos', [
    { col: 'operacao', def: "TEXT NOT NULL DEFAULT 'Desbaste'" },
  ]);

  db.exec(`
    CREATE TABLE IF NOT EXISTS lancamento_periodos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lancamento_id INTEGER NOT NULL REFERENCES lancamentos_producao(id) ON DELETE CASCADE,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      tem_refeicao INTEGER NOT NULL DEFAULT 0,
      horas REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      usuario_nome TEXT NOT NULL DEFAULT 'sistema',
      acao TEXT NOT NULL,
      modulo TEXT NOT NULL,
      registro_id TEXT,
      descricao TEXT,
      dados_antes TEXT,
      dados_depois TEXT,
      ip TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const adminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@producao.com');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO usuarios (nome, email, senha, perfil, permissoes) VALUES (?, ?, ?, ?, ?)`).run(
      'Administrador', 'admin@producao.com', hash, 'admin', JSON.stringify({ admin: true })
    );
  }

  const estufaCount = db.prepare('SELECT COUNT(*) as count FROM estufas').get() as { count: number };
  if (estufaCount.count === 0) {
    const ins = db.prepare('INSERT INTO estufas (nome, numero, capacidade_kg) VALUES (?, ?, ?)');
    ins.run('Estufa 1', 1, 500);
    ins.run('Estufa 2', 2, 500);
    ins.run('Estufa 3', 3, 500);
  }

  const matCount = db.prepare('SELECT COUNT(*) as c FROM fundicao_materiais_config').get() as { c: number };
  if (matCount.c === 0) {
    const insMat = db.prepare('INSERT OR IGNORE INTO fundicao_materiais_config (nome, ordem, tipo) VALUES (?, ?, ?)');
    const mps = ['BISNAGA F', 'BOLSA', 'CABO', 'RETALHO', 'PANELA', 'STAMPARIA', 'OFF-SET', 'BISNAGA', 'TITANEO', 'LINGOTE'];
    mps.forEach((n, i) => insMat.run(n, i + 1, 'mp'));
    insMat.run('BICO KASTELINE', mps.length + 1, 'especial');
  }

  // Migration: adicionar coluna tipo se não existir
  const matCols = (db.prepare('PRAGMA table_info(fundicao_materiais_config)').all() as any[]).map((c: any) => c.name);
  if (!matCols.includes('tipo')) {
    db.exec(`ALTER TABLE fundicao_materiais_config ADD COLUMN tipo TEXT NOT NULL DEFAULT 'mp'`);
    db.prepare(`UPDATE fundicao_materiais_config SET tipo='especial' WHERE nome IN ('BICO KASTELINE','GAS/GLP')`).run();
  }

  const lamMaqCount = db.prepare('SELECT COUNT(*) as c FROM laminacao_maquinas_config').get() as { c: number };
  if (lamMaqCount.c === 0) {
    const insLam = db.prepare('INSERT OR IGNORE INTO laminacao_maquinas_config (turno, maquina, ordem) VALUES (?, ?, ?)');
    [1, 2, 3].forEach(t => {
      const maquinas = t < 3 ? ['Desbaste 01', 'Desbaste 02', 'Desbaste 03'] : ['Desbaste 01', 'Desbaste 02'];
      maquinas.forEach((m, i) => insLam.run(t, m, i + 1));
    });
  }
}

export function registrarAuditoria(params: {
  usuario_id?: number;
  usuario_nome: string;
  acao: string;
  modulo: string;
  registro_id?: string | number;
  descricao?: string;
  dados_antes?: any;
  dados_depois?: any;
  ip?: string;
}) {
  try {
    db.prepare(`
      INSERT INTO audit_log (usuario_id, usuario_nome, acao, modulo, registro_id, descricao, dados_antes, dados_depois, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.usuario_id ?? null,
      params.usuario_nome,
      params.acao,
      params.modulo,
      params.registro_id ? String(params.registro_id) : null,
      params.descricao ?? null,
      params.dados_antes ? JSON.stringify(params.dados_antes) : null,
      params.dados_depois ? JSON.stringify(params.dados_depois) : null,
      params.ip ?? null
    );
  } catch (_) { }
}

export default db;
