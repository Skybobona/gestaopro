import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Plus, Trash2, X, Check, AlertCircle, Clock, ChevronDown, ChevronRight,
  UtensilsCrossed, Zap, Timer, Scale, Hash, Edit2, Wrench, User,
  BarChart2, TrendingUp, Activity, ArrowRight, Filter, Users, Package,
  CalendarDays, Layers, TrendingDown, Weight,
} from 'lucide-react';

const OPERACOES = ['Desbaste', 'Laminação', 'Corte', 'Expedição'];
const OP_COLOR: Record<string, string> = {
  'Desbaste':  'bg-indigo-100 text-indigo-700 ring-indigo-200',
  'Laminação': 'bg-purple-100 text-purple-700 ring-purple-200',
  'Corte':     'bg-amber-100  text-amber-700  ring-amber-200',
  'Expedição': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
};
const OP_BAR: Record<string, string> = {
  'Desbaste':  'bg-indigo-500', 'Laminação': 'bg-purple-500',
  'Corte':     'bg-amber-500',  'Expedição': 'bg-emerald-500',
};

interface Periodo { hora_inicio: string; hora_fim: string; tem_refeicao: boolean; operacao: string; }

function calcHoras(ini: string, fim: string, ref: boolean): number {
  if (!ini || !fim) return 0;
  const [hI, mI] = ini.split(':').map(Number);
  const [hF, mF] = fim.split(':').map(Number);
  let min = (hF * 60 + mF) - (hI * 60 + mI);
  if (min < 0) min += 1440;
  if (ref) min -= 60;
  return Math.max(0, Math.round((min / 60) * 100) / 100);
}
function fmt(h: number) {
  if (!h || h <= 0) return '0h';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h${mm.toString().padStart(2,'0')}m` : `${hh}h`;
}
function fmtDate(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`;
}
const emptyPeriodo = (): Periodo => ({ hora_inicio: '', hora_fim: '', tem_refeicao: false, operacao: 'Desbaste' });

type GroupBy = 'data' | 'os' | 'cliente' | 'operacao' | 'equipamento';
const GROUP_LABELS: Record<GroupBy, string> = {
  data: 'Data', os: 'Ordem de Serviço', cliente: 'Cliente',
  operacao: 'Operação', equipamento: 'Equipamento',
};

