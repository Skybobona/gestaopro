# ðŸš€ Deploy GestÃ£oPro - Guia Completo

## 1. Backend no Railway (Recomendado - GrÃ¡tis)

### 1.1 Criar conta
- Acesse https://railway.app
- Login com GitHub

### 1.2 Novo Projeto
1. Clique **New Project**
2. Escolha **Deploy from GitHub repo**
3. Selecione seu repositÃ³rio (ou faÃ§a upload do cÃ³digo)

### 1.3 Configurar VariÃ¡veis de Ambiente
No painel do Railway, vÃ¡ em **Variables** e adicione:

```
SUPABASE_URL=https://SEU_PROJETO_ID.supabase.co
SUPABASE_SERVICE_KEY=SUA_SERVICE_KEY
PORT=3001
JWT_SECRET=gestaopro_jwt_secret_2024
NODE_ENV=production
```

### 1.4 Configurar Build
Crie arquivo `railway.json` na pasta `backend/`:

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

### 1.5 Deploy
- Railway detectarÃ¡ automaticamente o Node.js
- Clique **Deploy**
- Anote a URL gerada (ex: `https://gestaopro.up.railway.app`)

---

## 2. Frontend na Vercel

### 2.1 Preparar Build
O `vercel.json` jÃ¡ estÃ¡ configurado.

### 2.2 Deploy
1. Acesse https://vercel.com
2. Importe seu repositÃ³rio GitHub
3. ConfiguraÃ§Ãµes:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.3 VariÃ¡veis de Ambiente
Adicione em **Project Settings â†’ Environment Variables**:

```
VITE_API_URL=https://SEU_BACKEND_RAILWAY.app/api
```

Substitua pela URL do Railway.

### 2.4 Redeploy
Cada push no GitHub dispara deploy automÃ¡tico.

---

## 3. Testar ConexÃ£o Supabase

ApÃ³s deploy, teste a API:

```bash
curl https://SEU_BACKEND_RAILWAY.app/api/health
```

Deve retornar:
```json
{"status":"ok","db":"postgresql","timestamp":"..."}
```

---

## 4. URLs Importantes

| ServiÃ§o | URL |
|---------|-----|
| Supabase Dashboard | https://app.supabase.com/project/SEU_PROJETO_ID |
| Railway Dashboard | https://railway.app/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |

---

## 5. Troubleshooting

### Erro CORS
Adicione seu domÃ­nio Vercel no `index.ts`:
```javascript
const ALLOWED = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/seu-app\.vercel\.app$/,  // seu domÃ­nio especÃ­fico
];
```

### Erro de conexÃ£o Supabase
Verifique se `SUPABASE_SERVICE_KEY` estÃ¡ correta (nÃ£o Ã© a anon key).

### Schema nÃ£o criado
Execute o SQL em: Supabase â†’ SQL Editor â†’ New query â†’ Cole `supabase/schema.sql`

---

## 6. Comandos Ãšteis

```bash
# Testar local com Supabase
# Crie .env na pasta backend com as credenciais
cd producao-app/backend
npm run dev

# Build frontend
npm run build

# Ver logs Railway
railway logs
```
