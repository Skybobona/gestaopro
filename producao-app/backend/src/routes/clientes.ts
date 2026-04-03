import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  const clientes = await dbQuery('SELECT * FROM clientes ORDER BY nome', );
  res.json(clientes);
});

router.post('/', authenticateToken, async (req, res) => {
  const { nome, codigo, cnpj, telefone, email, endereco } = req.body;
  if (!nome || !codigo) return res.status(400).json({ error: 'Nome e cÃ³digo sÃ£o obrigatÃ³rios' });
  try {
    const result = await dbRun('INSERT INTO clientes (nome, codigo, cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?, ?)', [nome, codigo, cnpj || null, telefone || null, email || null, endereco || null]);
    res.status(201).json({ id: result.lastID, nome, codigo });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'CÃ³digo jÃ¡ cadastrado' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { nome, codigo, cnpj, telefone, email, endereco, ativo } = req.body;
  await dbRun('UPDATE clientes SET nome=?, codigo=?, cnpj=?, telefone=?, email=?, endereco=?, ativo=? WHERE id=?', [nome, codigo, cnpj, telefone, email, endereco, ativo, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', authenticateToken, async (req, res) => {
  await dbRun('UPDATE clientes SET ativo=0 WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

export default router;
