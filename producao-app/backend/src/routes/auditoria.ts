import { Router } from 'express';
import { dbQuery, dbRun, dbGet } from '../db-adapter';
import { authenticateToken, requireAdmin } from '../middleware';

const router = Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  const { modulo, acao, usuario_id, limit, offset } = req.query;
  const params: any[] = [];
  const where: string[] = [];

  if (modulo)     { where.push('modulo = ?');     params.push(modulo); }
  if (acao)       { where.push('acao = ?');        params.push(acao); }
  if (usuario_id) { where.push('usuario_id = ?');  params.push(usuario_id); }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const lim  = Math.min(parseInt(limit as string) || 100, 500);
  const off  = parseInt(offset as string) || 0;

  const rows = await dbQuery(`
    SELECT * FROM audit_log ${whereStr}
    ORDER BY criado_em DESC
    LIMIT ? OFFSET ?
  `, [...params, lim, off]);

  const total = (await dbGet(`SELECT COUNT(*) as c FROM audit_log ${whereStr}`, [...params]) as any).c;

  res.json({ total, rows });
});

router.get('/resumo', authenticateToken, requireAdmin, async (req, res) => {
  const porModulo = await dbQuery(`
    SELECT modulo, COUNT(*) as total FROM audit_log GROUP BY modulo ORDER BY total DESC
  `);
  const porAcao = await dbQuery(`
    SELECT acao, COUNT(*) as total FROM audit_log GROUP BY acao ORDER BY total DESC
  `);
  const porUsuario = await dbQuery(`
    SELECT usuario_nome, COUNT(*) as total FROM audit_log WHERE usuario_id IS NOT NULL GROUP BY usuario_nome ORDER BY total DESC LIMIT 10
  `);
  const recentes = await dbQuery(`
    SELECT * FROM audit_log ORDER BY criado_em DESC LIMIT 10
  `);
  res.json({ por_modulo: porModulo, por_acao: porAcao, por_usuario: porUsuario, recentes });
});

export default router;
