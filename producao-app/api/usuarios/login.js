// api/usuarios/login.js
// Edge Function para login direto no Supabase

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email, senha } = await request.json();

    // Buscar usuário no Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?email=eq.${email}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    const usuarios = await response.json();

    if (!usuarios || usuarios.length === 0) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const usuario = usuarios[0];

    // Verificar senha (usando bcryptjs no browser seria melhor, mas simplificando)
    const bcrypt = await import('bcryptjs');
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Gerar JWT
    const jwt = await import('@tsndr/cloudflare-worker-jwt');
    const token = await jwt.sign({
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
    }, process.env.JWT_SECRET);

    return new Response(JSON.stringify({
      token,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
