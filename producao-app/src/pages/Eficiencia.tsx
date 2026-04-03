import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts';
import {
  RefreshCw, TrendingUp, Award, Clock, Scale, Activity,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react';

const OP_COLORS: Record<string, string> = {
  'Desbaste':  '#6366f1',
  'Laminação': '#8b5cf6',
  'Corte':     '#f59e0b',
  'Expedição': '#10b981',
};
const CORES = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

function TrendIcon({ value, ref: refVal }: { value: number; ref: number }) {
  if (!refVal) return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  if (value > refVal * 1.05) return <ChevronUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (value < refVal * 0.95) return <ChevronDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

export default function Eficiencia() {
  const [data,      setData]      = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim,    setDataFim]   = useState('');
  const [opFilter,   setOpFilter]  = useState('');
  const [rankView,   setRankView]  = useState<'kg_hora' | 'peso'>('kg_hora');

  const load = () => {
    setLoading(true);
    const p: string[] = [];
    if (dataInicio) p.push(`data_inicio=${dataInicio}`);
    if (dataFim)    p.push(`data_fim=${dataFim}`);
    api.get('/lancamentos/eficiencia' + (p.length ? '?' + p.join('&') : ''))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredOS = useMemo(() =>
    (data?.eficiencia_por_os ?? []).filter((r: any) => !opFilter || r.operacao === opFilter),
    [data, opFilter]);

  const rankingOS = useMemo(() =>
    [...filteredOS]
      .filter((r: any) => r.kg_por_hora > 0)
      .sort((a: any, b: any) => rankView === 'kg_hora'
        ? (b.kg_por_hora - a.kg_por_hora)
        : (b.peso_kg - a.peso_kg))
      .slice(0, 10),
    [filteredOS, rankView]);

  const maxKgH = rankingOS.length > 0 ? rankingOS[0][rankView === 'kg_hora' ? 'kg_por_hora' : 'peso_kg'] : 1;

  const operacoes = useMemo(() =>
    [...new Set((data?.eficiencia_por_os ?? []).map((r: any) => r.operacao))],
    [data]);

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Eficiência Operacional</h1>
          <p className="page-subtitle">kg/hora por operação · ranking de OS · análise de produtividade</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" className="input py-2 text-sm" style={{ maxWidth: 150 }} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          <span className="text-slate-400 text-sm">até</span>
          <input type="date" className="input py-2 text-sm" style={{ maxWidth: 150 }} value={dataFim} onChange={e => setDataFim(e.target.value)} />
          <button className="btn-primary" onClick={load}><RefreshCw className="w-4 h-4" />Filtrar</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Calculando eficiência...</span>
        </div>
      ) : !data || data.eficiencia_por_operacao.length === 0 ? (
        <div className="card text-center py-16">
          <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Nenhum dado para o período selecionado</p>
          <p className="text-xs text-slate-400 mt-1">Adicione lançamentos de produção para visualizar a eficiência</p>
        </div>
      ) : (
        <>
          {/* KPI cards por operação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.eficiencia_por_operacao.map((op: any, i: number) => {
              const color = OP_COLORS[op.operacao] || CORES[i];
              return (
                <div key={op.operacao} className="card border-t-4 cursor-pointer transition-shadow hover:shadow-md"
                  style={{ borderTopColor: color }}
                  onClick={() => setOpFilter(opFilter === op.operacao ? '' : op.operacao)}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{op.operacao}</p>
                    <TrendIcon value={op.kg_por_hora} ref={10} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 leading-tight">{op.kg_por_hora ?? '—'}</p>
                  <p className="text-xs text-slate-400 mb-4">kg / hora</p>
                  <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400 flex items-center gap-1"><Scale className="w-2.5 h-2.5" />Peso</span>
                      <span className="font-semibold text-slate-700">{op.total_peso_kg?.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Horas</span>
                      <span className="font-semibold text-slate-700">{op.total_horas?.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">OS</span>
                      <span className="font-semibold text-slate-700">{op.total_os}</span>
                    </div>
                  </div>
                  {opFilter === op.operacao && (
                    <p className="text-[10px] text-indigo-500 font-semibold mt-2 text-center">Filtrado</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Main 2-col */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">

            {/* ── Gráfico ── */}
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  <h2 className="font-bold text-slate-900">kg/h por Operação</h2>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.eficiencia_por_operacao} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="operacao" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit=" kg/h" />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, color: '#f8fafc', fontSize: 13 }}
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(v: any) => [`${v} kg/h`, 'Eficiência']}
                    />
                    <Bar dataKey="kg_por_hora" radius={[6, 6, 0, 0]} maxBarSize={70}>
                      {data.eficiencia_por_operacao.map((e: any, i: number) => (
                        <Cell key={i} fill={OP_COLORS[e.operacao] || CORES[i % CORES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela detalhada */}
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <p className="font-semibold text-slate-800 text-sm flex-1">Detalhe por OS e Operação</p>
                  <div className="flex gap-1">
                    {operacoes.map(op => (
                      <button key={op as string} onClick={() => setOpFilter(opFilter === op ? '' : op as string)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${opFilter === op ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        style={opFilter === op ? { backgroundColor: OP_COLORS[op as string] || '#6366f1' } : {}}>
                        {op as string}
                      </button>
                    ))}
                    {opFilter && <button onClick={() => setOpFilter('')} className="text-xs px-2 py-1 text-slate-400 hover:text-slate-600">✕</button>}
                  </div>
                  <span className="text-xs text-slate-400">{filteredOS.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold">
                        <th className="px-4 py-2.5 text-left">OS</th>
                        <th className="px-3 py-2.5 text-left">Cliente</th>
                        <th className="px-3 py-2.5 text-left">Operação</th>
                        <th className="px-3 py-2.5 text-right">Horas</th>
                        <th className="px-3 py-2.5 text-right">Peso (kg)</th>
                        <th className="px-3 py-2.5 text-right">kg/h</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredOS.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sem dados</td></tr>
                      ) : filteredOS.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-bold text-indigo-600">{row.numero}</td>
                          <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate">{row.cliente}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: OP_COLORS[row.operacao] || '#6366f1' }}>
                              {row.operacao}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{row.horas?.toFixed(1)}h</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{row.peso_kg?.toFixed(3)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-bold text-emerald-700">{row.kg_por_hora ?? '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Ranking Panel ── */}
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-amber-500" />
                  <p className="font-bold text-slate-800 flex-1">Ranking OS</p>
                  <div className="flex gap-1">
                    <button onClick={() => setRankView('kg_hora')}
                      className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${rankView === 'kg_hora' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      kg/h
                    </button>
                    <button onClick={() => setRankView('peso')}
                      className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${rankView === 'peso' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      Peso
                    </button>
                  </div>
                </div>
                {rankingOS.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sem dados suficientes</p>
                ) : rankingOS.map((row: any, i: number) => {
                  const value = rankView === 'kg_hora' ? row.kg_por_hora : row.peso_kg?.toFixed(1);
                  const barPct = maxKgH > 0 ? ((rankView === 'kg_hora' ? row.kg_por_hora : row.peso_kg) / maxKgH * 100).toFixed(0) : 0;
                  const medalColor = i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-200';
                  return (
                    <div key={i} className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${medalColor}`}>{i + 1}</span>
                        <span className="font-mono text-xs font-bold text-indigo-600">{row.numero}</span>
                        <span className="text-xs text-slate-500 truncate flex-1">{row.cliente}</span>
                        <span className="text-xs font-bold text-slate-800">{value} <span className="text-slate-400 font-normal text-[10px]">{rankView === 'kg_hora' ? 'kg/h' : 'kg'}</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full ml-7">
                        <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: OP_COLORS[row.operacao] || '#6366f1' }} />
                      </div>
                      <p className="text-[10px] text-slate-400 ml-7 mt-0.5">{row.operacao}</p>
                    </div>
                  );
                })}
              </div>

              {/* Benchmark */}
              {data.eficiencia_por_operacao.length > 0 && (
                <div className="card bg-slate-900 text-white">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Melhores Índices</p>
                  {data.eficiencia_por_operacao
                    .filter((op: any) => op.kg_por_hora > 0)
                    .sort((a: any, b: any) => b.kg_por_hora - a.kg_por_hora)
                    .map((op: any, i: number) => (
                      <div key={op.operacao} className="flex items-center gap-2 py-1.5 border-b border-white/10 last:border-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: OP_COLORS[op.operacao] || CORES[i] }} />
                        <span className="text-xs text-slate-300 flex-1">{op.operacao}</span>
                        <span className="text-sm font-bold text-white">{op.kg_por_hora}</span>
                        <span className="text-xs text-slate-400">kg/h</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
