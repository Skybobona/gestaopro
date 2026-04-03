import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import {
  Plus, Edit2, Trash2, X, Check, AlertCircle, Search,
  Wrench, Settings, Clock, DollarSign, AlertTriangle,
  CheckCircle2, PlayCircle, Circle, BarChart2, ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type Tab = 'maquinas' | 'registros' | 'dashboard';
const TIPOS_MANUT = ['corretiva', 'preventiva', 'preditiva', 'melhoria'];
const TIPO_LABELS: Record<string, string> = { corretiva: 'Corretiva', preventiva: 'Preventiva', preditiva: 'Preditiva', melhoria: 'Melhoria' };
const TIPO_COLORS: Record<string, string> = { corretiva: '#ef4444', preventiva: '#10b981', preditiva: '#6366f1', melhoria: '#f59e0b' };
const STATUS_COLORS: Record<string, string> = {
  aberta: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  concluida: 'bg-emerald-100 text-emerald-700',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  aberta: <Circle className="w-3.5 h-3.5 text-blue-400" />,
  em_andamento: <PlayCircle className="w-3.5 h-3.5 text-amber-400" />,
  concluida: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
};
const TIPOS_MAQ = ['maquina', 'ferramenta', 'veiculo', 'outro'];
const SETORES = ['Fundição', 'Laminação', 'Desbaste', 'Corte', 'Expedição', 'Manutenção Geral', 'Administrativo'];

const emptyMaq = { nome: '', codigo: '', tipo: 'maquina', setor: '', fabricante: '', modelo: '', ano_fabricacao: '', custo_hora: '0' };
const emptyReg = { maquina_id: '', tipo_manutencao: 'corretiva', data_inicio: '', data_fim: '', horas_paradas: '', custo_total: '', descricao: '', tecnico: '', pecas_utilizadas: '', status: 'aberta' };

export default function Manutencao() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [modalMaq, setModalMaq] = useState(false);
  const [modalReg, setModalReg] = useState(false);
  const [editingMaq, setEditingMaq] = useState<any | null>(null);
  const [editingReg, setEditingReg] = useState<any | null>(null);
  const [formMaq, setFormMaq] = useState({ ...emptyMaq });
  const [formReg, setFormReg] = useState({ ...emptyReg });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAll = () => Promise.all([
    api.get('/manutencao/maquinas').then(setMaquinas).catch(() => {}),
    api.get('/manutencao/registros').then(setRegistros).catch(() => {}),
    api.get('/manutencao/dashboard').then(setDashboard).catch(() => {}),
  ]);
  useEffect(() => { loadAll(); }, []);

  // Máquinas
  const saveMaq = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = { ...formMaq, custo_hora: parseFloat(formMaq.custo_hora) || 0, ano_fabricacao: formMaq.ano_fabricacao ? parseInt(formMaq.ano_fabricacao) : null };
      if (editingMaq) await api.put(`/manutencao/maquinas/${editingMaq.id}`, { ...data, ativo: editingMaq.ativo });
      else await api.post('/manutencao/maquinas', data);
      setModalMaq(false); loadAll();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const removeMaq = async (id: number) => {
    if (!confirm('Desativar esta máquina/ferramenta?')) return;
    await api.delete(`/manutencao/maquinas/${id}`); loadAll();
  };

  // Registros
  const saveReg = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = {
        ...formReg,
        maquina_id: parseInt(formReg.maquina_id),
        horas_paradas: formReg.horas_paradas ? parseFloat(formReg.horas_paradas) : null,
        custo_total: formReg.custo_total ? parseFloat(formReg.custo_total) : null,
      };
      if (editingReg) await api.put(`/manutencao/registros/${editingReg.id}`, data);
      else await api.post('/manutencao/registros', data);
      setModalReg(false); loadAll();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const removeReg = async (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await api.delete(`/manutencao/registros/${id}`); loadAll();
    if (selected?.id === id) setSelected(null);
  };

  const openNewReg = (maquinaId?: number) => {
    setFormReg({ ...emptyReg, maquina_id: maquinaId ? String(maquinaId) : '' });
    setEditingReg(null); setError(''); setModalReg(true);
  };

  const openEditReg = (r: any) => {
    setFormReg({ maquina_id: String(r.maquina_id), tipo_manutencao: r.tipo_manutencao, data_inicio: r.data_inicio, data_fim: r.data_fim || '', horas_paradas: r.horas_paradas ? String(r.horas_paradas) : '', custo_total: r.custo_total ? String(r.custo_total) : '', descricao: r.descricao, tecnico: r.tecnico || '', pecas_utilizadas: r.pecas_utilizadas || '', status: r.status });
    setEditingReg(r); setError(''); setModalReg(true);
  };

  const custoEstimado = formReg.horas_paradas && formReg.maquina_id
    ? (() => { const maq = maquinas.find(m => String(m.id) === formReg.maquina_id); return maq ? (parseFloat(formReg.horas_paradas) * maq.custo_hora).toFixed(2) : null; })()
    : null;

  const filteredReg = useMemo(() => registros.filter(r =>
    (!tipoFilter || r.tipo_manutencao === tipoFilter) &&
    (!statusFilter || r.status === statusFilter) &&
    (!search || r.maquina_nome?.toLowerCase().includes(search.toLowerCase()) || r.descricao?.toLowerCase().includes(search.toLowerCase()) || r.tecnico?.toLowerCase().includes(search.toLowerCase()))
  ), [registros, tipoFilter, statusFilter, search]);

  const maqAtivas = maquinas.filter(m => m.ativo);

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manutenção</h1>
          <p className="page-subtitle">Máquinas · Ferramentas · Registros · Custos de parada</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => { setFormMaq({ ...emptyMaq }); setEditingMaq(null); setError(''); setModalMaq(true); }}>
            <Settings className="w-4 h-4" />Nova Máquina
          </button>
          <button className="btn-primary" onClick={() => openNewReg()}>
            <Plus className="w-4 h-4" />Registrar Manutenção
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([['dashboard', 'Dashboard', <BarChart2 className="w-3.5 h-3.5" />], ['registros', 'Registros', <Wrench className="w-3.5 h-3.5" />], ['maquinas', 'Máquinas & Ferramentas', <Settings className="w-3.5 h-3.5" />]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ══ TAB DASHBOARD ══ */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Registros', value: dashboard?.totais?.total_registros ?? 0, color: 'border-l-slate-400', text: 'text-slate-900' },
              { label: 'Em Aberto', value: (dashboard?.totais?.abertas ?? 0) + (dashboard?.totais?.em_andamento ?? 0), color: 'border-l-amber-500', text: 'text-amber-600' },
              { label: 'Horas Paradas', value: `${dashboard?.totais?.total_horas_paradas ?? 0}h`, color: 'border-l-rose-500', text: 'text-rose-600' },
              { label: 'Custo Total', value: `R$ ${(dashboard?.totais?.custo_total ?? 0).toFixed(0)}`, color: 'border-l-indigo-500', text: 'text-indigo-700' },
            ].map(k => (
              <div key={k.label} className={`card border-l-4 ${k.color} py-4`}>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.text}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
            {/* Gráfico por máquina */}
            {dashboard?.por_maquina?.length > 0 && (
              <div className="card">
                <p className="font-bold text-slate-800 mb-5 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-500" />Horas Paradas por Máquina</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dashboard.por_maquina} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                      formatter={(v: any) => [`${v}h`, 'Horas paradas']}
                    />
                    <Bar dataKey="horas" radius={[0, 4, 4, 0]} maxBarSize={22} fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-4">
              {/* Por tipo */}
              {dashboard?.por_tipo?.length > 0 && (
                <div className="card">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Por Tipo</p>
                  {dashboard.por_tipo.map((t: any) => (
                    <div key={t.tipo_manutencao} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TIPO_COLORS[t.tipo_manutencao] || '#64748b' }} />
                      <span className="text-xs text-slate-600 flex-1">{TIPO_LABELS[t.tipo_manutencao] || t.tipo_manutencao}</span>
                      <span className="text-xs font-bold text-slate-800">{t.qtd}</span>
                      <span className="text-xs text-slate-400">{t.horas ?? 0}h</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Pendentes */}
              {dashboard?.ultimas?.length > 0 && (
                <div className="card">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Em Aberto
                  </p>
                  {dashboard.ultimas.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg" onClick={() => { setTab('registros'); setSelected(r); }}>
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: TIPO_COLORS[r.tipo_manutencao] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{r.maquina_nome}</p>
                        <p className="text-[10px] text-slate-400 truncate">{r.descricao}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[r.status]}`}>
                        {r.status === 'em_andamento' ? 'Andamento' : r.status === 'aberta' ? 'Aberta' : 'Concluída'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {(!dashboard?.ultimas || dashboard.ultimas.length === 0) && (
                <div className="card text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">Nenhuma manutenção em aberto</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB REGISTROS ══ */}
      {tab === 'registros' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
          <div className="card p-0 overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input className="input pl-9 py-2 text-sm" placeholder="Máquina, descrição ou técnico..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1 flex-wrap">
                {TIPOS_MANUT.map(t => (
                  <button key={t} onClick={() => setTipoFilter(tipoFilter === t ? '' : t)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${tipoFilter === t ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    style={tipoFilter === t ? { backgroundColor: TIPO_COLORS[t] } : {}}>
                    {TIPO_LABELS[t]}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {['aberta', 'em_andamento', 'concluida'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                    className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${statusFilter === s ? STATUS_COLORS[s] : 'bg-slate-100 text-slate-500'}`}>
                    {s === 'em_andamento' ? 'Andamento' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredReg.length === 0 && (
                <div className="px-4 py-16 text-center text-slate-400">
                  <Wrench className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="font-semibold">Nenhum registro encontrado</p>
                  <button className="btn-primary btn-sm mt-4" onClick={() => openNewReg()}><Plus className="w-3.5 h-3.5" />Registrar</button>
                </div>
              )}
              {filteredReg.map(r => {
                const isSelected = selected?.id === r.id;
                return (
                  <div key={r.id} onClick={() => setSelected(isSelected ? null : r)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-slate-50/60 border-l-2 border-transparent'}`}>
                    <div className="w-2.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: TIPO_COLORS[r.tipo_manutencao] || '#64748b' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{r.maquina_nome}</span>
                        <span className="font-mono text-[10px] text-slate-400">{r.maquina_codigo}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[r.status]}`}>
                          {r.status === 'em_andamento' ? 'Andamento' : r.status === 'aberta' ? 'Aberta' : 'Concluída'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-sm mt-0.5">{r.descricao}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                        <span>{r.data_inicio}</span>
                        {r.tecnico && <span>Técnico: {r.tecnico}</span>}
                        {r.horas_paradas && <span className="text-rose-500 font-semibold">{r.horas_paradas}h parado</span>}
                        {r.custo_total && <span className="text-amber-600 font-semibold">R$ {Number(r.custo_total).toFixed(2)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEditReg(r); }} className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); removeReg(r.id); }} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-300 flex-shrink-0 transition-transform ${isSelected ? 'rotate-90 text-indigo-400' : ''}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel detalhe */}
          <div>
            {selected ? (
              <div className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{selected.maquina_nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: TIPO_COLORS[selected.tipo_manutencao] }}>
                        {TIPO_LABELS[selected.tipo_manutencao]}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[selected.status]}`}>
                        {selected.status === 'em_andamento' ? 'Andamento' : selected.status === 'aberta' ? 'Aberta' : 'Concluída'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditReg(selected)} className="btn-secondary btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setSelected(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Descrição</p>
                  <p className="text-sm text-slate-700">{selected.descricao}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Início', selected.data_inicio],
                    ['Fim', selected.data_fim || '—'],
                    ['Técnico', selected.tecnico || '—'],
                    ['Setor', selected.setor || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-lg px-2.5 py-2">
                      <p className="text-[10px] text-slate-400">{k}</p>
                      <p className="text-xs font-semibold text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-xl p-3 text-center ${selected.horas_paradas > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50'}`}>
                    <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><Clock className="w-2.5 h-2.5" />Horas Paradas</p>
                    <p className={`text-2xl font-bold ${selected.horas_paradas > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{selected.horas_paradas || '—'}</p>
                    <p className="text-[10px] text-slate-400">horas</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${selected.custo_total > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                    <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><DollarSign className="w-2.5 h-2.5" />Custo</p>
                    <p className={`text-xl font-bold ${selected.custo_total > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {selected.custo_total ? `R$${Number(selected.custo_total).toFixed(2)}` : selected.custo_calculado ? `R$${Number(selected.custo_calculado).toFixed(2)}` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">{!selected.custo_total && selected.custo_calculado ? 'estimado' : 'registrado'}</p>
                  </div>
                </div>
                {selected.pecas_utilizadas && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Peças utilizadas</p>
                    <p className="text-xs text-slate-700">{selected.pecas_utilizadas}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card text-center py-8">
                <Wrench className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Clique em um registro para ver detalhes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB MÁQUINAS ══ */}
      {tab === 'maquinas' && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {maquinas.length === 0 && (
              <div className="px-4 py-16 text-center text-slate-400">
                <Settings className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="font-semibold">Nenhuma máquina cadastrada</p>
                <button className="btn-primary btn-sm mt-4" onClick={() => { setFormMaq({ ...emptyMaq }); setEditingMaq(null); setError(''); setModalMaq(true); }}>
                  <Plus className="w-3.5 h-3.5" />Cadastrar Máquina
                </button>
              </div>
            )}
            {maquinas.map(m => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${!m.ativo ? 'opacity-50' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.tipo === 'ferramenta' ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                  <Settings className={`w-4 h-4 ${m.tipo === 'ferramenta' ? 'text-amber-600' : 'text-indigo-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{m.nome}</span>
                    <span className="font-mono text-xs text-slate-400">{m.codigo}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold capitalize">{m.tipo}</span>
                    {!m.ativo && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-semibold">Inativo</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    {m.setor && <span>{m.setor}</span>}
                    {m.fabricante && <span>{m.fabricante} {m.modelo}</span>}
                    {m.custo_hora > 0 && <span className="text-amber-600 font-semibold">R$ {m.custo_hora}/h</span>}
                    <span className="text-slate-300">{registros.filter(r => r.maquina_id === m.id).length} registros</span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => openNewReg(m.id)} className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg transition-colors text-xs flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setFormMaq({ nome: m.nome, codigo: m.codigo, tipo: m.tipo, setor: m.setor || '', fabricante: m.fabricante || '', modelo: m.modelo || '', ano_fabricacao: m.ano_fabricacao ? String(m.ano_fabricacao) : '', custo_hora: String(m.custo_hora) }); setEditingMaq(m); setError(''); setModalMaq(true); }} className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => removeMaq(m.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Máquina ── */}
      {modalMaq && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalMaq(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900">{editingMaq ? 'Editar Máquina/Ferramenta' : 'Nova Máquina/Ferramenta'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Custo/hora utilizado para estimativa de custo de parada</p>
              </div>
              <button onClick={() => setModalMaq(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveMaq}>
              <div className="modal-body space-y-4">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nome *</label>
                    <input className="input" placeholder="ex: Laminador 01" value={formMaq.nome} onChange={e => setFormMaq(f => ({ ...f, nome: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Código *</label>
                    <input className="input font-mono" placeholder="ex: LAM-01" value={formMaq.codigo} onChange={e => setFormMaq(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} required />
                  </div>
                  <div>
                    <label className="label">Tipo</label>
                    <select className="select" value={formMaq.tipo} onChange={e => setFormMaq(f => ({ ...f, tipo: e.target.value }))}>
                      {TIPOS_MAQ.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Setor</label>
                    <input className="input" list="setores-list" value={formMaq.setor} onChange={e => setFormMaq(f => ({ ...f, setor: e.target.value }))} />
                    <datalist id="setores-list">{SETORES.map(s => <option key={s} value={s} />)}</datalist>
                  </div>
                  <div>
                    <label className="label">Fabricante</label>
                    <input className="input" value={formMaq.fabricante} onChange={e => setFormMaq(f => ({ ...f, fabricante: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Modelo</label>
                    <input className="input" value={formMaq.modelo} onChange={e => setFormMaq(f => ({ ...f, modelo: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Ano de Fabricação</label>
                    <input type="number" min="1900" max="2030" className="input" value={formMaq.ano_fabricacao} onChange={e => setFormMaq(f => ({ ...f, ano_fabricacao: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Custo/hora (R$) *</label>
                    <input type="number" step="0.01" min="0" className="input" placeholder="0.00" value={formMaq.custo_hora} onChange={e => setFormMaq(f => ({ ...f, custo_hora: e.target.value }))} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalMaq(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : <><Check className="w-4 h-4" />{editingMaq ? 'Salvar' : 'Cadastrar'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Registro ── */}
      {modalReg && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalReg(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900">{editingReg ? 'Editar Registro' : 'Nova Manutenção'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Registre corretiva, preventiva, preditiva ou melhoria</p>
              </div>
              <button onClick={() => setModalReg(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveReg}>
              <div className="modal-body space-y-4">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Máquina/Ferramenta *</label>
                    <select className="select" value={formReg.maquina_id} onChange={e => setFormReg(f => ({ ...f, maquina_id: e.target.value }))} required>
                      <option value="">Selecione...</option>
                      {maqAtivas.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.codigo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Tipo</label>
                    <div className="grid grid-cols-2 gap-1">
                      {TIPOS_MANUT.map(t => (
                        <button key={t} type="button" onClick={() => setFormReg(f => ({ ...f, tipo_manutencao: t }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border-2 transition-all ${formReg.tipo_manutencao === t ? 'text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                          style={formReg.tipo_manutencao === t ? { backgroundColor: TIPO_COLORS[t] } : {}}>
                          {TIPO_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Data Início *</label>
                    <input type="date" className="input" value={formReg.data_inicio} onChange={e => setFormReg(f => ({ ...f, data_inicio: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Data Fim</label>
                    <input type="date" className="input" value={formReg.data_fim} onChange={e => setFormReg(f => ({ ...f, data_fim: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Horas Paradas</label>
                    <input type="number" step="0.5" min="0" className="input" placeholder="0.0" value={formReg.horas_paradas} onChange={e => setFormReg(f => ({ ...f, horas_paradas: e.target.value }))} />
                    {custoEstimado && <p className="text-[10px] text-amber-600 mt-1 font-semibold">Custo estimado: R$ {custoEstimado}</p>}
                  </div>
                  <div>
                    <label className="label">Custo Real (R$)</label>
                    <input type="number" step="0.01" min="0" className="input" placeholder="deixe vazio para usar estimado" value={formReg.custo_total} onChange={e => setFormReg(f => ({ ...f, custo_total: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Técnico Responsável</label>
                    <input className="input" placeholder="Nome do técnico" value={formReg.tecnico} onChange={e => setFormReg(f => ({ ...f, tecnico: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="select" value={formReg.status} onChange={e => setFormReg(f => ({ ...f, status: e.target.value }))}>
                      <option value="aberta">Aberta</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Descrição do Serviço *</label>
                  <textarea className="input resize-none" rows={3} placeholder="Descreva o problema, serviço realizado ou melhoria aplicada..." value={formReg.descricao} onChange={e => setFormReg(f => ({ ...f, descricao: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Peças / Materiais Utilizados</label>
                  <input className="input" placeholder="ex: Rolamento 6205, Correia B-68, Óleo 10W40..." value={formReg.pecas_utilizadas} onChange={e => setFormReg(f => ({ ...f, pecas_utilizadas: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalReg(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : <><Check className="w-4 h-4" />{editingReg ? 'Salvar' : 'Registrar'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
