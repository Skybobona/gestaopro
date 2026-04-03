import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken, AuthRequest } from '../middleware';

const router = Router();

// Listar OS
router.get('/os', authenticateToken, async (req, res) => {
  const { status, cliente_id } = req.query;
  let sql = `SELECT os.*, c.nome as cliente_nome FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE 1=1`;
  const params: any[] = [];
  if (status) { sql += ' AND os.status = ?'; params.push(status); }
  if (cliente_id) { sql += ' AND os.cliente_id = ?'; params.push(cliente_id); }
  sql += ' ORDER BY os.criado_em DESC';
  const ordens = await dbQuery(sql, params);
  res.json(ordens);
});

// Obter OS por ID
router.get('/os/:id', authenticateToken, async (req, res) => {
  const os = await dbGet(`SELECT os.*, c.nome as cliente_nome FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE os.id = ?`, [req.params.id]);
  if (!os) return res.status(404).json({ error: 'OS nao encontrada' });
  res.json(os);
});

// Criar OS
router.post('/os', authenticateToken, async (req: AuthRequest, res) => {
  const { cliente_id, numero, produto, medida_final, corte_mm, desbaste_mm, qtd_chapas, qtd_pedacos, peso_total_kg, data_previsao } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente e obrigatorio' });
  
  const osNumero = numero || `OS-${Date.now()}`;
  const result = await dbRun(
    'INSERT INTO ordens_servico (numero, cliente_id, produto, medida_final, corte_mm, desbaste_mm, qtd_chapas, qtd_pedacos, peso_total_kg, data_previsao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [osNumero, cliente_id, produto || null, medida_final || null, corte_mm || null, desbaste_mm || null, qtd_chapas || 1, qtd_pedacos || 1, peso_total_kg || 0, data_previsao || null]
  );
  
  res.status(201).json({ id: result.lastID, numero: osNumero });
});

// Atualizar OS
router.put('/os/:id', authenticateToken, async (req, res) => {
  const { produto, medida_final, corte_mm, desbaste_mm, qtd_chapas, qtd_pedacos, peso_total_kg, data_previsao, status } = req.body;
  await dbRun(
    'UPDATE ordens_servico SET produto=?, medida_final=?, corte_mm=?, desbaste_mm=?, qtd_chapas=?, qtd_pedacos=?, peso_total_kg=?, data_previsao=?, status=? WHERE id=?',
    [produto || null, medida_final || null, corte_mm || null, desbaste_mm || null, qtd_chapas || 1, qtd_pedacos || 1, peso_total_kg || 0, data_previsao || null, status || 'aberta', req.params.id]
  );
  res.json({ success: true });
});

// Atualizar status
router.patch('/os/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  await dbRun('UPDATE ordens_servico SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ success: true });
});

// Excluir OS
router.delete('/os/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM ordens_servico WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

export default router;
