import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { RefreshCw, Search, Filter, Shield, Clock, AlertTriangle, Activity, ChevronDown } from 'lucide-react';

const ACAO_CONFIG: Record<string, { label: string; color: string }> = {
  login:        { label: 'Login',        color: 'bg-blue-50 text-blue-700' },
  login_falha:  { label: 'Falha Login',  color: 'bg-red-50 text-red-700' },
  criar:        { label: 'Criação',      color: 'bg-emerald-50 text-emerald-700' },
  editar:       { label: 'Edição',       color: 'bg-amber-50 text-amber-700' },
  excluir:      { label: 'Exclusão',     color: 'bg-red-50 text-red-700' },
  desativar:    { label: 'Desativação',  color: 'bg-orange-50 text-orange-700' },
};

const MODULOS_PT: Record<string, string> = {
  auth: 'Autenticação', usuarios: 'Usuários', clientes: 'Clientes',
  chapas: 'Chapas', ordens: 'OS', lancamentos: 'Lançamentos',
  estufas: 'Estufas', perdas: 'Perdas', relatorios: 'Relatórios',
};

export default function Auditoria() {
  const [resumo, setResumo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [busca, setBusca] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const loadResumo = () => api.get('/auditoria/resumo').then(setResumo).catch(() => null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (filtroModulo) q.set('modulo', filtroModulo);
      if (filtroAcao) q.set('acao', filtroAcao);
      const r = await api.get(`/auditoria?${q}`);
      setLogs(r.rows);
      setTotal(r.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadResumo(); }, []);
  useEffect(() => { loadLogs(); }, [filtroModulo, filtroAcao, offset]);

  const filtered = useMemo(() => {
    if (!busca.trim()) return logs;
    const b = busca.toLowerCase();
    return logs.filter(l =>
      l.usuario_nome?.toLowerCase().includes(b) ||
      l.descricao?.toLowerCase().includes(b) ||
      l.modulo?.toLowerCase().includes(b)
    );
  }, [logs, busca]);

  const modulosDisponiveis = Object.keys(MODULOS_PT);
  const acoesDisponiveis = Object.keys(ACAO_CONFIG);

  const formatDate = (s: string) => {
    if (!s) return '—';
    const d = new Date(s.replace(' ', 'T') + 'Z');
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Log de Auditoria</h1>
          <p className="page-subtitle">Registro completo de todas as ações realizadas no sistema</p>
        </div>
        <button className="btn-secondary" onClick={() => { loadResumo(); loadLogs(); }}>
          <RefreshCw className="w-4 h-4" />Atualizar
        </button>
      </div>

      {/* KPIs */}
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card py-4">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center mb-3"><Activity className="w-4 h-4 text-slate-600" /></div>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-400">Total de eventos</p>
          </div>
          <div className="card py-4">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center mb-3"><Shield className="w-4 h-4 text-slate-600" /></div>
            <p className="text-2xl font-bold text-slate-900">{resumo.por_usuario?.length ?? 0}</p>
            <p className="text-xs text-slate-400">Usuários ativos</p>
          </div>
          <div className="card py-4">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
            <p className="text-2xl font-bold text-red-600">{resumo.por_acao?.find((a: any) => a.acao === 'login_falha')?.total ?? 0}</p>
            <p className="text-xs text-slate-400">Falhas de login</p>
          </div>
          <div className="card py-4">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center mb-3"><Clock className="w-4 h-4 text-slate-600" /></div>
            <p className="text-sm font-semibold text-slate-800 truncate">{resumo.recentes?.[0]?.usuario_nome ?? '—'}</p>
            <p className="text-xs text-slate-400">Último acesso</p>
          </div>
        </div>
      )}

      {/* Atividade por módulo e usuário */}
      {resumo && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Atividade por Módulo</p>
            <div className="space-y-2">
              {resumo.por_modulo?.slice(0, 8).map((m: any) => {
                const max = resumo.por_modulo[0]?.total || 1;
                return (
                  <div key={m.modulo} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-28 text-right flex-shrink-0">{MODULOS_PT[m.modulo] || m.modulo}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: `${(m.total / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-8">{m.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Top Usuários</p>
            <div className="space-y-2">
              {resumo.por_usuario?.slice(0, 6).map((u: any, i: number) => (
                <div key={u.usuario_nome} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {u.usuario_nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-700 flex-1 truncate">{u.usuario_nome}</span>
                  <span className="text-xs font-bold text-slate-500">{u.total} ações</span>
                </div>
              ))}
              {(resumo.por_usuario?.length ?? 0) === 0 && <p className="text-sm text-slate-400">Nenhum dado</p>}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por usuário, descrição..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <select className="select pl-9 pr-8" value={filtroModulo} onChange={e => { setFiltroModulo(e.target.value); setOffset(0); }}>
            <option value="">Todos módulos</option>
            {modulosDisponiveis.map(m => <option key={m} value={m}>{MODULOS_PT[m]}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select className="select pr-8" value={filtroAcao} onChange={e => { setFiltroAcao(e.target.value); setOffset(0); }}>
            <option value="">Todas ações</option>
            {acoesDisponiveis.map(a => <option key={a} value={a}>{ACAO_CONFIG[a]?.label}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabela de log */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <span className="w-5 h-5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />Carregando...
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Data / Hora</th>
                    <th className="th">Usuário</th>
                    <th className="th">Ação</th>
                    <th className="th">Módulo</th>
                    <th className="th">Descrição</th>
                    <th className="th">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id}>
                      <td className="td text-xs font-mono text-slate-400 whitespace-nowrap">{formatDate(log.criado_em)}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                            {log.usuario_nome?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{log.usuario_nome}</span>
                        </div>
                      </td>
                      <td className="td">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${ACAO_CONFIG[log.acao]?.color || 'bg-slate-100 text-slate-600'}`}>
                          {ACAO_CONFIG[log.acao]?.label || log.acao}
                        </span>
                      </td>
                      <td className="td">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {MODULOS_PT[log.modulo] || log.modulo}
                        </span>
                      </td>
                      <td className="td text-sm text-slate-600 max-w-xs truncate">{log.descricao || '—'}</td>
                      <td className="td text-xs font-mono text-slate-400">{log.ip || '—'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="td text-center text-slate-400 py-12">Nenhum evento encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {total > LIMIT && (
              <div className="flex items-center justify-between px-4 pt-4 border-t border-slate-100 mt-2">
                <span className="text-xs text-slate-400">{offset + 1}–{Math.min(offset + LIMIT, total)} de {total} eventos</span>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>Anterior</button>
                  <button className="btn-secondary btn-sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)}>Próximo</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
