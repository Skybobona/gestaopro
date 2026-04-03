import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  const chapas = await dbQuery('SELECT * FROM chapas ORDER BY codigo', );
  res.json(chapas);
});

router.post('/', authenticateToken, async (req, res) => {
  const { codigo, liga, espessura, largura, comprimento, peso_kg, quantidade, fornecedor, lote } = req.body;
  if (!codigo || !liga || !espessura || !largura || !comprimento || !peso_kg) return res.status(400).json({ error: 'Campos obrigatÃ³rios incompletos' });
  try {
    const result = await dbRun('INSERT INTO chapas (codigo, liga, espessura, largura, comprimento, peso_kg, quantidade, fornecedor, lote) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [codigo, liga, espessura, largura, comprimento, peso_kg, quantidade || 0, fornecedor || null, lote || null]);
    res.status(201).json({ id: result.lastID, codigo });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'CÃ³digo de chapa jÃ¡ cadastrado' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { codigo, liga, espessura, largura, comprimento, peso_kg, quantidade, fornecedor, lote } = req.body;
  await dbRun('UPDATE chapas SET codigo=?, liga=?, espessura=?, largura=?, comprimento=?, peso_kg=?, quantidade=?, fornecedor=?, lote=? WHERE id=?', [codigo, liga, espessura, largura, comprimento, peso_kg, quantidade, fornecedor, lote, req.params.id]);
  res.json({ success: true });
});

router.patch('/:id/estoque', authenticateToken, async (req, res) => {
  const { quantidade } = req.body;
  await dbRun('UPDATE chapas SET quantidade = quantidade + ? WHERE id=?', [quantidade, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', authenticateToken, async (req, res) => {
  await dbRun('DELETE FROM chapas WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

export default router;
