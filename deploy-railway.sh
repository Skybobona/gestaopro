#!/bin/bash
# Script de Deploy para Railway
# Execute: chmod +x deploy-railway.sh && ./deploy-railway.sh

echo "ðŸš€ Iniciando deploy do backend no Railway..."

# Verificar se railway CLI estÃ¡ instalado
if ! command -v railway &> /dev/null; then
    echo "ðŸ“¦ Instalando Railway CLI..."
    npm install -g @railway/cli
fi

# Login no Railway
echo "ðŸ” FaÃ§a login no Railway:"
railway login

# Navegar para pasta do backend
cd producao-app/backend

# Inicializar projeto Railway
echo "ðŸ†• Inicializando projeto..."
railway init

# Adicionar variÃ¡veis de ambiente
echo "âš™ï¸ Configurando variÃ¡veis de ambiente..."
railway variables set SUPABASE_URL="SUA_URL_SUPABASE"
railway variables set SUPABASE_SERVICE_KEY="SUA_SERVICE_KEY"
railway variables set PORT="3001"
railway variables set JWT_SECRET="gestaopro_jwt_secret_$(date +%s)"
railway variables set NODE_ENV="production"

# Deploy
echo "ðŸš€ Fazendo deploy..."
railway up

# Mostrar URL
echo "âœ… Deploy concluÃ­do!"
echo "ðŸŒ URL da API:"
railway status
