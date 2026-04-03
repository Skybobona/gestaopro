import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken, AuthRequest } from '../middleware';

const router = Router();

// Produtos padrao
router.get('/produtos', authenticateToken, async (_req, res) => {
  res.json(await dbQuery('SELECT * FROM fundicao_produtos WHERE ativo=1 ORDER BY codigo'));
});

router.post('/produtos', authenticateToken, async (req, res) => {
  const { codigo, descricao, espessura_mm, comprimento_mm, largura_mm } = req.body;
  if (!codigo || !descricao || !espessura_mm || !comprimento_mm) {
    return res.status(400).json({ error: 'Campos obrigatorios: codigo, descricao, espessura_mm, comprimento_mm' });
  }
  try {
    const r = await dbRun('INSERT INTO fundicao_produtos (codigo, descricao, espessura_mm, comprimento_mm, largura_mm) VALUES (?,?,?,?,?)', [codigo, descricao, espessura_mm, comprimento_mm, largura_mm || null]);
    res.status(201).json({ id: r.lastID });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/produtos/:id', authenticateToken, async (req, res) => {
  const { codigo, descricao, espessura_mm, comprimento_mm, largura_mm, ativo } = req.body;
  await dbRun('UPDATE fundicao_produtos SET codigo=?, descricao=?, espessura_mm=?, comprimento_mm=?, largura_mm=?, ativo=? WHERE id=?', [codigo, descricao, espessura_mm, comprimento_mm, largura_mm, ativo ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

router.delete('/produtos/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM fundicao_produtos WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Materiais configuraveis
router.get('/materiais-config', authenticateToken, async (_req, res) => {
  res.json(await dbQuery('SELECT * FROM fundicao_materiais_config WHERE ativo=1 ORDER BY ordem'));
});

router.post('/materiais-config', authenticateToken, async (req, res) => {
  const { nome, ordem, tipo } = req.body;
  const r = await dbRun('INSERT INTO fundicao_materiais_config (nome, ordem, tipo) VALUES (?,?,?)', [nome, ordem || 0, tipo || 'mp']);
  res.status(201).json({ id: r.lastID });
});

router.delete('/materiais-config/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM fundicao_materiais_config WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Registros diarios
router.get('/registros', authenticateToken, async (req, res) => {
  const { mes } = req.query;
  let sql = 'SELECT * FROM fundicao_registros';
  const params: any[] = [];
  if (mes) {
    sql += ' WHERE strftime("%Y-%m", data) = ?';
    params.push(mes);
  }
  sql += ' ORDER BY data DESC';
  const rows = await dbQuery(sql, params);
  
  // Buscar materiais de cada registro
  for (const r of rows as any[]) {
    r.materias_primas = await dbQuery('SELECT * FROM fundicao_materias_primas WHERE registro_id=?', [r.id]);
  }
  res.json(rows);
});

router.get('/registros/:data', authenticateToken, async (req, res) => {
  const row = await dbGet('SELECT * FROM fundicao_registros WHERE data=?', [req.params.data]);
  if (!row) return res.status(404).json({ error: 'Registro nao encontrado' });
  (row as any).materias_primas = await dbQuery('SELECT * FROM fundicao_materias_primas WHERE registro_id=?', [(row as any).id]);
  res.json(row);
});

router.post('/registros', authenticateToken, async (req: AuthRequest, res) => {
  const { data, total_kg, paletes, borra_kg, gas_glp, materias_primas, observacoes } = req.body;
  if (!data || total_kg == null) return res.status(400).json({ error: 'Data e total_kg sao obrigatorios' });
  
  try {
    const r = await dbRun(
      'INSERT INTO fundicao_registros (data, total_kg, paletes, borra_kg, gas_glp, observacoes, operador_id) VALUES (?,?,?,?,?,?,?)',
      [data, total_kg, paletes || 0, borra_kg || 0, gas_glp || 0, observacoes || null, req.user!.id]
    );
    const registro_id = r.lastID;
    
    // Inserir materias primas
    if (Array.isArray(materias_primas)) {
      for (const mp of materias_primas) {
        if (mp.material && mp.quantidade_kg > 0) {
          await dbRun('INSERT INTO fundicao_materias_primas (registro_id, material, quantidade_kg) VALUES (?,?,?)', [registro_id, mp.material, mp.quantidade_kg]);
        }
      }
    }
    
    res.status(201).json({ id: registro_id });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/registros/:id', authenticateToken, async (req: AuthRequest, res) => {
  const { data, total_kg, paletes, borra_kg, gas_glp, materias_primas, observacoes } = req.body;
  
  await dbRun(
    'UPDATE fundicao_registros SET data=?, total_kg=?, paletes=?, borra_kg=?, gas_glp=?, observacoes=? WHERE id=?',
    [data, total_kg, paletes || 0, borra_kg || 0, gas_glp || 0, observacoes || null, req.params.id]
  );
  
  // Atualizar materias primas
  await dbRun('DELETE FROM fundicao_materias_primas WHERE registro_id=?', [req.params.id]);
  if (Array.isArray(materias_primas)) {
    for (const mp of materias_primas) {
      if (mp.material && mp.quantidade_kg > 0) {
        await dbRun('INSERT INTO fundicao_materias_primas (registro_id, material, quantidade_kg) VALUES (?,?,?)', [req.params.id, mp.material, mp.quantidade_kg]);
      }
    }
  }
  
  res.json({ success: true });
});

router.delete('/registros/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM fundicao_materias_primas WHERE registro_id=?', [req.params.id]);
  await dbRun('DELETE FROM fundicao_registros WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Resumo mensal
router.get('/resumo/:mes', authenticateToken, async (req, res) => {
  const { mes } = req.params;
  
  const total = await dbGet(
    'SELECT SUM(total_kg) as total_kg, SUM(paletes) as total_paletes, SUM(borra_kg) as total_borra, SUM(gas_glp) as total_gas FROM fundicao_registros WHERE strftime("%Y-%m", data) = ?',
    [mes]
  );
  
  const materiais = await dbQuery(
    'SELECT mp.material, SUM(mp.quantidade_kg) as total_kg FROM fundicao_materias_primas mp JOIN fundicao_registros fr ON mp.registro_id = fr.id WHERE strftime("%Y-%m", fr.data) = ? GROUP BY mp.material',
    [mes]
  );
  
  res.json({ mes, total, materiais });
});

export default router;
