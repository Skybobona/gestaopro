import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Plus, Edit2, Trash2, Search, X, Check, AlertCircle,
  Building2, Phone, Mail, MapPin, Hash, Package,
  TrendingUp, Scale, ArrowRight, Star, ChevronRight,
} from 'lucide-react';

interface Cliente {
  id: number; nome: string; codigo: string; cnpj: string;
  telefone: string; email: string; endereco: string; ativo: number;
}

const AVATAR_COLORS = [
  'bg-indigo-600','bg-purple-600','bg-teal-600','bg-amber-600',
  'bg-rose-600','bg-cyan-600','bg-emerald-600','bg-orange-600',
];
function avatarColor(nome: string) {
  return AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length];
}
function initials(nome: string) {
  return nome.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

const empty = { nome: '', codigo: '', cnpj: '', telefone: '', email: '', endereco: '' };

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordens,   setOrdens]   = useState<any[]>([]);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<Cliente | null>(null);
  const [form,     setForm]     = useState({ ...empty });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const load = () => Promise.all([
    api.get('/clientes').then(setClientes),
    api.get('/producao/os').then(setOrdens).catch(() => {}),
  ]);
  useEffect(() => { load(); }, []);

  const openNew  = (prefill?: Partial<typeof empty>) => {
    setForm({ ...empty, ...prefill }); setEditing(null); setError(''); setModal(true);
  };
  const openEdit = (c: Cliente) => {
    setForm({ nome: c.nome, codigo: c.codigo, cnpj: c.cnpj||'',
              telefone: c.telefone||'', email: c.email||'', endereco: c.endereco||'' });
    setEditing(c); setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (editing) await api.put(`/clientes/${editing.id}`, { ...form, ativo: editing.ativo });
      else         await api.post('/clientes', form);
      setModal(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar este cliente?')) return;
    await api.delete(`/clientes/${id}`); load();
    if (selected?.id === id) setSelected(null);
  };

  const filtered = useMemo(() =>
    clientes.filter(c =>
      (showInactive || c.ativo) &&
      (c.nome.toLowerCase().includes(search.toLowerCase()) ||
       c.codigo.toLowerCase().includes(search.toLowerCase()) ||
       (c.cnpj||'').includes(search))
    ), [clientes, search, showInactive]);

  // Stats por cliente
  const clienteStats = useMemo(() => {
    const map: Record<number, { total: number; abertas: number; peso: number; ultimaOS: string }> = {};
    ordens.forEach(o => {
      if (!map[o.cliente_id]) map[o.cliente_id] = { total: 0, abertas: 0, peso: 0, ultimaOS: '' };
      map[o.cliente_id].total++;
      if (o.status === 'aberta' || o.status === 'em_producao') map[o.cliente_id].abertas++;
      map[o.cliente_id].peso += Number(o.peso_total_kg) || 0;
      if (!map[o.cliente_id].ultimaOS || o.data_emissao > map[o.cliente_id].ultimaOS)
        map[o.cliente_id].ultimaOS = o.data_emissao;
    });
    return map;
  }, [ordens]);

  const ordensDoCli = selected ? ordens.filter(o => o.cliente_id === selected.id) : [];
  const statsCli    = selected ? clienteStats[selected.id] : null;

  // Top clientes por peso
  const topClientes = useMemo(() =>
    clientes.filter(c => clienteStats[c.id]?.peso > 0)
      .sort((a,b) => (clienteStats[b.id]?.peso||0) - (clienteStats[a.id]?.peso||0))
      .slice(0,5)
  , [clientes, clienteStats]);

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.filter(c=>c.ativo).length} ativos · {clientes.filter(c=>!c.ativo).length} inativos</p>
        </div>
        <button className="btn-primary" onClick={() => openNew()}><Plus className="w-4 h-4" />Novo Cliente</button>
      </div>

      {/* Main 2-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ── Lista ── */}
        <div className="card p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input className="input pl-9 py-2 text-sm" placeholder="Nome, código ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500">
              <input type="checkbox" className="w-3.5 h-3.5 rounded" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              Inativos
            </label>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} registro{filtered.length!==1?'s':''}</span>
          </div>

          {/* Lista de clientes */}
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <div className="px-4 py-16 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="font-semibold">Nenhum cliente encontrado</p>
                <button className="btn-primary btn-sm mt-4" onClick={() => openNew({ nome: search })}>
                  <Plus className="w-3.5 h-3.5" />Criar "{search || 'novo cliente'}"
                </button>
              </div>
            )}
            {filtered.map(c => {
              const st = clienteStats[c.id];
              const isSelected = selected?.id === c.id;
              return (
                <div key={c.id}
                  onClick={() => setSelected(isSelected ? null : c)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-slate-50/60 border-l-2 border-transparent'}`}>
                  <div className={`w-9 h-9 rounded-xl ${avatarColor(c.nome)} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {initials(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm truncate">{c.nome}</span>
                      {!c.ativo && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">Inativo</span>}
                      {st?.abertas > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{st.abertas} OS aberta{st.abertas>1?'s':''}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">{c.codigo}</span>
                      {c.telefone && <span className="text-xs text-slate-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.telefone}</span>}
                      {c.email && <span className="text-xs text-slate-400 truncate max-w-[160px]">{c.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {st && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-slate-700">{st.total} OS</p>
                        <p className="text-[10px] text-slate-400">{st.peso.toFixed(0)} kg total</p>
                      </div>
                    )}
                    <div className="flex gap-0.5">
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); remove(c.id); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isSelected ? 'rotate-90 text-indigo-400' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          {/* Detalhe do cliente selecionado */}
          {selected ? (
            <>
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${avatarColor(selected.nome)} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {initials(selected.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{selected.nome}</p>
                    <p className="text-xs text-slate-400 font-mono">{selected.codigo}</p>
                  </div>
                  <button onClick={() => openEdit(selected)} className="btn-secondary btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-1.5 text-sm">
                  {selected.cnpj && <div className="flex items-center gap-2 text-slate-600"><Hash className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{selected.cnpj}</div>}
                  {selected.telefone && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{selected.telefone}</div>}
                  {selected.email && <div className="flex items-center gap-2 text-slate-600"><Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="truncate">{selected.email}</span></div>}
                  {selected.endereco && <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="truncate">{selected.endereco}</span></div>}
                </div>
                <button onClick={() => navigate('/ordens')} className="mt-4 w-full btn-primary btn-sm">
                  <Plus className="w-3.5 h-3.5" />Nova OS para este cliente<ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>

              {/* Stats do cliente */}
              {statsCli && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label:'Total OS',        value: statsCli.total,              unit:'',     color:'bg-indigo-50' },
                    { label:'OS Abertas',      value: statsCli.abertas,            unit:'',     color:'bg-amber-50' },
                    { label:'Peso Total',      value: statsCli.peso.toFixed(1),    unit:'kg',   color:'bg-emerald-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl px-3 py-2.5 text-center`}>
                      <p className="text-lg font-bold text-slate-800">{s.value} <span className="text-xs font-normal text-slate-400">{s.unit}</span></p>
                      <p className="text-[10px] text-slate-500">{s.label}</p>
                    </div>
                  ))}
                  <div className="col-span-2 bg-slate-50 rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-400 mb-0.5">Último pedido</p>
                    <p className="text-sm font-semibold text-slate-700">{statsCli.ultimaOS || '—'}</p>
                  </div>
                </div>
              )}

              {/* Últimas OS */}
              {ordensDoCli.length > 0 && (
                <div className="card">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ordens de Serviço</p>
                  <div className="space-y-1.5">
                    {ordensDoCli.slice(0,6).map(o => (
                      <div key={o.id} className="flex items-center gap-2 py-1.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                        <span className="font-mono text-xs font-bold text-indigo-600">{o.numero}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          o.status==='aberta'?'bg-blue-100 text-blue-700':o.status==='em_producao'?'bg-amber-100 text-amber-700':o.status==='concluida'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'
                        }`}>{o.status==='em_producao'?'Em Prod.':o.status==='concluida'?'Concluída':o.status==='aberta'?'Aberta':'Cancelada'}</span>
                        <span className="text-xs text-slate-400 ml-auto">{o.peso_total_kg?`${Number(o.peso_total_kg).toFixed(1)}kg`:'—'}</span>
                      </div>
                    ))}
                    {ordensDoCli.length > 6 && (
                      <button onClick={() => navigate('/ordens')} className="text-xs text-indigo-500 hover:underline w-full text-center pt-1">
                        Ver todas ({ordensDoCli.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
              {ordensDoCli.length === 0 && (
                <div className="card text-center py-8">
                  <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Nenhuma OS para este cliente</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Top clientes */}
              {topClientes.length > 0 && (
                <div className="card">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />Top Clientes · Peso Total
                  </p>
                  {topClientes.map((c, i) => {
                    const st = clienteStats[c.id];
                    const max = clienteStats[topClientes[0].id]?.peso || 1;
                    return (
                      <div key={c.id} className="mb-3 cursor-pointer" onClick={() => setSelected(c)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${i===0?'bg-amber-400':i===1?'bg-slate-400':'bg-slate-300'}`}>{i+1}</span>
                          <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{c.nome}</span>
                          <span className="text-xs font-bold text-slate-800">{st.peso.toFixed(0)} <span className="text-slate-400 font-normal">kg</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(st.peso/max*100).toFixed(0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stats gerais */}
              <div className="card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />Resumo Geral
                </p>
                <div className="space-y-2">
                  {[
                    { label:'Clientes Ativos',      value: clientes.filter(c=>c.ativo).length, icon:<Building2 className="w-4 h-4 text-indigo-400" /> },
                    { label:'Total OS Emitidas',     value: ordens.length, icon:<Package className="w-4 h-4 text-amber-400" /> },
                    { label:'OS em Produção',        value: ordens.filter(o=>o.status==='em_producao').length, icon:<Scale className="w-4 h-4 text-purple-400" /> },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      {s.icon}
                      <span className="text-xs text-slate-600 flex-1">{s.label}</span>
                      <span className="text-sm font-bold text-slate-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card bg-slate-900 text-white py-4">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Ações Rápidas</p>
                {[
                  { label:'Nova Ordem de Serviço', path:'/ordens', icon:<Package className="w-3.5 h-3.5" /> },
                ].map(a => (
                  <button key={a.path} onClick={() => navigate(a.path)}
                    className="w-full flex items-center gap-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded-lg transition-all">
                    {a.icon}<span>{a.label}</span><ArrowRight className="w-3 h-3 ml-auto" />
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-slate-400 py-2">← Clique em um cliente para ver detalhes</p>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                {form.nome && <div className={`w-9 h-9 rounded-xl ${avatarColor(form.nome||'A')} text-white flex items-center justify-center text-sm font-bold`}>{initials(form.nome||'?')}</div>}
                <div>
                  <h2 className="font-bold text-slate-900">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{editing ? editing.codigo : 'Código atribuído automaticamente'}</p>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body space-y-4">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <div>
                  <label className="label flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" />Razão Social / Nome *</label>
                  <input className="input" placeholder="Nome completo do cliente..." value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label flex items-center gap-1"><Hash className="w-3 h-3 text-slate-400" />Código *</label>
                    <input className="input font-mono" placeholder="CLI-001" value={form.codigo} onChange={e => setForm(f=>({...f,codigo:e.target.value.toUpperCase()}))} required />
                  </div>
                  <div>
                    <label className="label">CNPJ</label>
                    <input className="input font-mono" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm(f=>({...f,cnpj:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />Telefone</label>
                    <input className="input" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm(f=>({...f,telefone:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />Email</label>
                    <input type="email" className="input" placeholder="email@empresa.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="label flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />Endereço</label>
                  <input className="input" placeholder="Rua, número, cidade..." value={form.endereco} onChange={e => setForm(f=>({...f,endereco:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : <><Check className="w-4 h-4" />Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
