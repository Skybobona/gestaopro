import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './database';
import { connectDB } from './db-adapter';
import usuariosRouter from './routes/usuarios';
import clientesRouter from './routes/clientes';
import chapasRouter from './routes/chapas';
import estufasRouter from './routes/estufas';
import producaoRouter from './routes/producao';
import lancamentosRouter from './routes/lancamentos';
import perdasRouter from './routes/perdas';
import relatoriosRouter from './routes/relatorios';
import auditoriaRouter from './routes/auditoria';
import fundicaoRouter from './routes/fundicao';
import laminacaoRouter from './routes/laminacao';
import manutencaoRouter from './routes/manutencao';

// Carrega .env (DATABASE_URL, PORT, etc.)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: aceita localhost em dev + domínio Vercel em produção
const ALLOWED = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.*\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.some(r => r.test(origin))) cb(null, true);
    else cb(new Error('CORS: origem não permitida'));
  },
  credentials: true,
}));
app.use(express.json());

async function start() {
  if (process.env.DATABASE_URL) {
    // Modo produção: PostgreSQL (Supabase)
    await connectDB();
    console.log('Modo: PostgreSQL / Supabase');
  } else {
    // Modo desenvolvimento: SQLite local
    initDB();
    console.log('Modo: SQLite local');
  }

  app.use('/api/usuarios', usuariosRouter);
  app.use('/api/clientes', clientesRouter);
  app.use('/api/chapas', chapasRouter);
  app.use('/api/estufas', estufasRouter);
  app.use('/api/producao', producaoRouter);
  app.use('/api/lancamentos', lancamentosRouter);
  app.use('/api/perdas', perdasRouter);
  app.use('/api/relatorios', relatoriosRouter);
  app.use('/api/auditoria', auditoriaRouter);
  app.use('/api/fundicao', fundicaoRouter);
  app.use('/api/laminacao', laminacaoRouter);
  app.use('/api/manutencao', manutencaoRouter);

  app.get('/api/health', (_, res) => res.json({
    status: 'ok',
    db: process.env.DATABASE_URL ? 'postgresql' : 'sqlite',
    timestamp: new Date().toISOString(),
  }));

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

start().catch(err => { console.error('Erro ao iniciar:', err); process.exit(1); });
