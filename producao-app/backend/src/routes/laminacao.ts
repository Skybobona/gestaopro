import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken, AuthRequest } from '../middleware';

const router = Router();

// Maquinas configuraveis
router.get('/maquinas', authenticateToken, async (_req, res) => {
  res.json(await dbQuery('SELECT * FROM laminacao_maquinas_config WHERE ativo=1 ORDER BY turno, ordem'));
});

router.post('/maquinas', authenticateToken, async (req, res) => {
  const { turno, maquina, ordem } = req.body;
  try {
    const r = await dbRun('INSERT INTO laminacao_maquinas_config (turno, maquina, ordem) VALUES (?,?,?)', [turno, maquina, ordem || 0]);
    res.status(201).json({ id: r.lastID });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/maquinas/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM laminacao_maquinas_config WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Registros diarios
router.get('/registros', authenticateToken, async (req, res) => {
  const { mes } = req.query;
  let sql = 'SELECT * FROM laminacao_registros';
  const params: any[] = [];
  if (mes) {
    sql += ' WHERE strftime("%Y-%m", data) = ?';
    params.push(mes);
  }
  sql += ' ORDER BY data DESC';
  const rows = await dbQuery(sql, params);
  
  for (const r of rows as any[]) {
    r.producao = await dbQuery('SELECT * FROM laminacao_producao WHERE registro_id=?', [r.id]);
  }
  res.json(rows);
});

router.get('/registros/:data', authenticateToken, async (req, res) => {
  const row = await dbGet('SELECT * FROM laminacao_registros WHERE data=?', [req.params.data]);
  if (!row) return res.status(404).json({ error: 'Registro nao encontrado' });
  (row as any).producao = await dbQuery('SELECT * FROM laminacao_producao WHERE registro_id=?', [(row as any).id]);
  res.json(row);
});

router.post('/registros', authenticateToken, async (req: AuthRequest, res) => {
  const { data, producao, observacoes } = req.body;
  if (!data) return res.status(400).json({ error: 'Data e obrigatoria' });
  
  try {
    const r = await dbRun(
      'INSERT INTO laminacao_registros (data, observacoes, operador_id) VALUES (?,?,?)',
      [data, observacoes || null, req.user!.id]
    );
    const registro_id = r.lastID;
    
    if (Array.isArray(producao)) {
      for (const p of producao) {
        if (p.turno && p.maquina && p.valor >= 0) {
          await dbRun('INSERT INTO laminacao_producao (registro_id, turno, maquina, valor) VALUES (?,?,?,?)', [registro_id, p.turno, p.maquina, p.valor]);
        }
      }
    }
    
    res.status(201).json({ id: registro_id });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/registros/:id', authenticateToken, async (req: AuthRequest, res) => {
  const { data, producao, observacoes } = req.body;
  
  await dbRun(
    'UPDATE laminacao_registros SET data=?, observacoes=? WHERE id=?',
    [data, observacoes || null, req.params.id]
  );
  
  await dbRun('DELETE FROM laminacao_producao WHERE registro_id=?', [req.params.id]);
  if (Array.isArray(producao)) {
    for (const p of producao) {
      if (p.turno && p.maquina && p.valor >= 0) {
        await dbRun('INSERT INTO laminacao_producao (registro_id, turno, maquina, valor) VALUES (?,?,?,?)', [req.params.id, p.turno, p.maquina, p.valor]);
      }
    }
  }
  
  res.json({ success: true });
});

router.delete('/registros/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM laminacao_producao WHERE registro_id=?', [req.params.id]);
  await dbRun('DELETE FROM laminacao_registros WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Resumo mensal
router.get('/resumo/:mes', authenticateToken, async (req, res) => {
  const { mes } = req.params;
  
  const total = await dbGet(
    'SELECT COUNT(*) as total_registros FROM laminacao_registros WHERE strftime("%Y-%m", data) = ?',
    [mes]
  );
  
  const producao = await dbQuery(
    'SELECT p.turno, p.maquina, SUM(p.valor) as total_valor FROM laminacao_producao p JOIN laminacao_registros lr ON p.registro_id = lr.id WHERE strftime("%Y-%m", lr.data) = ? GROUP BY p.turno, p.maquina',
    [mes]
  );
  
  res.json({ mes, total, producao });
});

export default router;
