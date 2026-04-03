import { Router } from 'express';
import { dbQuery, dbRun } from '../db-adapter';
import { authenticateToken, AuthRequest } from '../middleware';

const router = Router();

// Maquinas
router.get('/maquinas', authenticateToken, async (_req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM manutencao_maquinas ORDER BY nome');
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/maquinas', authenticateToken, async (req, res) => {
  try {
    const { nome, tipo, custo_hora } = req.body;
    const r = await dbRun('INSERT INTO manutencao_maquinas (nome, tipo, custo_hora) VALUES (?,?,?)', [nome, tipo || 'maquina', custo_hora || 0]);
    res.json({ id: r.lastID });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/maquinas/:id', authenticateToken, async (req, res) => {
  try {
    const { nome, tipo, custo_hora, status } = req.body;
    await dbRun('UPDATE manutencao_maquinas SET nome=?, tipo=?, custo_hora=?, status=? WHERE id=?', [nome, tipo, custo_hora, status, req.params.id]);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/maquinas/:id', authenticateToken, async (req, res) => {
  try {
    await dbRun('UPDATE manutencao_maquinas SET ativo=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Registros
router.get('/registros', authenticateToken, async (req, res) => {
  try {
    const { maquina_id, status } = req.query;
    let sql = 'SELECT r.*, m.nome as maquina_nome FROM manutencao_registros r JOIN manutencao_maquinas m ON r.maquina_id = m.id WHERE 1=1';
    const params: any[] = [];
    if (maquina_id) { sql += ' AND r.maquina_id = ?'; params.push(maquina_id); }
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    sql += ' ORDER BY r.criado_em DESC';
    const rows = await dbQuery(sql, params);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/registros', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { maquina_id, tipo, descricao, data_inicio, data_fim, horas_paradas, custo_total, responsavel } = req.body;
    const r = await dbRun(
      'INSERT INTO manutencao_registros (maquina_id, tipo, descricao, data_inicio, data_fim, horas_paradas, custo_total, responsavel, operador_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [maquina_id, tipo, descricao, data_inicio, data_fim || null, horas_paradas || 0, custo_total || 0, responsavel || null, req.user!.id]
    );
    res.status(201).json({ id: r.lastID });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/registros/:id', authenticateToken, async (req, res) => {
  try {
    const { tipo, descricao, data_inicio, data_fim, horas_paradas, custo_total, responsavel, status } = req.body;
    await dbRun(
      'UPDATE manutencao_registros SET tipo=?, descricao=?, data_inicio=?, data_fim=?, horas_paradas=?, custo_total=?, responsavel=?, status=? WHERE id=?',
      [tipo, descricao, data_inicio, data_fim || null, horas_paradas || 0, custo_total || 0, responsavel || null, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/registros/:id', authenticateToken, async (req, res) => {
  try {
    await dbRun('DELETE FROM manutencao_registros WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
