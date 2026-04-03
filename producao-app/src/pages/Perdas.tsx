import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import {
  Plus, Trash2, X, Check, RefreshCw, AlertCircle,
  TrendingDown, Scale, BarChart2, ChevronRight, AlertTriangle,
  Calendar, Filter,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const TIPOS = ['Pedaços', 'Chapas', 'Refilagem', 'Refugo', 'Outros'];
const CORES: Record<string, string> = {
  Pedaços:  '#ef4444',
  Chapas:   '#f59e0b',
  Refilagem:'#8b5cf6',
  Refugo:   '#ec4899',
  Outros:   '#64748b',
};

function perdaColor(pct: number) {
  if (pct > 15) return 'text-rose-600 bg-rose-50';
  if (pct > 8)  return 'text-amber-600 bg-amber-50';
  return 'text-emerald-600 bg-emerald-50';
}

export default function Perdas() {
  const [perdas,    setPerdas]    = useState<any[]>([]);
  const [relatorio, setRelatorio] = useState<any>(null);
  const [ordens,    setOrdens]    = useState<any[]>([]);
  const [modal,     setModal]     = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim,    setDataFim]   = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [selected,  setSelected]  = useState<any | null>(null);
  const [form, setForm] = useState({
    os_id: '', tipo_perda: 'Pedaços', peso_bruto: '', peso_liquido: '', observacoes: '',
  });

  const loadRelatorio = () => {
    const p: string[] = [];
    if (dataInicio) p.push(`data_inicio=${dataInicio}`);
    if (dataFim)    p.push(`data_fim=${dataFim}`);
    api.get('/perdas/relatorio' + (p.length ? '?' + p.join('&') : '')).then(setRelatorio).catch(() => {});
  };

  const load = () => {
    api.get('/perdas').then(setPerdas).catch(() => {});
    loadRelatorio();
  };
  useEffect(() => {
    load();
    api.get('/producao/os').then(d => setOrdens(d.filter((o: any) => o.status !== 'cancelada'))).catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.post('/perdas', {
        ...form,
        os_id: parseInt(form.os_id),
        peso_bruto: parseFloat(form.peso_bruto),
        peso_liquido: parseFloat(form.peso_liquido),
      });
      setModal(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await api.delete(`/perdas/${id}`); load();
    if (selected?.id === id) setSelected(null);
  };

  const perdaKg  = form.peso_bruto && form.peso_liquido ? parseFloat(form.peso_bruto) - parseFloat(form.peso_liquido) : null;
  const perdaPct = perdaKg !== null && form.peso_bruto ? ((perdaKg / parseFloat(form.peso_bruto)) * 100).toFixed(1) : null;

  const filtered = useMemo(() =>
    perdas.filter(p => !tipoFilter || p.tipo_perda === tipoFilter),
    [perdas, tipoFilter]);

  const pieData = relatorio?.resumo_por_tipo ?? [];

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestão de Perdas</h1>
          <p className="page-subtitle">Controle de peso bruto, líquido e rendimento por OS</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" className="input py-2 text-sm" style={{ maxWidth: 150 }} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          <span className="text-slate-400 text-sm">até</span>
          <input type="date" className="input py-2 text-sm" style={{ maxWidth: 150 }} value={dataFim} onChange={e => setDataFim(e.target.value)} />
          <button className="btn-secondary" onClick={loadRelatorio}><RefreshCw className="w-4 h-4" />Filtrar</button>
          <button className="btn-primary" onClick={() => { setForm({ os_id: '', tipo_perda: 'Pedaços', peso_bruto: '', peso_liquido: '', observacoes: '' }); setError(''); setModal(true); }}>
            <Plus className="w-4 h-4" />Registrar Perda
          </button>
        </div>
      </div>

      {/* KPIs */}
      {relatorio?.totais && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Peso Bruto',   value: `${relatorio.totais.total_bruto_kg ?? 0}`,   unit: 'kg', color: 'border-l-slate-400',    text: 'text-slate-900' },
            { label: 'Peso Líquido', value: `${relatorio.totais.total_liquido_kg ?? 0}`,  unit: 'kg', color: 'border-l-emerald-500', text: 'text-emerald-700' },
            { label: 'Total Perdas', value: `${relatorio.totais.total_perda_kg ?? 0}`,    unit: 'kg', color: 'border-l-rose-500',    text: 'text-rose-600' },
            { label: 'Perda Média',  value: `${relatorio.totais.media_perda_pct ?? 0}`,   unit: '%',  color: 'border-l-amber-500',   text: 'text-amber-600' },
          ].map(k => (
            <div key={k.label} className={`card border-l-4 ${k.color} py-4`}>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.text}`}>{k.value} <span className="text-sm font-normal text-slate-400">{k.unit}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Main 2-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ── Lista de registros ── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <button onClick={() => setTipoFilter('')} className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${!tipoFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Todos
              </button>
              {TIPOS.map(t => (
                <button key={t} onClick={() => setTipoFilter(tipoFilter === t ? '' : t)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${tipoFilter === t ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={tipoFilter === t ? { backgroundColor: CORES[t] } : {}}>
                  {t}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <div className="px-4 py-16 text-center text-slate-400">
                <TrendingDown className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="font-semibold">Nenhum registro de perda</p>
                <button className="btn-primary btn-sm mt-4" onClick={() => setModal(true)}>
                  <Plus className="w-3.5 h-3.5" />Registrar Perda
                </button>
              </div>
            )}
            {filtered.map(p => {
              const isSelected = selected?.id === p.id;
              const pct = Number(p.perda_percentual);
              return (
                <div key={p.id}
                  onClick={() => setSelected(isSelected ? null : p)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-slate-50/60 border-l-2 border-transparent'}`}>
                  <div className="w-2.5 h-9 rounded-full flex-shrink-0" style={{ backgroundColor: CORES[p.tipo_perda] || '#64748b' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 text-xs">{p.os_numero}</span>
                      <span className="text-xs text-slate-600 font-medium truncate">{p.cliente_nome}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: CORES[p.tipo_perda] + '20', color: CORES[p.tipo_perda] }}>
                        {p.tipo_perda}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <span>Bruto: <span className="text-slate-600 font-medium">{p.peso_bruto} kg</span></span>
                      <span>Líquido: <span className="text-emerald-600 font-medium">{p.peso_liquido} kg</span></span>
                      <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{p.data_registro}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`text-center px-2.5 py-1 rounded-lg ${perdaColor(pct)}`}>
                      <p className="text-base font-bold leading-tight">{p.perda_kg}</p>
                      <p className="text-[10px] font-semibold">{pct}%</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); remove(p.id); }} className="p-1.5 text-slate-200 hover:text-rose-500 transition-colors rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isSelected ? 'rotate-90 text-indigo-400' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          {selected ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-slate-800">Detalhe da Perda</p>
                <button onClick={() => setSelected(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  ['OS', selected.os_numero],
                  ['Cliente', selected.cliente_nome],
                  ['Tipo', selected.tipo_perda],
                  ['Data', selected.data_registro],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400">Bruto</p>
                  <p className="text-lg font-bold text-slate-700">{selected.peso_bruto}</p>
                  <p className="text-[10px] text-slate-400">kg</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-emerald-400">Líquido</p>
                  <p className="text-lg font-bold text-emerald-700">{selected.peso_liquido}</p>
                  <p className="text-[10px] text-emerald-400">kg</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${perdaColor(Number(selected.perda_percentual))}`}>
                  <p className="text-[10px]">Perda</p>
                  <p className="text-lg font-bold">{selected.perda_kg}</p>
                  <p className="text-[10px]">{selected.perda_percentual}%</p>
                </div>
              </div>
              {selected.observacoes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 mb-1">Observações</p>
                  <p className="text-xs text-slate-700">{selected.observacoes}</p>
                </div>
              )}
              {Number(selected.perda_percentual) > 15 && (
                <div className="flex items-start gap-2 mt-3 p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700">Perda acima de 15% — verificar processo</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Gráfico de pizza por tipo */}
              {pieData.length > 0 ? (
                <div className="card">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5" />Distribuição por Tipo
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="total_perda_kg" nameKey="tipo_perda" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                        {pieData.map((d: any) => <Cell key={d.tipo_perda} fill={CORES[d.tipo_perda] || '#64748b'} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                        formatter={(v: any) => [`${v} kg`, 'Perda']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {pieData.map((d: any, i: number) => (
                      <div key={d.tipo_perda} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CORES[d.tipo_perda] || '#64748b' }} />
                        <span className="text-xs text-slate-600 flex-1">{d.tipo_perda}</span>
                        <span className="text-xs font-bold text-slate-800">{d.total_perda_kg} kg</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${perdaColor(Number(d.media_perda_pct))}`}>{d.media_perda_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card text-center py-8">
                  <Scale className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Sem dados no período</p>
                </div>
              )}

              {/* Alertas */}
              {relatorio?.totais?.media_perda_pct > 10 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Perda média elevada</p>
                    <p className="text-xs text-amber-700 mt-0.5">Média de {relatorio.totais.media_perda_pct}% — meta recomendada: &lt;8%</p>
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-slate-400 py-2">← Clique em um registro para detalhes</p>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900">Registrar Perda</h2>
                <p className="text-xs text-slate-400 mt-0.5">A perda é calculada automaticamente</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body space-y-4">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

                <div>
                  <label className="label">Ordem de Serviço *</label>
                  <select className="select" value={form.os_id} onChange={e => setForm(f => ({ ...f, os_id: e.target.value }))} required>
                    <option value="">Selecione a OS...</option>
                    {ordens.map(o => <option key={o.id} value={o.id}>{o.numero} — {o.cliente_nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Tipo de Perda *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIPOS.map(t => (
                      <button key={t} type="button"
                        onClick={() => setForm(f => ({ ...f, tipo_perda: t }))}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${form.tipo_perda === t ? 'text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                        style={form.tipo_perda === t ? { backgroundColor: CORES[t], borderColor: CORES[t] } : {}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Peso Bruto (kg) *</label>
                    <input type="number" step="0.001" className="input" placeholder="ex: 150.000" value={form.peso_bruto} onChange={e => setForm(f => ({ ...f, peso_bruto: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Peso Líquido (kg) *</label>
                    <input type="number" step="0.001" className="input" placeholder="ex: 138.500" value={form.peso_liquido} onChange={e => setForm(f => ({ ...f, peso_liquido: e.target.value }))} required />
                  </div>
                </div>

                {perdaKg !== null && perdaKg >= 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-rose-400 mb-1">Perda em Kg</p>
                      <p className="text-2xl font-bold text-rose-600">{perdaKg.toFixed(3)}</p>
                      <p className="text-xs text-rose-400">kg</p>
                    </div>
                    <div className={`border rounded-xl p-3 text-center ${Number(perdaPct) > 15 ? 'bg-rose-50 border-rose-200' : Number(perdaPct) > 8 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <p className="text-xs text-slate-400 mb-1">Percentual</p>
                      <p className={`text-2xl font-bold ${Number(perdaPct) > 15 ? 'text-rose-600' : Number(perdaPct) > 8 ? 'text-amber-600' : 'text-emerald-600'}`}>{perdaPct}</p>
                      <p className="text-xs text-slate-400">%</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Observações</label>
                  <textarea className="input resize-none" rows={2} placeholder="Causa da perda, material envolvido..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : <><Check className="w-4 h-4" />Registrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
