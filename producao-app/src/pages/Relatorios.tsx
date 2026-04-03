import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import {
  Trophy, TrendingUp, Zap, RefreshCw, Filter,
  Medal, BarChart2, Package, Users, Calendar,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react';

const OPERACOES = ['Desbaste', 'Laminação', 'Corte', 'Expedição'];
const OP_COLOR: Record<string, string> = {
  Desbaste: '#6366f1', Laminação: '#8b5cf6', Corte: '#f59e0b', Expedição: '#10b981',
};
const TABS = [
  { id: 'ranking-os',       label: 'Ranking OS',       icon: Trophy },
  { id: 'ranking-produto',  label: 'Combinações',       icon: Package },
  { id: 'ranking-operacao', label: 'Por Operação',      icon: Zap },
  { id: 'ranking-operador', label: 'Por Operador',      icon: Users },
  { id: 'evolucao',         label: 'Evolução Diária',   icon: Calendar },
] as const;

type TabId = typeof TABS[number]['id'];

const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#cd7c2f'];

function MedalIcon({ pos }: { pos: number }) {
  if (pos > 3) return <span className="text-slate-300 font-bold text-sm w-6 text-center">{pos}</span>;
  return <Medal className="w-5 h-5 flex-shrink-0" style={{ color: MEDAL_COLORS[pos - 1] }} />;
}

function KghBadge({ v, max }: { v: number; max: number }) {
  const pct = max > 0 ? (v / max) * 100 : 0;
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="font-bold text-slate-800 w-12 text-right">{v}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Relatorios() {
  const [tab, setTab] = useState<TabId>('ranking-os');
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<any>(null);

  const [rankingOS, setRankingOS] = useState<any[]>([]);
  const [rankingProd, setRankingProd] = useState<any[]>([]);
  const [rankingOp, setRankingOp] = useState<any[]>([]);
  const [rankingOper, setRankingOper] = useState<any[]>([]);
  const [evolucao, setEvolucao] = useState<any[]>([]);

  const [filtroOp, setFiltroOp] = useState('');
  const [diasEvolucao, setDiasEvolucao] = useState('30');
  const [sortOS, setSortOS] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'kg_por_hora', dir: 'desc' });

  const loadResumo = () => api.get('/relatorios/resumo').then(setResumo).catch(() => null);

  const loadTab = async (t: TabId) => {
    setLoading(true);
    try {
      if (t === 'ranking-os') {
        const q = filtroOp ? `?operacao=${filtroOp}` : '';
        setRankingOS(await api.get(`/relatorios/ranking-os${q}`));
      } else if (t === 'ranking-produto') {
        setRankingProd(await api.get('/relatorios/ranking-produto'));
      } else if (t === 'ranking-operacao') {
        setRankingOp(await api.get('/relatorios/ranking-operacao'));
      } else if (t === 'ranking-operador') {
        setRankingOper(await api.get('/relatorios/ranking-operador'));
      } else if (t === 'evolucao') {
        setEvolucao(await api.get(`/relatorios/evolucao?dias=${diasEvolucao}`));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadResumo(); loadTab(tab); }, []);

  const changeTab = (t: TabId) => { setTab(t); loadTab(t); };

  // Ranking OS com sort
  const sortedOS = useMemo(() => {
    return [...rankingOS].sort((a, b) => {
      const av = a[sortOS.col] ?? 0, bv = b[sortOS.col] ?? 0;
      return sortOS.dir === 'desc' ? bv - av : av - bv;
    });
  }, [rankingOS, sortOS]);

  const maxKghOS   = Math.max(...rankingOS.map(r => r.kg_por_hora || 0), 0.01);
  const maxKghProd = Math.max(...rankingProd.map(r => r.kg_por_hora || 0), 0.01);
  const maxKghOper = Math.max(...rankingOper.map(r => r.kg_por_hora || 0), 0.01);

  const sortCol = (col: string) => {
    setSortOS(s => s.col === col ? { col, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortOS.col !== col) return <Minus className="w-3 h-3 text-slate-300" />;
    return sortOS.dir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  // Dados de evolução agrupados por data (soma de todas operações)
  const evolucaoDates = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of evolucao) {
      if (!map[r.data]) map[r.data] = { data: r.data };
      map[r.data][r.operacao] = r.kg_por_hora;
      map[r.data][`peso_${r.operacao}`] = r.peso;
    }
    return Object.values(map).sort((a: any, b: any) => a.data.localeCompare(b.data));
  }, [evolucao]);

  // Dados radar para operações
  const radarData = rankingOp.map(op => ({
    operacao: op.operacao,
    kg_hora: op.kg_por_hora || 0,
    horas: op.total_horas || 0,
    peso: op.total_peso || 0,
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios e Rankings</h1>
          <p className="page-subtitle">Análise de eficiência, combinações de produtos e desempenho</p>
        </div>
        <button className="btn-secondary" onClick={() => { loadResumo(); loadTab(tab); }}>
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* KPIs resumo */}
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'OS Analisadas',    value: resumo.total_os,             unit: '',      color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Lançamentos',      value: resumo.total_lancamentos,    unit: '',      color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Horas Totais',     value: `${resumo.total_horas ?? 0}h`, unit: '',   color: 'text-amber-600',  bg: 'bg-amber-50' },
            { label: 'Peso Total',       value: `${Number(resumo.total_peso ?? 0).toFixed(0)} kg`, unit: '', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Eficiência Geral', value: resumo.kg_por_hora_geral,    unit: 'kg/h', color: 'text-rose-600',   bg: 'bg-rose-50' },
          ].map(k => (
            <div key={k.label} className="card py-4">
              <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
                <BarChart2 className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value ?? '—'} <span className="text-sm font-normal text-slate-400">{k.unit}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {resumo?.melhor_os && (
        <div className="card bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 flex items-center gap-4 py-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider">Melhor OS em kg/h</p>
            <p className="font-bold text-amber-900 text-lg font-mono">{resumo.melhor_os.numero}</p>
          </div>
          <div className="ml-2">
            <p className="text-xs text-amber-500">Cliente</p>
            <p className="font-semibold text-amber-800">{resumo.melhor_os.cliente}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold text-amber-700">{resumo.melhor_os.kg_por_hora}</p>
            <p className="text-xs text-amber-500">kg/hora</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-full overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => changeTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center
              ${tab === id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Carregando dados...
        </div>
      )}

      {/* ── TAB: Ranking OS ── */}
      {!loading && tab === 'ranking-os' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">Filtrar por operação:</span>
            {['', ...OPERACOES].map(op => (
              <button key={op} onClick={() => { setFiltroOp(op); setTimeout(() => loadTab('ranking-os'), 50); }}
                className={`btn btn-sm ${filtroOp === op ? 'btn-primary' : 'btn-secondary'}`}>
                {op || 'Todas'}
              </button>
            ))}
          </div>

          {/* Top 3 cards */}
          {sortedOS.length >= 3 && (
            <div className="grid grid-cols-3 gap-4">
              {[1, 0, 2].map((idx, rank) => {
                const os = sortedOS[idx];
                if (!os) return null;
                const realRank = idx + 1;
                const sizes = ['text-xl', 'text-2xl', 'text-lg'];
                const heights = ['h-28', 'h-36', 'h-24'];
                return (
                  <div key={os.id} className={`card ${realRank === 1 ? 'border-2 border-amber-300 bg-gradient-to-b from-amber-50' : ''} flex flex-col items-center justify-center ${heights[rank]} text-center`}>
                    <MedalIcon pos={realRank} />
                    <p className="font-mono font-bold text-indigo-600 text-sm mt-1">{os.numero}</p>
                    <p className="text-xs text-slate-500 truncate max-w-full px-2">{os.cliente}</p>
                    <p className={`font-bold text-emerald-700 mt-1 ${sizes[rank]}`}>{os.kg_por_hora} <span className="text-xs font-normal">kg/h</span></p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gráfico */}
          {sortedOS.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" />Top {Math.min(sortedOS.length, 15)} OS — kg/hora</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sortedOS.slice(0, 15)} layout="vertical" margin={{ left: 80, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="numero" tick={{ fontSize: 11, fill: '#6366f1', fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg/h`, 'Eficiência']} />
                  <Bar dataKey="kg_por_hora" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {sortedOS.slice(0, 15).map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#6366f1'} opacity={1 - i * 0.04} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela completa */}
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4">Tabela completa</h3>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th w-8">#</th>
                    <th className="th">OS</th>
                    <th className="th">Cliente</th>
                    <th className="th">Liga</th>
                    <th className="th text-right cursor-pointer select-none" onClick={() => sortCol('corte_mm')}>
                      <span className="flex items-center justify-end gap-1">Corte<SortIcon col="corte_mm" /></span>
                    </th>
                    <th className="th text-right cursor-pointer select-none" onClick={() => sortCol('total_horas')}>
                      <span className="flex items-center justify-end gap-1">Horas<SortIcon col="total_horas" /></span>
                    </th>
                    <th className="th text-right cursor-pointer select-none" onClick={() => sortCol('total_peso_produzido')}>
                      <span className="flex items-center justify-end gap-1">Peso<SortIcon col="total_peso_produzido" /></span>
                    </th>
                    <th className="th text-right cursor-pointer select-none" onClick={() => sortCol('kg_por_hora')}>
                      <span className="flex items-center justify-end gap-1">kg/h<SortIcon col="kg_por_hora" /></span>
                    </th>
                    <th className="th">Operações</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOS.map((os, i) => (
                    <tr key={os.id} className={i < 3 ? 'bg-amber-50/40' : ''}>
                      <td className="td"><MedalIcon pos={i + 1} /></td>
                      <td className="td font-mono text-xs text-indigo-600 font-bold">{os.numero}</td>
                      <td className="td text-slate-700 max-w-[120px] truncate">{os.cliente}</td>
                      <td className="td">{os.liga ? <span className="badge-purple text-xs">{os.liga}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="td text-right text-slate-500 text-xs">{os.corte_mm ? `${os.corte_mm}mm` : '—'}</td>
                      <td className="td text-right text-slate-600">{os.total_horas}h</td>
                      <td className="td text-right text-slate-600">{Number(os.total_peso_produzido).toFixed(3)} kg</td>
                      <td className="td text-right">
                        <KghBadge v={os.kg_por_hora} max={maxKghOS} />
                      </td>
                      <td className="td">
                        <div className="flex gap-1 flex-wrap">
                          {os.operacoes?.split(',').map((op: string) => (
                            <span key={op} className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: (OP_COLOR[op.trim()] || '#64748b') + '20', color: OP_COLOR[op.trim()] || '#64748b' }}>{op.trim()}</span>
                          ))}
                        </div>
                      </td>
                      <td className="td">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${os.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : os.status === 'em_producao' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {os.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sortedOS.length === 0 && <tr><td colSpan={10} className="td text-center text-slate-400 py-12">Nenhum dado disponível</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Combinações de produto ── */}
      {!loading && tab === 'ranking-produto' && (
        <div className="space-y-4">
          {rankingProd.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-purple-500" />Top combinações de produto — kg/hora</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={rankingProd.slice(0, 12)} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey={(r) => `${r.liga}\n${r.espessura}×${r.corte_mm}mm`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg/h`, 'Eficiência']}
                    labelFormatter={(_: any, pl: any) => pl?.[0]?.payload ? `Liga ${pl[0].payload.liga} — ${pl[0].payload.espessura}×${pl[0].payload.corte_mm}mm` : ''} />
                  <Bar dataKey="kg_por_hora" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {rankingProd.slice(0, 12).map((_: any, i: number) => (
                      <Cell key={i} fill={['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'][i % 6]} opacity={1 - i * 0.06} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4">Ranking por combinação de produto</h3>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th w-8">#</th>
                    <th className="th">Liga</th>
                    <th className="th text-right">Largura</th>
                    <th className="th text-right">Espessura</th>
                    <th className="th text-right">Corte</th>
                    <th className="th text-right">Desbaste</th>
                    <th className="th">Tempera</th>
                    <th className="th text-right">OS</th>
                    <th className="th text-right">Horas</th>
                    <th className="th text-right">Peso</th>
                    <th className="th text-right">kg/h</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingProd.map((r, i) => (
                    <tr key={i} className={i < 3 ? 'bg-purple-50/40' : ''}>
                      <td className="td"><MedalIcon pos={i + 1} /></td>
                      <td className="td"><span className="badge-purple font-mono font-bold">{r.liga}</span></td>
                      <td className="td text-right text-slate-600 text-xs">{r.largura}mm</td>
                      <td className="td text-right text-slate-600 text-xs">{r.espessura}mm</td>
                      <td className="td text-right text-slate-600 text-xs">{r.corte_mm ? `${r.corte_mm}mm` : '—'}</td>
                      <td className="td text-right text-slate-600 text-xs">{r.desbaste_mm ? `${r.desbaste_mm}mm` : '—'}</td>
                      <td className="td">{r.tempera ? <span className="badge-gray font-mono text-xs">{r.tempera}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="td text-right text-slate-600">{r.total_os}</td>
                      <td className="td text-right text-slate-600">{r.total_horas}h</td>
                      <td className="td text-right text-slate-600">{Number(r.total_peso).toFixed(3)} kg</td>
                      <td className="td text-right"><KghBadge v={r.kg_por_hora} max={maxKghProd} /></td>
                    </tr>
                  ))}
                  {rankingProd.length === 0 && <tr><td colSpan={11} className="td text-center text-slate-400 py-12">Nenhum dado — cadastre OS com chapa vinculada</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Por Operação ── */}
      {!loading && tab === 'ranking-operacao' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rankingOp.map((op, i) => (
              <div key={op.operacao} className="card border-t-4" style={{ borderTopColor: OP_COLOR[op.operacao] || '#64748b' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: OP_COLOR[op.operacao] }}>{op.operacao}</p>
                <p className="text-4xl font-bold text-slate-900">{op.kg_por_hora ?? '—'}</p>
                <p className="text-xs text-slate-400 mb-4">kg/hora (média)</p>
                <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between"><span className="text-slate-400">Horas totais</span><span className="font-semibold">{op.total_horas}h</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Peso total</span><span className="font-semibold">{Number(op.total_peso).toFixed(1)} kg</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">OS distintas</span><span className="font-semibold">{op.total_os}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Lançamentos</span><span className="font-semibold">{op.total_lancamentos}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="text-slate-400">Min / Máx kg/h</span>
                    <span className="font-semibold">{op.kg_por_hora_min} / {op.kg_por_hora_max}</span>
                  </div>
                </div>
              </div>
            ))}
            {rankingOp.length === 0 && <div className="col-span-4 card text-center text-slate-400 py-12">Nenhum dado disponível</div>}
          </div>

          {radarData.length > 1 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4">Comparativo de eficiência entre operações</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="operacao" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                  <Radar name="kg/h" dataKey="kg_hora" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg/h`, 'Eficiência']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {rankingOp.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4">kg/h por operação</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rankingOp} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="operacao" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg/h`, 'kg/h']} />
                  <Bar dataKey="kg_por_hora" radius={[8, 8, 0, 0]} maxBarSize={70}>
                    {rankingOp.map((r: any) => <Cell key={r.operacao} fill={OP_COLOR[r.operacao] || '#64748b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Por Operador ── */}
      {!loading && tab === 'ranking-operador' && (
        <div className="space-y-4">
          {rankingOper.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" />Ranking de Operadores — kg/hora</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rankingOper} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="operador" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg/h`, 'Eficiência']} />
                  <Bar dataKey="kg_por_hora" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    {rankingOper.map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4">Ranking de operadores</h3>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th w-8">#</th>
                    <th className="th">Operador</th>
                    <th className="th text-right">Lançamentos</th>
                    <th className="th text-right">OS</th>
                    <th className="th text-right">Horas</th>
                    <th className="th text-right">Peso</th>
                    <th className="th text-right">kg/h</th>
                    <th className="th">Operações</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingOper.map((op, i) => (
                    <tr key={op.id} className={i < 3 ? 'bg-amber-50/30' : ''}>
                      <td className="td"><MedalIcon pos={i + 1} /></td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {op.operador.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">{op.operador}</span>
                        </div>
                      </td>
                      <td className="td text-right text-slate-600">{op.total_lancamentos}</td>
                      <td className="td text-right text-slate-600">{op.total_os}</td>
                      <td className="td text-right text-slate-600">{op.total_horas}h</td>
                      <td className="td text-right text-slate-600">{Number(op.total_peso).toFixed(3)} kg</td>
                      <td className="td text-right"><KghBadge v={op.kg_por_hora} max={maxKghOper} /></td>
                      <td className="td">
                        <div className="flex gap-1 flex-wrap">
                          {op.operacoes?.split(',').map((o: string) => (
                            <span key={o} className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: (OP_COLOR[o.trim()] || '#64748b') + '20', color: OP_COLOR[o.trim()] || '#64748b' }}>{o.trim()}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rankingOper.length === 0 && <tr><td colSpan={8} className="td text-center text-slate-400 py-12">Nenhum dado disponível</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Evolução Diária ── */}
      {!loading && tab === 'evolucao' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Últimos:</span>
            {['7', '15', '30', '60', '90'].map(d => (
              <button key={d} onClick={() => { setDiasEvolucao(d); setTimeout(() => loadTab('evolucao'), 50); }}
                className={`btn btn-sm ${diasEvolucao === d ? 'btn-primary' : 'btn-secondary'}`}>
                {d} dias
              </button>
            ))}
          </div>

          {evolucaoDates.length > 0 ? (
            <>
              <div className="card">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" />Evolução de kg/h por dia e operação</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={evolucaoDates} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#f8fafc', fontSize: 12 }}
                      formatter={(v: any, name: any) => [`${v} kg/h`, name as string]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {OPERACOES.map(op => (
                      <Line key={op} type="monotone" dataKey={op} stroke={OP_COLOR[op]} strokeWidth={2.5}
                        dot={{ r: 3, fill: OP_COLOR[op] }} activeDot={{ r: 5 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 className="font-bold text-slate-800 mb-4">Dados diários detalhados</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th">Data</th>
                        <th className="th">Operação</th>
                        <th className="th text-right">Horas</th>
                        <th className="th text-right">Peso (kg)</th>
                        <th className="th text-right">kg/h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evolucao.map((r, i) => (
                        <tr key={i}>
                          <td className="td text-slate-500 text-xs font-mono">{r.data}</td>
                          <td className="td"><span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ background: (OP_COLOR[r.operacao] || '#64748b') + '20', color: OP_COLOR[r.operacao] || '#64748b' }}>{r.operacao}</span></td>
                          <td className="td text-right text-slate-600">{r.horas}h</td>
                          <td className="td text-right text-slate-600">{Number(r.peso).toFixed(3)}</td>
                          <td className="td text-right font-bold text-emerald-700">{r.kg_por_hora}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center text-slate-400 py-16">Nenhum dado no período selecionado</div>
          )}
        </div>
      )}
    </div>
  );
}
