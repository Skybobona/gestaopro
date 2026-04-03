/**
 * db-adapter.ts
 * Abstrai SQLite (local) e PostgreSQL (Supabase/produção).
 * - Se DATABASE_URL estiver definido → usa pg (PostgreSQL)
 * - Caso contrário → usa better-sqlite3 (local)
 *
 * A API pública é a mesma nos dois casos:
 *   dbQuery(sql, params)  → Promise<rows[]>
 *   dbRun(sql, params)    → Promise<{ lastID, rowCount }>
 */

import type { Pool as PgPool } from 'pg';

let pgPool: PgPool | null = null;
let sqliteDb: any = null;

// ── Inicialização ──────────────────────────────────────────────────────────────
export async function connectDB() {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
    // teste de conexão
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Conectado ao PostgreSQL (Supabase)');
  } else {
    const Database = (await import('better-sqlite3')).default;
    const path = await import('path');
    const dbPath = path.join(__dirname, '..', 'producao.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    console.log('✅ Conectado ao SQLite local');
  }
}

// ── Helpers de conversão ───────────────────────────────────────────────────────

/**
 * Converte placeholders SQLite (?) para PostgreSQL ($1, $2...)
 */
function toPostgresParams(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── API pública ────────────────────────────────────────────────────────────────

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (pgPool) {
    const pgSql = toPostgresParams(sql);
    const result = await pgPool.query(pgSql, params);
    return result.rows as T[];
  }
  // SQLite síncrono → wrapeado em Promise para API uniforme
  return sqliteDb.prepare(sql).all(...params) as T[];
}

export async function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; rowCount: number }> {
  if (pgPool) {
    // Para INSERT com RETURNING id
    const pgSql = toPostgresParams(
      sql.replace(/INSERT INTO (\w+)/i, (m) => `${m}`)
    );
    // Adiciona RETURNING id se for INSERT e não tiver RETURNING ainda
    const finalSql = /^INSERT/i.test(pgSql.trim()) && !/RETURNING/i.test(pgSql)
      ? `${pgSql} RETURNING id`
      : pgSql;
    const result = await pgPool.query(finalSql, params);
    return {
      lastID: result.rows[0]?.id ?? 0,
      rowCount: result.rowCount ?? 0,
    };
  }
  const info = sqliteDb.prepare(sql).run(...params);
  return { lastID: Number(info.lastInsertRowid), rowCount: info.changes };
}

export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const rows = await dbQuery<T>(sql, params);
  return rows[0];
}

export default { query: dbQuery, run: dbRun, get: dbGet };
