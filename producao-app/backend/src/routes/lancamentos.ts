import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken, AuthRequest } from '../middleware';

const router = Router();

// Listar lancamentos
router.get('/', authenticateToken, async (req, res) => {
  const { os_id, operacao, data_inicio, data_fim } = req.query;
  let sql = `SELECT l.*, os.numero as os_numero, c.nome as cliente_nome, u.nome as operador_nome 
    FROM lancamentos_producao l
    JOIN ordens_servico os ON l.os_id = os.id
    JOIN clientes c ON os.cliente_id = c.id
    JOIN usuarios u ON l.operador_id = u.id
    WHERE 1=1`;
  const params: any[] = [];
  if (os_id) { sql += ' AND l.os_id = ?'; params.push(os_id); }
  if (operacao) { sql += ' AND l.operacao = ?'; params.push(operacao); }
  if (data_inicio) { sql += ' AND l.data_lancamento >= ?'; params.push(data_inicio); }
  if (data_fim) { sql += ' AND l.data_lancamento <= ?'; params.push(data_fim); }
  sql += ' ORDER BY l.criado_em DESC LIMIT 500';
  const rows = await dbQuery(sql, params);
  res.json(rows);
});

// Criar lancamento
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { os_id, operacao, horas_lancadas, quantidade_produzida, peso_produzido, data_lancamento, observacoes } = req.body;
  if (!os_id || !operacao || !horas_lancadas) {
    return res.status(400).json({ error: 'Campos obrigatorios: os_id, operacao, horas_lancadas' });
  }
  const operador_id = req.user!.id;
  const data = data_lancamento || new Date().toISOString().split('T')[0];
  const result = await dbRun(
    'INSERT INTO lancamentos_producao (os_id, operador_id, operacao, horas_lancadas, quantidade_produzida, peso_produzido, data_lancamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [os_id, operador_id, operacao, horas_lancadas, quantidade_produzida || 0, peso_produzido || 0, data, observacoes || null]
  );
  res.status(201).json({ id: result.lastID });
});

// Atualizar lancamento
router.put('/:id', authenticateToken, async (req, res) => {
  const { operacao, horas_lancadas, quantidade_produzida, peso_produzido, data_lancamento, observacoes } = req.body;
  await dbRun(
    'UPDATE lancamentos_producao SET operacao=?, horas_lancadas=?, quantidade_produzida=?, peso_produzido=?, data_lancamento=?, observacoes=? WHERE id=?',
    [operacao, horas_lancadas, quantidade_produzida || 0, peso_produzido || 0, data_lancamento, observacoes || null, req.params.id]
  );
  res.json({ success: true });
});

// Excluir lancamento
router.delete('/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM lancamentos_producao WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Eficiencia por operacao
router.get('/eficiencia', authenticateToken, async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  let where = '';
  const params: any[] = [];
  if (data_inicio) { where += ' AND l.data_lancamento >= ?'; params.push(data_inicio); }
  if (data_fim) { where += ' AND l.data_lancamento <= ?'; params.push(data_fim); }
  
  const eficiencia = await dbQuery(`SELECT 
    l.operacao,
    SUM(l.horas_lancadas) as total_horas,
    SUM(l.peso_produzido) as total_peso_kg,
    SUM(l.quantidade_produzida) as total_quantidade,
    ROUND(SUM(l.peso_produzido) / NULLIF(SUM(l.horas_lancadas), 0), 2) as kg_por_hora,
    COUNT(DISTINCT l.os_id) as total_os
  FROM lancamentos_producao l
  WHERE 1=1 ${where}
  GROUP BY l.operacao
  ORDER BY l.operacao`, params);
  
  res.json(eficiencia);
});

export default router;
