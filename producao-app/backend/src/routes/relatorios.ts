import { Router } from 'express';
import { dbQuery } from '../db-adapter';
import { authenticateToken } from '../middleware';

const router = Router();

// Ranking OS por kg/h
router.get('/ranking-os', authenticateToken, async (req, res) => {
  const { operacao, limite = '20' } = req.query;
  let where = '';
  const params: any[] = [];
  if (operacao) { where = 'WHERE l.operacao = ?'; params.push(operacao); }

  const rows = await dbQuery(`
    SELECT
      os.id, os.numero, os.status,
      c.nome as cliente,
      os.peso_total_kg,
      COUNT(l.id) as total_lancamentos,
      ROUND(SUM(l.horas_lancadas), 2) as total_horas,
      ROUND(SUM(l.peso_produzido), 3) as total_peso_produzido,
      ROUND(SUM(l.peso_produzido) / NULLIF(SUM(l.horas_lancadas), 0), 2) as kg_por_hora
    FROM lancamentos_producao l
    JOIN ordens_servico os ON l.os_id = os.id
    JOIN clientes c ON os.cliente_id = c.id
    ${where}
    GROUP BY l.os_id
    HAVING SUM(l.horas_lancadas) > 0
    ORDER BY kg_por_hora DESC
    LIMIT ?
  `, [...params, parseInt(limite as string) || 20]);

  res.json(rows);
});

// Producao por periodo
router.get('/producao', authenticateToken, async (req, res) => {
  const { data_inicio, data_fim, operacao } = req.query;
  let sql = `SELECT 
    DATE(l.data_lancamento) as data,
    l.operacao,
    SUM(l.horas_lancadas) as total_horas,
    SUM(l.peso_produzido) as total_peso,
    SUM(l.quantidade_produzida) as total_pecas,
    COUNT(*) as total_lancamentos
  FROM lancamentos_producao l
  WHERE 1=1`;
  const params: any[] = [];
  if (data_inicio) { sql += ' AND l.data_lancamento >= ?'; params.push(data_inicio); }
  if (data_fim) { sql += ' AND l.data_lancamento <= ?'; params.push(data_fim); }
  if (operacao) { sql += ' AND l.operacao = ?'; params.push(operacao); }
  sql += ' GROUP BY DATE(l.data_lancamento), l.operacao ORDER BY data DESC';
  const rows = await dbQuery(sql, params);
  res.json(rows);
});

// Resumo mensal
router.get('/resumo-mensal', authenticateToken, async (req, res) => {
  const { ano } = req.query;
  const year = ano || new Date().getFullYear();
  const sql = `SELECT 
    strftime("%m", data_lancamento) as mes,
    operacao,
    SUM(horas_lancadas) as total_horas,
    SUM(peso_produzido) as total_peso,
    SUM(quantidade_produzida) as total_pecas
  FROM lancamentos_producao
  WHERE strftime("%Y", data_lancamento) = ?
  GROUP BY strftime("%m", data_lancamento), operacao
  ORDER BY mes, operacao`;
  const rows = await dbQuery(sql, [String(year)]);
  res.json(rows);
});

export default router;
