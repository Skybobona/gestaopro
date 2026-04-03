# ðŸš€ Guia Completo de Deploy - GestÃ£oPro

## ðŸ“‹ Ãndice
1. [PreparaÃ§Ã£o](#1-preparaÃ§Ã£o)
2. [Deploy do Backend (Railway)](#2-deploy-do-backend-railway)
3. [Deploy do Frontend (Vercel)](#3-deploy-do-frontend-vercel)
4. [ConfiguraÃ§Ã£o do Banco (Supabase)](#4-configuraÃ§Ã£o-do-banco-supabase)
5. [Testes e ValidaÃ§Ã£o](#5-testes-e-validaÃ§Ã£o)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. PreparaÃ§Ã£o

### 1.1 Estrutura do Projeto
```
new-project/
â”œâ”€â”€ producao-app/          # Frontend (React + Vite)
â”‚   â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ dist/             # Build gerado
â”‚   â”œâ”€â”€ vercel.json       # Config Vercel
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ producao-app/backend/  # Backend (Express + TypeScript)
â”‚   â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ dist/             # Build gerado
â”‚   â”œâ”€â”€ railway.json      # Config Railway
â”‚   â””â”€â”€ package.json
â”‚
â””â”€â”€ supabase/
    â””â”€â”€ schema.sql        # Schema do banco
```

### 1.2 Credenciais NecessÃ¡rias
VocÃª jÃ¡ tem:
- âœ… **Supabase URL**: `https://SEU_PROJETO_ID.supabase.co`
- âœ… **Service Key**: `SUA_SERVICE_KEY`
- âœ… **Anon Key**: `SUA_ANON_KEY`

---

## 2. Deploy do Backend (Railway)

### 2.1 Criar Conta no Railway
1. Acesse: https://railway.app
2. Clique em "Start a New Project"
3. FaÃ§a login com **GitHub**

### 2.2 Preparar o Backend

#### Arquivo: `producao-app/backend/.env` (CRIAR ESTE ARQUIVO)
```env
# Supabase Configuration
SUPABASE_URL=https://SEU_PROJETO_ID.supabase.co
SUPABASE_SERVICE_KEY=SUA_SERVICE_KEY

# Server Configuration
PORT=3001
JWT_SECRET=gestaopro_jwt_secret_2024_mude_em_producao
NODE_ENV=production

# CORS (URLs do frontend)
FRONTEND_URL=https://seu-app.vercel.app
```

#### Arquivo: `producao-app/backend/railway.json` (JÃ EXISTE)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Arquivo: `producao-app/backend/Procfile` (CRIAR)
```
web: npm start
```

### 2.3 Deploy no Railway

#### OpÃ§Ã£o A: Via GitHub (Recomendado)
1. No Railway Dashboard, clique **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha seu repositÃ³rio
4. Railway detectarÃ¡ automaticamente o Node.js
5. Clique em **"Add Variables"** e adicione todas as variÃ¡veis do `.env`
6. Clique **"Deploy"**

#### OpÃ§Ã£o B: Via CLI
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar projeto
railway init

# Deploy
railway up
```

### 2.4 Verificar Deploy
ApÃ³s o deploy, Railway fornecerÃ¡ uma URL:
```
https://gestaopro-production.up.railway.app
```

Teste a API:
```bash
curl https://SEU-APP.up.railway.app/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "db": "postgresql",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 3. Deploy do Frontend (Vercel)

### 3.1 Preparar o Frontend

#### Arquivo: `producao-app/.env.production` (CRIAR)
```env
VITE_API_URL=https://SEU-APP.up.railway.app/api
VITE_SUPABASE_URL=https://SEU_PROJETO_ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

> âš ï¸ **IMPORTANTE**: Substitua `SEU-APP` pela URL real do Railway!

#### Arquivo: `producao-app/vercel.json` (JÃ EXISTE)
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

### 3.2 Deploy na Vercel

#### OpÃ§Ã£o A: Via Dashboard (Recomendado)
1. Acesse: https://vercel.com
2. Clique **"Add New Project"**
3. Importe seu repositÃ³rio GitHub
4. ConfiguraÃ§Ãµes:
   - **Framework Preset**: Vite
   - **Root Directory**: `producao-app` (se o repo tiver pasta raiz)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Clique em **"Environment Variables"** e adicione:
   ```
   VITE_API_URL=https://SEU-APP.up.railway.app/api
   ```
6. Clique **"Deploy"**

#### OpÃ§Ã£o B: Via CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 3.3 Configurar DomÃ­nio (Opcional)
1. No dashboard Vercel, vÃ¡ em **"Settings" â†’ "Domains"**
2. Adicione seu domÃ­nio personalizado
3. Siga as instruÃ§Ãµes de DNS

---

## 4. ConfiguraÃ§Ã£o do Banco (Supabase)

### 4.1 Verificar Schema
1. Acesse: https://app.supabase.com/project/SEU_PROJETO_ID
2. VÃ¡ em **"SQL Editor"**
3. Execute o arquivo `supabase/schema.sql`
4. Verifique se todas as tabelas foram criadas

### 4.2 PolÃ­ticas de SeguranÃ§a (RLS)
As polÃ­ticas jÃ¡ estÃ£o no schema. Verifique:
```sql
-- Verificar tabelas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Verificar polÃ­ticas
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### 4.3 UsuÃ¡rio Inicial
JÃ¡ criado no schema:
- **Email**: admin@gestaopro.com
- **Senha**: (definir apÃ³s primeiro login)

---

## 5. Testes e ValidaÃ§Ã£o

### 5.1 Checklist de Testes

#### Backend
```bash
# Health check
GET https://SEU-APP.up.railway.app/api/health

# Login
POST https://SEU-APP.up.railway.app/api/usuarios/login
Body: { "email": "admin@gestaopro.com", "senha": "sua_senha" }

# Listar OS (com token)
GET https://SEU-APP.up.railway.app/api/producao/os
Headers: { "Authorization": "Bearer TOKEN" }
```

#### Frontend
- [ ] PÃ¡gina de login carrega
- [ ] Login funciona
- [ ] Dashboard carrega dados
- [ ] OperaÃ§Ãµes (Desbaste, LaminaÃ§Ã£o, Corte, ExpediÃ§Ã£o) funcionam
- [ ] LanÃ§amentos salvam corretamente
- [ ] RelatÃ³rios geram

### 5.2 Teste de CORS
Se houver erro de CORS, adicione no `backend/src/index.ts`:
```typescript
const ALLOWED = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/seu-dominio\.com$/,  // Seu domÃ­nio
];
```

---

## 6. Troubleshooting

### Erro: "Cannot connect to database"
**SoluÃ§Ã£o**: Verifique se `SUPABASE_SERVICE_KEY` estÃ¡ correta (nÃ£o Ã© a anon key!)

### Erro: "CORS policy"
**SoluÃ§Ã£o**: Adicione a URL do frontend no array `ALLOWED` do backend

### Erro: "Module not found"
**SoluÃ§Ã£o**: Execute `npm install` no backend antes do deploy

### Erro: "Build failed"
**SoluÃ§Ã£o**: Verifique se `tsconfig.json` estÃ¡ configurado corretamente

### Erro: "Port already in use"
**SoluÃ§Ã£o**: Railway define a porta automaticamente via `process.env.PORT`

---

## ðŸ“ž Links Ãšteis

| ServiÃ§o | URL |
|---------|-----|
| Supabase Dashboard | https://app.supabase.com/project/SEU_PROJETO_ID |
| Railway Dashboard | https://railway.app/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |
| DocumentaÃ§Ã£o Railway | https://docs.railway.app |
| DocumentaÃ§Ã£o Vercel | https://vercel.com/docs |
| DocumentaÃ§Ã£o Supabase | https://supabase.com/docs |

---

## âœ… Checklist Final

Antes de considerar o deploy completo:

- [ ] Backend deployado no Railway
- [ ] Frontend deployado na Vercel
- [ ] VariÃ¡veis de ambiente configuradas
- [ ] Banco de dados criado no Supabase
- [ ] Schema SQL executado
- [ ] Login funcionando
- [ ] OperaÃ§Ãµes de CRUD testadas
- [ ] RelatÃ³rios gerando corretamente
- [ ] CORS configurado
- [ ] HTTPS ativado (Vercel/Railway jÃ¡ fazem isso)

---

**ðŸŽ‰ Pronto! Seu GestÃ£oPro estÃ¡ no ar!**
