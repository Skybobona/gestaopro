import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken, AuthRequest } from '../middleware';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  const perdas = await dbQuery(`SELECT p.*, os.numero as os_numero, c.nome as cliente_nome, u.nome as operador_nome
     FROM perdas p
     JOIN ordens_servico os ON p.os_id = os.id
     JOIN clientes c ON os.cliente_id = c.id
     LEFT JOIN usuarios u ON p.operador_id = u.id
     ORDER BY p.data_registro DESC`, );
  res.json(perdas);
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { os_id, tipo_perda, peso_bruto, peso_liquido, observacoes } = req.body;
  if (!os_id || !tipo_perda || !peso_bruto || !peso_liquido) return res.status(400).json({ error: 'Campos obrigatÃ³rios incompletos' });
  const perda_kg = peso_bruto - peso_liquido;
  const perda_percentual = Math.round((perda_kg / peso_bruto) * 10000) / 100;
  const result = await dbRun('INSERT INTO perdas (os_id, tipo_perda, peso_bruto, peso_liquido, perda_kg, perda_percentual, operador_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [os_id, tipo_perda, peso_bruto, peso_liquido, perda_kg, perda_percentual, req.user!.id, observacoes || null]);
  res.status(201).json({ id: result.lastID, perda_kg, perda_percentual });
});

router.get('/relatorio', authenticateToken, async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  let where = '';
  const params: any[] = [];
  if (data_inicio) { where += ' AND p.data_registro >= ?'; params.push(data_inicio); }
  if (data_fim) { where += ' AND p.data_registro <= ?'; params.push(data_fim); }

  const resumo = await dbQuery(`SELECT 
       p.tipo_perda,
       COUNT(*) as total_registros,
       ROUND(SUM(p.peso_bruto), 2) as total_bruto_kg,
       ROUND(SUM(p.peso_liquido), 2) as total_liquido_kg,
       ROUND(SUM(p.perda_kg), 2) as total_perda_kg,
       ROUND(AVG(p.perda_percentual), 2) as media_perda_pct
     FROM perdas p
     WHERE 1=1 ${where}
     GROUP BY p.tipo_perda
     ORDER BY p.tipo_perda`, [...params]);

  const detalhe = await dbQuery(`SELECT p.*, os.numero as os_numero, c.nome as cliente_nome
     FROM perdas p
     JOIN ordens_servico os ON p.os_id = os.id
     JOIN clientes c ON os.cliente_id = c.id
     WHERE 1=1 ${where}
     ORDER BY p.data_registro DESC`, [...params]);

  const totais = await dbGet(`SELECT 
       ROUND(SUM(p.peso_bruto), 2) as total_bruto_kg,
       ROUND(SUM(p.peso_liquido), 2) as total_liquido_kg,
       ROUND(SUM(p.perda_kg), 2) as total_perda_kg,
       ROUND(AVG(p.perda_percentual), 2) as media_perda_pct
     FROM perdas p
     WHERE 1=1 ${where}`, [...params]);

  res.json({ resumo_por_tipo: resumo, detalhamento: detalhe, totais });
});

router.delete('/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM perdas WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

export default router;
