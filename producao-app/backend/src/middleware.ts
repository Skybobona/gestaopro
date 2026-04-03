import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'producao_secret_key_2024';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; perfil: string; nome: string; permissoes: Record<string, string[]> };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.perfil !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
  next();
}

// Verifica se o usuário tem permissão em um módulo para uma ação
export function requirePermission(modulo: string, acao: 'ler' | 'criar' | 'editar' | 'excluir') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Não autenticado' });
    if (user.perfil === 'admin') return next(); // admin sempre passa
    const perms: Record<string, string[]> = user.permissoes || {};
    if (perms[modulo]?.includes(acao)) return next();
    return res.status(403).json({ error: `Sem permissão para ${acao} em ${modulo}` });
  };
}

export { JWT_SECRET };
