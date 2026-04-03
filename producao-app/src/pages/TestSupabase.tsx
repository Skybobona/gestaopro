// src/pages/TestSupabase.tsx
import { useEffect, useState } from 'react'

export default function TestSupabase() {
    const [status, setStatus] = useState('🔄 Carregando...')

    useEffect(() => {
        const url = import.meta.env.VITE_SUPABASE_URL
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY

        if (!url || !key) {
            setStatus('❌ Variáveis de ambiente não encontradas. Verifique o .env.local')
            return
        }

        setStatus(`✅ Conectado!\n\n📍 URL: ${url}\n🔑 Key: ${key?.substring(0, 20)}...`)
    }, [])

    return (
        <div className="min-h-screen p-8 font-mono text-sm bg-gray-50">
            <h1 className="text-2xl font-bold mb-6">🔗 Teste Supabase</h1>
            <pre className="bg-white p-4 rounded border whitespace-pre-wrap">{status}</pre>

            <div className="mt-6">
                <a href="/" className="text-blue-600 hover:underline">← Voltar para o app</a>
            </div>
        </div>
    )
}