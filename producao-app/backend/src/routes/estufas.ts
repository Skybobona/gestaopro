import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  const estufas = await dbQuery('SELECT * FROM estufas ORDER BY numero', );
  const horarios = await dbQuery('SELECT * FROM horarios_estufa WHERE ativo=1 ORDER BY estufa_id, dia_semana', );
  res.json({ estufas, horarios });
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { nome, capacidade_kg, temperatura_max, ativa } = req.body;
  await dbRun('UPDATE estufas SET nome=?, capacidade_kg=?, temperatura_max=?, ativa=? WHERE id=?', [nome, capacidade_kg, temperatura_max, ativa, req.params.id]);
  res.json({ success: true });
});

router.post('/horarios', authenticateToken, async (req, res) => {
  const { estufa_id, dia_semana, hora_inicio, hora_fim } = req.body;
  if (!estufa_id || !dia_semana || !hora_inicio || !hora_fim) return res.status(400).json({ error: 'Campos obrigatÃ³rios incompletos' });
  const result = await dbRun('INSERT INTO horarios_estufa (estufa_id, dia_semana, hora_inicio, hora_fim) VALUES (?, ?, ?, ?)', [estufa_id, dia_semana, hora_inicio, hora_fim]);
  res.status(201).json({ id: result.lastID });
});

router.delete('/horarios/:id', authenticateToken, async (req, res) => {
  await dbRun('UPDATE horarios_estufa SET ativo=0 WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

router.get('/envios', authenticateToken, async (req, res) => {
  const envios = await dbQuery(`SELECT e.*, es.nome as estufa_nome, os.numero as os_numero, c.nome as cliente_nome
     FROM envios_estufa e
     JOIN estufas es ON e.estufa_id = es.id
     JOIN ordens_servico os ON e.os_id = os.id
     JOIN clientes c ON os.cliente_id = c.id
     ORDER BY e.criado_em DESC`, );
  res.json(envios);
});

router.post('/envios', authenticateToken, async (req, res) => {
  const { estufa_id, os_id, quantidade, peso_kg, hora_envio, observacoes } = req.body;
  if (!estufa_id || !os_id || !quantidade || !peso_kg) return res.status(400).json({ error: 'Campos obrigatÃ³rios incompletos' });
  const result = await dbRun('INSERT INTO envios_estufa (estufa_id, os_id, quantidade, peso_kg, hora_envio, observacoes) VALUES (?, ?, ?, ?, ?, ?)', [estufa_id, os_id, quantidade, peso_kg, hora_envio || null, observacoes || null]);
  res.status(201).json({ id: result.lastID });
});

router.patch('/envios/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  await dbRun('UPDATE envios_estufa SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ success: true });
});

export default router;
