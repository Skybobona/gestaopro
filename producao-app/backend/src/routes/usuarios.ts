import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken, requireAdmin, JWT_SECRET, AuthRequest } from '../middleware';

const router = Router();

async function logAudit(params: any) {
  try {
    await dbRun(`INSERT INTO audit_log (usuario_id, usuario_nome, acao, modulo, registro_id, descricao, ip) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [params.usuario_id ?? null, params.usuario_nome || 'sistema', params.acao, params.modulo, params.registro_id ? String(params.registro_id) : null, params.descricao ?? null, params.ip ?? null]);
  } catch (e) { }
}

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatÃ³rios' });
  const user = await dbGet('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email]) as any;
  if (!user || !bcrypt.compareSync(senha, user.senha)) {
    await logAudit({ usuario_nome: email, acao: 'login_falha', modulo: 'auth', descricao: 'Tentativa de login invÃ¡lida', ip: req.ip });
    return res.status(401).json({ error: 'Credenciais invÃ¡lidas' });
  }
  let permissoes: Record<string, string[]> = {};
  try { permissoes = typeof user.permissoes === 'string' ? JSON.parse(user.permissoes) : user.permissoes; } catch (_) { }
  const token = jwt.sign({ id: user.id, email: user.email, perfil: user.perfil, nome: user.nome, permissoes }, JWT_SECRET, { expiresIn: '8h' });
  await logAudit({ usuario_id: user.id, usuario_nome: user.nome, acao: 'login', modulo: 'auth', descricao: 'Login realizado com sucesso', ip: req.ip });
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, permissoes } });
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbQuery('SELECT id, nome, email, perfil, permissoes, ativo, criado_em FROM usuarios ORDER BY nome');
    res.json((users as any[]).map((u: any) => ({ ...u, permissoes: typeof u.permissoes === 'string' ? JSON.parse(u.permissoes || '{}') : u.permissoes })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const { nome, email, senha, perfil, permissoes } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Campos obrigatÃ³rios: nome, email, senha' });
  const hash = bcrypt.hashSync(senha, 10);
  const permsJson = JSON.stringify(permissoes || {});
  try {
    const result = await dbRun('INSERT INTO usuarios (nome, email, senha, perfil, permissoes) VALUES (?, ?, ?, ?, ?)', [nome, email, hash, perfil || 'operador', permsJson]);
    await logAudit({ usuario_id: req.user!.id, usuario_nome: req.user!.nome, acao: 'criar', modulo: 'usuarios', registro_id: String(result.lastID), descricao: `UsuÃ¡rio criado: ${nome}`, ip: req.ip });
    res.status(201).json({ id: result.lastID, nome, email, perfil: perfil || 'operador', permissoes: permissoes || {} });
  } catch (e: any) {
    if (e.message.includes('UNIQUE') || e.message.includes('duplicate')) return res.status(409).json({ error: 'Email jÃ¡ cadastrado' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const { nome, email, perfil, ativo, senha, permissoes } = req.body;
  const id = req.params.id;
  const permsJson = JSON.stringify(permissoes || {});
  try {
    if (senha) {
      const hash = bcrypt.hashSync(senha, 10);
      await dbRun('UPDATE usuarios SET nome=?, email=?, perfil=?, ativo=?, senha=?, permissoes=? WHERE id=?', [nome, email, perfil, ativo, hash, permsJson, id]);
    } else {
      await dbRun('UPDATE usuarios SET nome=?, email=?, perfil=?, ativo=?, permissoes=? WHERE id=?', [nome, email, perfil, ativo, permsJson, id]);
    }
    await logAudit({ usuario_id: req.user!.id, usuario_nome: req.user!.nome, acao: 'editar', modulo: 'usuarios', registro_id: id, descricao: `UsuÃ¡rio atualizado: ${nome}`, ip: req.ip });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const pid = req.params.id;
  try {
    const usuario = await dbGet('SELECT nome FROM usuarios WHERE id=?', [pid]) as any;
    await dbRun('UPDATE usuarios SET ativo=0 WHERE id=?', [pid]);
    await logAudit({ usuario_id: req.user!.id, usuario_nome: req.user!.nome, acao: 'desativar', modulo: 'usuarios', registro_id: pid, descricao: `UsuÃ¡rio desativado: ${usuario?.nome}`, ip: req.ip });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
