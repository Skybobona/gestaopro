# ✅ Checklist de Deploy - Vercel + Supabase

## 🔐 1. Configurar Supabase
- [ ] Criar projeto em https://supabase.com
- [ ] Copiar **Project URL** (ex: `https://xyz.supabase.co`)
- [ ] Copiar **anon/public key** (Settings → API → Project API keys)
- [ ] Copiar **service_role key** (use APENAS no backend!)
- [ ] Executar `supabase/schema_prod.sql` no SQL Editor do Supabase
- [ ] (Opcional) Configurar Auth: Settings → Authentication → Providers → Email

## 🔐 2. Configurar Variáveis na Vercel
Acesse: Dashboard do Projeto → Settings → Environment Variables

### Variáveis Públicas (disponíveis no frontend)
| Variável | Valor Exemplo | Escopo |
|----------|--------------|--------|
| `VITE_SUPABASE_URL` | `https://xyz.supabase.co` | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Production + Preview |
| `VITE_API_URL` | `/api` | Production + Preview |

### Variáveis Privadas (apenas backend - NÃO exponha!)
| Variável | Valor Exemplo | Escopo |
|----------|--------------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | **Apenas Production** 🔒 |

### Produção
| Variável | Valor |
|----------|-------|
| `NODE_ENV` | `production` |

## 🚀 3. Deploy na Vercel
1. Conectar repositório GitHub/GitLab na Vercel
2. Configurar projeto:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Adicionar variáveis de ambiente (acima)
4. Clicar em **Deploy** 🎉

## 🔄 4. Migração de Dados (SQLite → Supabase)
Se tiver dados locais em `backend/producao.db`:

### Opção A: Manual (CSV)
```bash
# Exportar do SQLite
sqlite3 backend/producao.db ".mode csv" ".output lancamentos.csv" "SELECT * FROM lancamentos_producao;"

# Importar no Supabase: Dashboard → Table Editor → ⋮ → Import data
```

### Opção B: Script Node.js (em desenvolvimento)
```bash
# Criar script de migração (posso ajudar a criar!)
node scripts/migrate-sqlite-to-supabase.js
```

## 🧪 5. Testes Pós-Deploy
- [ ] Acessar URL da Vercel (ex: https://seu-projeto.vercel.app)
- [ ] Testar login (se usar Supabase Auth)
- [ ] Criar um lançamento de produção e verificar no Supabase Dashboard
- [ ] Testar em dispositivo móvel
- [ ] Verificar logs: Vercel → Logs / Supabase → Logs

## 🔧 6. Opcional: Domínio Customizado
- [ ] Vercel → Settings → Domains → Add Domain
- [ ] Configurar DNS no seu provedor (Cloudflare, Registro.br, etc.)
- [ ] Supabase → Authentication → URL Configuration → Atualizar Site URL

---
> 💡 **Dica Pro**: Use a integração oficial [Supabase + Vercel](https://vercel.com/marketplace/supabase) para sincronizar variáveis automaticamente e criar branches de preview com bancos isolados!

> ⚠️ **Segurança**: Nunca commit arquivos `.env*` no Git! Eles já estão no `.gitignore`.