export default function Lancamentos() {
  const navigate = useNavigate();
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [agrupado, setAgrupado]         = useState<any[]>([]);
  const [ordens, setOrdens]             = useState<any[]>([]);
  const [insights, setInsights]         = useState<any>(null);
  const [loading, setLoading]           = useState(true);

  const [modal, setModal]               = useState(false);
  const [editId, setEditId]             = useState<number | null>(null);
  const [error, setError]               = useState('');
  const [saving, setSaving]             = useState(false);

  const [groupBy, setGroupBy]           = useState<GroupBy>('os');
  const [filterOp, setFilterOp]         = useState('');
  const [expanded, setExpanded]         = useState<Set<string>>(new Set());
  const [selectedOS, setSelectedOS]     = useState<any | null>(null);

  // Form
  const [osId, setOsId]                 = useState('');
  const [dataLanc, setDataLanc]         = useState(new Date().toISOString().split('T')[0]);
  const [qtdProd, setQtdProd]           = useState('');
  const [operadorNome, setOperadorNome] = useState('');
  const [equipamento, setEquipamento]   = useState('');
  const [observacoes, setObservacoes]   = useState('');
  const [periodos, setPeriodos]         = useState<Periodo[]>([emptyPeriodo()]);
  const [pesoLiquido, setPesoLiquido]   = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [lancs, agrup, ins] = await Promise.all([
      api.get('/lancamentos'),
      api.get('/lancamentos/agrupado'),
      api.get('/lancamentos/insights').catch(() => null),
    ]);
    setLancamentos(lancs);
    setAgrupado(agrup);
    setInsights(ins);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    api.get('/producao/os').then((d: any[]) =>
      setOrdens(d.filter(o => o.status === 'aberta' || o.status === 'em_producao'))
    );
  }, [loadAll]);

  const addPeriodo    = () => setPeriodos(p => [...p, emptyPeriodo()]);
  const removePeriodo = (i: number) => setPeriodos(p => p.filter((_,idx) => idx !== i));
  const updPeriodo    = (i: number, f: keyof Periodo, v: any) =>
    setPeriodos(p => p.map((per, idx) => idx === i ? { ...per, [f]: v } : per));

  const totalHorasPreview = periodos.reduce((s, p) => s + calcHoras(p.hora_inicio, p.hora_fim, p.tem_refeicao), 0);
  const osForm = ordens.find(o => String(o.id) === osId);

  // Horas por operação nos períodos do formulário
  const horasPorOp = periodos.reduce((acc, p) => {
    const h = calcHoras(p.hora_inicio, p.hora_fim, p.tem_refeicao);
    if (h > 0) acc[p.operacao] = (acc[p.operacao] || 0) + h;
    return acc;
  }, {} as Record<string, number>);

  // Peso da OS por operação
  const pesoChapas  = osForm ? (osForm.qtd_chapas || 1) * (osForm.chapa_peso_kg || 0) : 0;
  const pesoPedacos = osForm?.peso_total_kg || 0;
  const getPesoOp = (op: string) =>
    op === 'Desbaste'  ? pesoChapas :
    op === 'Expedição' ? (parseFloat(pesoLiquido) || 0) :
    pesoPedacos;

  // Peso total ponderado pelo principal tipo de operação (para salvar no campo peso_produzido)
  const opsUsadas = Object.keys(horasPorOp);
  const opPrincipal = opsUsadas.length > 0
    ? opsUsadas.reduce((a, b) => horasPorOp[a] >= horasPorOp[b] ? a : b)
    : 'Desbaste';
  const pesoOS = getPesoOp(opPrincipal);

  // Para Expedição
  const hasExpedicao = horasPorOp['Expedição'] > 0;
  const quebraKg  = hasExpedicao && pesoPedacos > 0 && pesoLiquido
    ? pesoPedacos - parseFloat(pesoLiquido) : null;
  const quebraPct = quebraKg !== null && pesoPedacos > 0
    ? (quebraKg / pesoPedacos * 100) : null;

  const openNovo = () => {
    setEditId(null); setOsId('');
    setDataLanc(new Date().toISOString().split('T')[0]);
    setQtdProd(''); setOperadorNome(''); setEquipamento(''); setObservacoes('');
    setPeriodos([emptyPeriodo()]); setPesoLiquido(''); setError(''); setModal(true);
  };

  const openEditar = (l: any) => {
    setEditId(l.id);
    setOsId(String(l.os_id));
    setDataLanc(l.data_lancamento);
    setQtdProd(String(l.quantidade_produzida || ''));
    setOperadorNome(l.operador_texto || '');
    setEquipamento(l.equipamento || '');
    setObservacoes(l.observacoes || '');
    setPesoLiquido(l.peso_liquido ? String(l.peso_liquido) : '');
    setPeriodos(l.periodos?.length > 0
      ? l.periodos.map((p: any) => ({
          hora_inicio: p.hora_inicio,
          hora_fim: p.hora_fim,
          tem_refeicao: !!p.tem_refeicao,
          operacao: p.operacao || 'Desbaste',
        }))
      : [emptyPeriodo()]);
    setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const pv = periodos.filter(p => p.hora_inicio && p.hora_fim);
    if (!pv.length) { setError('Informe ao menos um período'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        os_id: parseInt(osId),
        data_lancamento: dataLanc,
        quantidade_produzida: parseInt(qtdProd) || 0,
        peso_produzido: pesoOS,
        peso_liquido:   hasExpedicao ? (parseFloat(pesoLiquido) || null) : null,
        quebra_pct:     hasExpedicao ? quebraPct : null,
        operador_texto: operadorNome || null,
        equipamento: equipamento || null,
        observacoes: observacoes || null,
        periodos: pv,
      };
      if (editId) await api.put(`/lancamentos/${editId}`, payload);
      else        await api.post('/lancamentos', payload);
      setModal(false); loadAll();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Excluir este lançamento?')) return;
    await api.delete(`/lancamentos/${id}`); loadAll();
  };

  // Resumo do dia
  const resumoDia = useMemo(() => {
    const dia = lancamentos.filter(l => l.data_lancamento === dataLanc);
    if (!dia.length) return null;
    const allP: { ini: number; fim: number; os: string; op: string }[] = [];
    dia.forEach(l => (l.periodos||[]).forEach((p: any) => {
      const [hI,mI] = p.hora_inicio.split(':').map(Number);
      const [hF,mF] = p.hora_fim.split(':').map(Number);
      let ini = hI*60+mI, fim = hF*60+mF;
      if (fim < ini) fim += 1440;
      allP.push({ ini, fim, os: l.os_numero, op: l.operacao });
    }));
    allP.sort((a,b) => a.ini-b.ini);
    const gaps: { de: string; ate: string; min: number }[] = [];
    for (let i=1; i<allP.length; i++) {
      const g = allP[i].ini - allP[i-1].fim;
      if (g>0) {
        const toTime = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
        gaps.push({ de: toTime(allP[i-1].fim), ate: toTime(allP[i].ini), min: g });
      }
    }
    return { lancamentos: dia, gaps, totalH: dia.reduce((s,l)=>s+(l.horas_lancadas||0),0) };
  }, [lancamentos, dataLanc]);

  // KPIs
  const totalH = lancamentos.reduce((s,l)=>s+(l.horas_lancadas||0),0);
  const totalP = lancamentos.reduce((s,l)=>s+(l.peso_produzido||0),0);
  const mediaKgH = totalH > 0 ? (totalP/totalH).toFixed(2) : '—';

  // Dados filtrados e agrupados
  const filtered = useMemo(() => {
    let d = [...lancamentos];
    if (filterOp) d = d.filter(l => l.operacao === filterOp);
    return d;
  }, [lancamentos, filterOp]);

  const grouped = useMemo(() => {
    const map: Record<string, { key: string; label: string; sub?: string; items: any[] }> = {};
    filtered.forEach(l => {
      let key = '', label = '', sub = '';
      switch (groupBy) {
        case 'data':       key=l.data_lancamento; label=fmtDate(l.data_lancamento); break;
        case 'os':         key=String(l.os_id);   label=l.os_numero; sub=l.cliente_nome; break;
        case 'cliente':    key=l.cliente_nome;    label=l.cliente_nome; break;
        case 'operacao':   key=l.operacao;        label=l.operacao; break;
        case 'equipamento': key=l.equipamento||'(não informado)'; label=key; break;
      }
      if (!map[key]) map[key] = { key, label, sub, items: [] };
      map[key].items.push(l);
    });
    return Object.values(map).sort((a,b) => a.label.localeCompare(b.label));
  }, [filtered, groupBy]);

  const toggleExp = (k: string) =>
    setExpanded(prev => { const n=new Set(prev); n.has(k)?n.delete(k):n.add(k); return n; });

  const groupSummary = (items: any[]) => {
    const h = items.reduce((s,l)=>s+(l.horas_lancadas||0),0);
    const p = items.reduce((s,l)=>s+(l.peso_produzido||0),0);
    return { h, p, kgh: h>0?(p/h).toFixed(2):'—' };
  };

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lançamentos de Produção</h1>
          <p className="page-subtitle">Múltiplos períodos · Eficiência · Equipamentos · Análise em tempo real</p>
        </div>
        <button className="btn-primary" onClick={openNovo}>
          <Plus className="w-4 h-4" />Novo Lançamento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Hash className="w-5 h-5 text-indigo-500" />,  bg:'bg-indigo-50',  label:'Lançamentos',     value: lancamentos.length,       unit:'' },
          { icon: <Timer className="w-5 h-5 text-amber-500" />,  bg:'bg-amber-50',   label:'Horas Lançadas',  value: fmt(totalH),              unit:'' },
          { icon: <Scale className="w-5 h-5 text-emerald-500" />, bg:'bg-emerald-50', label:'Peso Produzido',  value: totalP.toFixed(1),        unit:'kg' },
          { icon: <Zap className="w-5 h-5 text-purple-500" />,   bg:'bg-purple-50',  label:'Eficiência Média',value: mediaKgH,                 unit:'kg/h' },
        ].map(k => (
          <div key={k.label} className="card flex items-center gap-3 py-4">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{k.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900 leading-tight">{k.value} <span className="text-sm font-normal text-slate-400">{k.unit}</span></p>
              <p className="text-xs text-slate-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">

        {/* ── Left: Lista Agrupada ── */}
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="card py-2.5 px-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agrupar por:</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(GROUP_LABELS) as GroupBy[]).map(g => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${groupBy===g?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1">
              {OPERACOES.map(op => (
                <button key={op} onClick={() => setFilterOp(f => f===op?'':op)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterOp===op?OP_COLOR[op]+' ring-1':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {op}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="card flex items-center justify-center py-20 gap-3">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Carregando...</span>
            </div>
          )}

          {!loading && grouped.map(grp => {
            const open = expanded.has(grp.key);
            const s = groupSummary(grp.items);
            const efColor = Number(s.kgh) > 80 ? 'text-emerald-600' : Number(s.kgh) > 40 ? 'text-amber-600' : 'text-slate-600';
            return (
              <div key={grp.key} className="card p-0 overflow-hidden">
                {/* Grupo Header */}
                <button onClick={() => toggleExp(grp.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                  <div className={`transition-transform duration-150 ${open?'rotate-90':''}`}>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {groupBy === 'os' && (
                        <button onClick={e => { e.stopPropagation(); navigate('/ordens'); }}
                          className="font-mono font-bold text-indigo-600 hover:underline text-sm">{grp.label}</button>
                      )}
                      {groupBy !== 'os' && (
                        <span className="font-semibold text-slate-800 text-sm">{grp.label}</span>
                      )}
                      {grp.sub && <span className="text-xs text-slate-400">{grp.sub}</span>}
                      {groupBy === 'operacao' && (
                        <span className={`badge ring-1 text-xs ${OP_COLOR[grp.label]||'bg-slate-100 text-slate-700 ring-slate-200'}`}>{grp.label}</span>
                      )}
                    </div>
                  </div>
                  {/* Summary pills */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-400">{grp.items.length} lançamento{grp.items.length!==1?'s':''}</span>
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-amber-400" />{fmt(s.h)}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Scale className="w-3 h-3 text-slate-400" />{s.p.toFixed(1)} kg
                    </span>
                    <span className={`text-xs font-bold flex items-center gap-1 ${efColor}`}>
                      <Zap className="w-3 h-3" />{s.kgh} kg/h
                    </span>
                  </div>
                </button>

                {/* Grupo Body */}
                {open && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {grp.items.map((l: any) => {
                      // Peso correto por operação
                      const pesoLabel =
                        l.operacao === 'Desbaste'  ? 'Chapas' :
                        l.operacao === 'Expedição' ? 'Líquido' : 'Pedaços';
                      const kgh = l.horas_lancadas > 0
                        ? (l.peso_produzido / l.horas_lancadas).toFixed(2) : '—';
                      const kghNum = parseFloat(kgh);
                      const kghColor = kghNum > 80 ? 'text-emerald-600' : kghNum > 40 ? 'text-amber-600' : 'text-rose-500';
                      const quebraKg  = l.peso_liquido && l.peso_produzido ? l.peso_produzido - l.peso_liquido : null;
                      const quebraPct = quebraKg !== null && l.peso_produzido > 0
                        ? (quebraKg / l.peso_produzido * 100).toFixed(1) : null;

                      return (
                        <div key={l.id}
                          onClick={() => setSelectedOS(selectedOS?.id === l.id ? null : l)}
                          className={`flex items-start gap-0 cursor-pointer transition-colors ${selectedOS?.id === l.id ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'}`}>
                          {/* Barra colorida da operação */}
                          <div className="w-1 self-stretch flex-shrink-0 rounded-r-full my-1"
                            style={{ backgroundColor:
                              l.operacao==='Desbaste'  ? '#6366f1' :
                              l.operacao==='Laminação' ? '#8b5cf6' :
                              l.operacao==='Corte'     ? '#f59e0b' :
                              l.operacao==='Expedição' ? '#10b981' : '#94a3b8' }} />

                          <div className="flex-1 px-4 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Operação */}
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${OP_COLOR[l.operacao]||'bg-slate-100 text-slate-700'}`}>
                                {l.operacao}
                              </span>
                              {groupBy !== 'os' && (
                                <span className="font-mono text-xs font-bold text-indigo-600">{l.os_numero}</span>
                              )}
                              {groupBy !== 'cliente' && (
                                <span className="text-xs text-slate-500">{l.cliente_nome}</span>
                              )}
                              <span className="text-xs text-slate-400 ml-auto">{fmtDate(l.data_lancamento)}</span>
                            </div>

                            {/* Períodos */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {(l.periodos || []).map((p: any, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded-lg">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {p.hora_inicio} – {p.hora_fim}
                                  {p.tem_refeicao && <UtensilsCrossed className="w-2.5 h-2.5 text-amber-400 ml-0.5" />}
                                </span>
                              ))}
                              {l.equipamento && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                                  <Wrench className="w-2.5 h-2.5" />{l.equipamento}
                                </span>
                              )}
                              {l.operador_exibido && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                                  <User className="w-2.5 h-2.5" />{l.operador_exibido || l.operador_nome}
                                </span>
                              )}
                            </div>

                            {/* Métricas da operação */}
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Timer className="w-3.5 h-3.5 text-amber-400" />
                                <span className="font-bold text-slate-700">{fmt(l.horas_lancadas)}</span>
                                <span className="text-slate-400">horas</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Scale className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-bold text-slate-800">{Number(l.peso_produzido).toFixed(3)}</span>
                                <span className="text-slate-400">kg</span>
                                <span className="text-[10px] text-slate-300">({pesoLabel})</span>
                              </div>
                              <div className={`flex items-center gap-1.5 text-xs ${kghColor}`}>
                                <Zap className="w-3.5 h-3.5" />
                                <span className="font-bold">{kgh}</span>
                                <span className="font-normal opacity-70">kg/h</span>
                              </div>
                              {/* Quebra Expedição */}
                              {quebraPct !== null && (
                                <div className={`flex items-center gap-1.5 text-xs ml-auto ${parseFloat(quebraPct)>37?'text-rose-600':parseFloat(quebraPct)<30?'text-amber-600':'text-emerald-600'}`}>
                                  <TrendingDown className="w-3.5 h-3.5" />
                                  <span className="font-bold">{quebraPct}%</span>
                                  <span className="font-normal opacity-70">quebra</span>
                                  <span className="text-[10px] font-mono opacity-60">
                                    ({Number(l.peso_produzido).toFixed(1)}→{Number(l.peso_liquido).toFixed(1)} kg)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex flex-col gap-0.5 pr-3 pt-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditar(l)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors rounded-lg">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => remove(l.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {!loading && grouped.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-20 gap-3">
              <Activity className="w-12 h-12 text-slate-200" />
              <p className="text-slate-400 font-semibold">Nenhum lançamento encontrado</p>
              <button className="btn-primary btn-sm" onClick={openNovo}><Plus className="w-4 h-4" />Criar primeiro lançamento</button>
            </div>
          )}
        </div>

        {/* ── Right: Painel Inteligente ── */}
        <div className="space-y-4">

          {/* Eficiência por Operação */}
          {insights?.porOperacao?.length > 0 && (
            <div className="card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />Eficiência por Operação
              </p>
              <div className="space-y-3">
                {insights.porOperacao.map((op: any) => {
                  const maxKg = Math.max(...insights.porOperacao.map((o: any) => o.kg_por_hora||0));
                  const w = maxKg > 0 ? Math.round((op.kg_por_hora||0)/maxKg*100) : 0;
                  return (
                    <div key={op.operacao}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`badge ring-1 text-[10px] px-1.5 py-0.5 ${OP_COLOR[op.operacao]||'bg-slate-100 text-slate-600 ring-slate-200'}`}>{op.operacao}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-400">{fmt(op.horas)}</span>
                          <span className="font-bold text-slate-800">{op.kg_por_hora || '—'} <span className="font-normal text-slate-400">kg/h</span></span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${OP_BAR[op.operacao]||'bg-slate-400'} rounded-full transition-all duration-500`} style={{ width: `${w}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top OS por eficiência */}
          {insights?.topOS?.length > 0 && (
            <div className="card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />Ranking OS · kg/h
              </p>
              <div className="space-y-1">
                {insights.topOS.map((os: any, i: number) => (
                  <div key={os.numero} className="flex items-center gap-2.5 py-1.5 hover:bg-slate-50 px-1 rounded-lg transition-colors group">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i===0?'bg-amber-400 text-white':i===1?'bg-slate-400 text-white':i===2?'bg-amber-700/70 text-white':'bg-slate-100 text-slate-500'}`}>{i+1}</span>
                    <button onClick={() => navigate('/ordens')}
                      className="font-mono text-xs font-bold text-indigo-600 group-hover:underline flex-shrink-0">{os.numero}</button>
                    <span className="text-xs text-slate-400 flex-1 truncate">{os.cliente}</span>
                    <span className="text-xs font-bold text-emerald-700 flex-shrink-0">{os.kg_por_hora}</span>
                    <span className="text-[10px] text-slate-300 flex-shrink-0">kg/h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipamentos */}
          {insights?.porEquipamento?.filter((e: any) => e.equipamento !== '(não informado)').length > 0 && (
            <div className="card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />Equipamentos Utilizados
              </p>
              <div className="space-y-1.5">
                {insights.porEquipamento
                  .filter((e: any) => e.equipamento !== '(não informado)')
                  .map((eq: any) => {
                    const maxH = Math.max(...insights.porEquipamento.filter((e:any)=>e.equipamento!=='(não informado)').map((e:any)=>e.horas));
                    const w = maxH>0?Math.round(eq.horas/maxH*100):0;
                    return (
                      <div key={eq.equipamento}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="font-mono font-semibold text-slate-700">{eq.equipamento}</span>
                          <span className="text-slate-400">{fmt(eq.horas)} · {eq.peso_kg.toFixed(0)} kg</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full">
                          <div className="h-full bg-slate-700 rounded-full" style={{ width:`${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Atividade 30 dias */}
          {insights?.ultimos30?.length > 0 && (
            <div className="card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />Atividade — últimos 30 dias
              </p>
              <div className="flex flex-wrap gap-0.5">
                {insights.ultimos30.map((d: any) => {
                  const maxKg = Math.max(...insights.ultimos30.map((x:any)=>x.peso_kg));
                  const intensity = maxKg>0 ? Math.ceil((d.peso_kg/maxKg)*4) : 0;
                  const colors = ['bg-slate-100','bg-indigo-100','bg-indigo-300','bg-indigo-500','bg-indigo-700'];
                  return (
                    <div key={d.data_lancamento} title={`${fmtDate(d.data_lancamento)}: ${d.peso_kg} kg`}
                      className={`w-5 h-5 rounded-sm ${colors[intensity]} cursor-default`} />
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                <span>menos</span>
                <div className="flex gap-0.5">
                  {['bg-slate-100','bg-indigo-100','bg-indigo-300','bg-indigo-500','bg-indigo-700'].map(c=>
                    <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />)}
                </div>
                <span>mais kg</span>
              </div>
            </div>
          )}

          {/* Link rápido OS */}
          <div className="card bg-slate-900 text-white py-4">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest">Ações Rápidas</p>
            <div className="space-y-1.5">
              {[
                { label:'Ver Ordens de Serviço', path:'/ordens', icon: <Package className="w-3.5 h-3.5" /> },
                { label:'Análise de Eficiência', path:'/eficiencia', icon: <Zap className="w-3.5 h-3.5" /> },
                { label:'Relatório de Perdas', path:'/perdas', icon: <BarChart2 className="w-3.5 h-3.5" /> },
              ].map(a => (
                <button key={a.path} onClick={() => navigate(a.path)}
                  className="w-full flex items-center gap-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded-lg transition-all">
                  {a.icon}<span>{a.label}</span><ArrowRight className="w-3 h-3 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de lançamento ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  {editId ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
                  {editId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">OS selecionada · períodos de horário calculados automaticamente</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={save}>
              <div className="modal-body max-h-[78vh] overflow-y-auto space-y-5">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

                {/* OS + Data + Operador + Equipamento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Ordem de Serviço *</label>
                    <select className="select" value={osId} onChange={e => setOsId(e.target.value)} required disabled={!!editId}>
                      <option value="">Selecione a OS...</option>
                      {ordens.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.numero} — {o.cliente_nome}{o.peso_total_kg ? ` · ${Number(o.peso_total_kg).toFixed(3)} kg` : ''}
                          {o.medida_final ? ` · ${o.medida_final}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Data *</label>
                    <input type="date" className="input" value={dataLanc} onChange={e => setDataLanc(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1"><Wrench className="w-3 h-3 text-slate-400" />Equipamento / Máquina</label>
                    <input className="input font-mono" placeholder="Ex: Laminador 01, Desbastadeira A..." value={equipamento} onChange={e => setEquipamento(e.target.value)} />
                  </div>

                  <div>
                    <label className="label flex items-center gap-1"><User className="w-3 h-3 text-slate-400" />Operador</label>
                    <input className="input" placeholder="Nome do operador..." value={operadorNome} onChange={e => setOperadorNome(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Qtd Produzida</label>
                    <input type="number" min="0" className="input" placeholder="unidades" value={qtdProd} onChange={e => setQtdProd(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Observações</label>
                    <input className="input" placeholder="Notas sobre o processo, problemas, etc." value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                  </div>
                </div>

                {/* ── Períodos por Operação ── */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Períodos Trabalhados</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Marque a operação de cada período — um lançamento pode ter múltiplas operações</p>
                    </div>
                    <button type="button" className="btn-secondary btn-sm" onClick={addPeriodo}>
                      <Plus className="w-3.5 h-3.5" />Adicionar Período
                    </button>
                  </div>
                  <div className="space-y-2">
                    {periodos.map((p, i) => {
                      const h = calcHoras(p.hora_inicio, p.hora_fim, p.tem_refeicao);
                      const opColors: Record<string,string> = {
                        'Desbaste':  'border-indigo-400 bg-indigo-50',
                        'Laminação': 'border-purple-400 bg-purple-50',
                        'Corte':     'border-amber-400  bg-amber-50',
                        'Expedição': 'border-emerald-400 bg-emerald-50',
                      };
                      const dotColors: Record<string,string> = {
                        'Desbaste':  'bg-indigo-500',
                        'Laminação': 'bg-purple-500',
                        'Corte':     'bg-amber-500',
                        'Expedição': 'bg-emerald-500',
                      };
                      return (
                        <div key={i} className={`rounded-xl border-2 p-3 transition-colors ${opColors[p.operacao] || 'border-slate-200 bg-slate-50'}`}>
                          {/* Seletor de operação */}
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mr-1">Operação:</span>
                            {OPERACOES.map(op => (
                              <button key={op} type="button"
                                onClick={() => updPeriodo(i, 'operacao', op)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                  p.operacao === op
                                    ? `${dotColors[op]} text-white border-transparent shadow-sm`
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.operacao === op ? 'bg-white/70' : dotColors[op]}`} />
                                {op}
                              </button>
                            ))}
                            <span className="ml-auto" />
                            {periodos.length > 1 && (
                              <button type="button" onClick={() => removePeriodo(i)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded-lg">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {/* Horários */}
                          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                            <div>
                              <label className="label text-[10px] mb-0.5">Início</label>
                              <input type="time" className="input py-1.5 text-sm font-mono bg-white" value={p.hora_inicio} onChange={e => updPeriodo(i,'hora_inicio',e.target.value)} required />
                            </div>
                            <div>
                              <label className="label text-[10px] mb-0.5">Fim</label>
                              <input type="time" className="input py-1.5 text-sm font-mono bg-white" value={p.hora_fim} onChange={e => updPeriodo(i,'hora_fim',e.target.value)} required />
                            </div>
                            <button type="button"
                              onClick={() => updPeriodo(i,'tem_refeicao',!p.tem_refeicao)}
                              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all mt-4 ${p.tem_refeicao?'bg-amber-100 border-amber-400 text-amber-700':'bg-white border-slate-200 text-slate-300 hover:border-amber-300'}`}
                              title="Descontar refeição (60 min)">
                              <UtensilsCrossed className="w-4 h-4" />
                              <span className="text-[9px] font-bold">-1h</span>
                            </button>
                            <div className="text-center mt-4 min-w-[48px]">
                              {h > 0 ? (
                                <>
                                  <p className="text-sm font-bold text-slate-800 tabular-nums">{fmt(h)}</p>
                                  <p className="text-[9px] text-slate-400">horas</p>
                                </>
                              ) : <span className="text-slate-200 text-xs">—</span>}
                            </div>
                          </div>
                          {/* Peso líquido para Expedição */}
                          {p.operacao === 'Expedição' && (
                            <div className="mt-2 pt-2 border-t border-emerald-200">
                              <label className="text-[10px] font-bold text-emerald-700 uppercase">Peso Líquido Final (kg)</label>
                              <input type="number" step="0.001" className="input mt-1 font-mono font-bold text-emerald-700 border-emerald-300 bg-white"
                                placeholder="ex: 96.500" value={pesoLiquido}
                                onChange={e => setPesoLiquido(e.target.value)} />
                              {quebraKg !== null && quebraPct !== null && (
                                <div className={`mt-2 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs ${quebraPct>40?'bg-rose-100 text-rose-700':quebraPct>37?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
                                  <span className="font-mono">{pesoPedacos.toFixed(2)} − {parseFloat(pesoLiquido).toFixed(2)} = {quebraKg.toFixed(2)} kg</span>
                                  <span className="font-bold text-base ml-3">{quebraPct.toFixed(1)}% quebra</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Resumo por Operação ── */}
                {totalHorasPreview > 0 && osForm && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Weight className="w-3.5 h-3.5" />Resumo por Operação
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {OPERACOES.filter(op => horasPorOp[op] > 0).map(op => {
                        const h = horasPorOp[op];
                        const peso = getPesoOp(op);
                        const kgh = h > 0 && peso > 0 ? (peso / h).toFixed(2) : '—';
                        const barColors: Record<string,string> = {
                          'Desbaste':'bg-indigo-500','Laminação':'bg-purple-500',
                          'Corte':'bg-amber-500','Expedição':'bg-emerald-500'
                        };
                        return (
                          <div key={op} className="flex items-center gap-4 px-4 py-2.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${barColors[op]}`} />
                            <span className={`text-xs font-bold w-20 ${OP_COLOR[op]?.split(' ')[1]||'text-slate-700'}`}>{op}</span>
                            <span className="text-xs font-mono text-slate-700 w-14">{fmt(h)}</span>
                            <span className="text-xs text-slate-500 w-24">{peso > 0 ? `${peso.toFixed(3)} kg` : '—'}</span>
                            <span className={`text-xs font-bold ml-auto ${kgh!=='—'?(parseFloat(kgh)>80?'text-emerald-600':parseFloat(kgh)>40?'text-amber-600':'text-rose-500'):'text-slate-300'}`}>
                              {kgh} kg/h
                            </span>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-4 px-4 py-2 bg-slate-50">
                        <span className="w-2 h-2 flex-shrink-0" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase w-20">Total</span>
                        <span className="text-xs font-bold text-indigo-700 w-14">{fmt(totalHorasPreview)}</span>
                        <span className="text-xs font-bold text-slate-800 w-24">{pesoOS > 0 ? `${pesoOS.toFixed(3)} kg` : '—'}</span>
                        <span className="text-xs font-bold ml-auto text-slate-600">
                          {totalHorasPreview > 0 && pesoOS > 0 ? `${(pesoOS/totalHorasPreview).toFixed(2)} kg/h` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo do dia */}
                {resumoDia && (
                  <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Activity className="w-3 h-3" />Dia {fmtDate(dataLanc)} — {resumoDia.lancamentos.length} lançamento(s) · {fmt(resumoDia.totalH)} total
                    </p>
                    <div className="space-y-1 mb-2">
                      {resumoDia.lancamentos.map((l: any) => (
                        <div key={l.id} className="flex items-center gap-2 text-xs">
                          <span className={`badge ring-1 text-[10px] px-1.5 py-0.5 ${OP_COLOR[l.operacao]||''}`}>{l.operacao}</span>
                          <span className="font-mono text-slate-600">{l.os_numero}</span>
                          {l.equipamento && <span className="font-mono text-slate-400">{l.equipamento}</span>}
                          <span className="text-slate-400">{fmt(l.horas_lancadas)}</span>
                          {l.periodos?.map((lp: any, idx: number) => (
                            <span key={idx} className={`font-mono text-[10px] px-1.5 py-0.5 rounded text-white ${({'Desbaste':'bg-indigo-500','Laminação':'bg-purple-500','Corte':'bg-amber-500','Expedição':'bg-emerald-600'} as Record<string,string>)[lp.operacao]||'bg-slate-500'}`}>
                              {lp.hora_inicio}–{lp.hora_fim}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                    {resumoDia.gaps.length > 0 && (
                      <div className="border-t border-amber-200 pt-2">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Intervalos sem cobertura:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumoDia.gaps.map((g, i) => (
                            <span key={i} className="text-[10px] font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                              {g.de} → {g.ate} ({Math.floor(g.min/60)>0?`${Math.floor(g.min/60)}h`:''}{g.min%60>0?`${g.min%60}m`:''})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : <><Check className="w-4 h-4" />{editId ? 'Atualizar' : 'Salvar Lançamento'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
