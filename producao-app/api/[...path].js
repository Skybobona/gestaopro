// api/[...path].js
// API genérica para todas as operações CRUD

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Verificar JWT
async function verificarToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const jwt = await import('@tsndr/cloudflare-worker-jwt');
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const [tabela, id] = path.split('/');

  // Verificar autenticação (exceto login)
  if (!path.includes('login')) {
    const usuario = await verificarToken(request);
    if (!usuario) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    let response;
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    };

    switch (request.method) {
      case 'GET':
        const queryParams = url.searchParams.toString();
        response = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}${id ? '/' + id : ''}${queryParams ? '?' + queryParams : ''}`, {
          headers,
        });
        break;

      case 'POST':
        const body = await request.json();
        response = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        break;

      case 'PUT':
        const putBody = await request.json();
        response = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(putBody),
        });
        break;

      case 'DELETE':
        response = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${id}`, {
          method: 'DELETE',
          headers,
        });
        break;

      default:
        return new Response(JSON.stringify({ error: 'Método não permitido' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
