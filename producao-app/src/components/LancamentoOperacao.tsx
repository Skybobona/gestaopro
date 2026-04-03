import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import {
  Plus, Trash2, X, Check, AlertCircle, Clock, Edit2, Wrench, User,
  Timer, Scale, Zap, UtensilsCrossed, Hash, Weight,
  Calendar,
} from 'lucide-react';

export type Operacao = 'Desbaste' | 'Laminação' | 'Corte' | 'Expedição';

export interface OpConfig {
  operacao: Operacao;
  label: string;
  color: string;        // tailwind text color
  bg: string;           // tailwind bg
  border: string;       // tailwind border
  badgeBg: string;
  hex: string;
}

export const OP_CONFIGS: Record<Operacao, OpConfig> = {
  'Desbaste':  { operacao:'Desbaste',  label:'Desbaste',  color:'text-indigo-700', bg:'bg-indigo-50',  border:'border-indigo-300', badgeBg:'bg-indigo-100 text-indigo-700', hex:'#4f46e5' },
  'Laminação': { operacao:'Laminação', label:'Laminação', color:'text-purple-700', bg:'bg-purple-50',  border:'border-purple-300', badgeBg:'bg-purple-100 text-purple-700', hex:'#7c3aed' },
  'Corte':     { operacao:'Corte',     label:'Corte',     color:'text-amber-700',  bg:'bg-amber-50',   border:'border-amber-300',  badgeBg:'bg-amber-100  text-amber-700',  hex:'#d97706' },
  'Expedição': { operacao:'Expedição', label:'Expedição', color:'text-emerald-700',bg:'bg-emerald-50', border:'border-emerald-300',badgeBg:'bg-emerald-100 text-emerald-700',hex:'#059669' },
};

interface Periodo { hora_inicio: string; hora_fim: string; tem_refeicao: boolean; }

function calcH(ini: string, fim: string, ref: boolean): number {
  if (!ini || !fim) return 0;
  const [hI,mI] = ini.split(':').map(Number);
  const [hF,mF] = fim.split(':').map(Number);
  let min = (hF*60+mF)-(hI*60+mI);
  if (min < 0) min += 1440;
  if (ref) min -= 60;
  return Math.max(0, Math.round((min/60)*100)/100);
}
function fmt(h: number) {
  if (!h || h <= 0) return '0h';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h${mm.toString().padStart(2,'0')}m` : `${hh}h`;
}
function fmtDate(s: string) {
  if (!s) return '';
  const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`;
}
const emptyP = (): Periodo => ({ hora_inicio: '', hora_fim: '', tem_refeicao: false });

interface Props { operacao: Operacao; }

export default function LancamentoOperacao({ operacao }: Props) {
  const cfg = OP_CONFIGS[operacao];

  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [ordens, setOrdens]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(false);
  const [editId, setEditId]           = useState<number|null>(null);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);

  // form
  const [osId, setOsId]               = useState('');
  const [dataLanc, setDataLanc]       = useState(new Date().toISOString().split('T')[0]);
  const [operadorNome, setOperadorNome] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [periodos, setPeriodos]       = useState<Periodo[]>([emptyP()]);
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [qtdProd, setQtdProd]         = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const all = await api.get('/lancamentos');
    setLancamentos((all as any[]).filter((l: any) => l.operacao === operacao));
    setLoading(false);
  }, [operacao]);

  useEffect(() => {
    loadAll();
    api.get('/producao/os').then((d: any[]) =>
      setOrdens(d.filter(o => o.status === 'aberta' || o.status === 'em_producao'))
    );
  }, [loadAll]);

  const osForm = ordens.find(o => String(o.id) === osId);
  const pesoChapas  = osForm ? (osForm.qtd_chapas || 1) * (osForm.chapa_peso_kg || 0) : 0;
  const pesoPedacos = osForm?.peso_total_kg || 0;
  const pesoRef = operacao === 'Desbaste' ? pesoChapas : pesoPedacos;

  const totalH = periodos.reduce((s,p) => s + calcH(p.hora_inicio, p.hora_fim, p.tem_refeicao), 0);

  const quebraKg  = operacao === 'Expedição' && pesoPedacos > 0 && pesoLiquido
    ? pesoPedacos - parseFloat(pesoLiquido) : null;
  const quebraPct = quebraKg !== null && pesoPedacos > 0
    ? quebraKg / pesoPedacos * 100 : null;

  const pesoFinal = operacao === 'Expedição' ? (parseFloat(pesoLiquido) || 0) : pesoRef;
  const kghPreview = totalH > 0 && pesoFinal > 0 ? (pesoFinal / totalH).toFixed(2) : null;

  // KPIs
  const totalHoras   = lancamentos.reduce((s,l) => s+(l.horas_lancadas||0), 0);
  const totalPeso    = lancamentos.reduce((s,l) => s+(l.peso_produzido||0), 0);
  const mediaKgh     = totalHoras > 0 ? (totalPeso/totalHoras).toFixed(1) : '—';

  const openNovo = () => {
    setEditId(null); setOsId(''); setDataLanc(new Date().toISOString().split('T')[0]);
    setOperadorNome(''); setEquipamento(''); setObservacoes('');
    setPeriodos([emptyP()]); setPesoLiquido(''); setQtdProd('');
    setError(''); setModal(true);
  };
  const openEditar = (l: any) => {
    setEditId(l.id);
    setOsId(String(l.os_id)); setDataLanc(l.data_lancamento);
    setOperadorNome(l.operador_texto || ''); setEquipamento(l.equipamento || '');
    setObservacoes(l.observacoes || ''); setQtdProd(String(l.quantidade_produzida||''));
    setPesoLiquido(l.peso_liquido ? String(l.peso_liquido) : '');
    setPeriodos(l.periodos?.length > 0
      ? l.periodos.map((p: any) => ({ hora_inicio: p.hora_inicio, hora_fim: p.hora_fim, tem_refeicao: !!p.tem_refeicao }))
      : [emptyP()]);
    setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const pv = periodos.filter(p => p.hora_inicio && p.hora_fim);
    if (!pv.length) { setError('Informe ao menos um período'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        os_id: parseInt(osId), operacao,
        data_lancamento: dataLanc,
        quantidade_produzida: parseInt(qtdProd)||0,
        peso_produzido: pesoFinal,
        peso_liquido: operacao === 'Expedição' ? (parseFloat(pesoLiquido)||null) : null,
        quebra_pct: operacao === 'Expedição' ? quebraPct : null,
        operador_texto: operadorNome||null,
        equipamento: equipamento||null,
        observacoes: observacoes||null,
        periodos: pv.map(p => ({ ...p, operacao })),
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

  const addP = () => setPeriodos(p => [...p, emptyP()]);
  const remP = (i: number) => setPeriodos(p => p.filter((_,idx) => idx !== i));
  const updP = (i: number, f: keyof Periodo, v: any) =>
    setPeriodos(p => p.map((per,idx) => idx===i ? {...per,[f]:v} : per));

  // group by OS
  const grouped = useMemo(() => {
    const map: Record<string,{ os: string; cliente: string; items: any[] }> = {};
    lancamentos.forEach(l => {
      const k = String(l.os_id);
      if (!map[k]) map[k] = { os: l.os_numero, cliente: l.cliente_nome, items: [] };
      map[k].items.push(l);
    });
    return Object.values(map).sort((a,b) => a.os.localeCompare(b.os));
  }, [lancamentos]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-3 h-3 rounded-full`} style={{ backgroundColor: cfg.hex }} />
            <h1 className="page-title">{cfg.label}</h1>
          </div>
          <p className="page-subtitle">Lançamentos de produção · operação {cfg.label}</p>
        </div>
        <button className="btn-primary" onClick={openNovo}>
          <Plus className="w-4 h-4" />Novo Lançamento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Hash className="w-5 h-5" style={{color:cfg.hex}} />,  bg: cfg.bg, label: 'Lançamentos',    value: lancamentos.length, unit: '' },
          { icon: <Timer className="w-5 h-5 text-amber-500" />,          bg: 'bg-amber-50',   label: 'Horas Lançadas', value: fmt(totalHoras),    unit: '' },
          { icon: <Scale className="w-5 h-5 text-slate-600" />,          bg: 'bg-slate-50',   label: 'Peso Registrado',value: totalPeso.toFixed(1),unit: 'kg' },
          { icon: <Zap className="w-5 h-5 text-emerald-500" />,          bg: 'bg-emerald-50', label: 'Média kg/h',     value: mediaKgh,           unit: 'kg/h' },
        ].map(k => (
          <div key={k.label} className="card flex items-center gap-3 py-4">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{k.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900 leading-tight">
                {k.value} <span className="text-sm font-normal text-slate-400">{k.unit}</span>
              </p>
              <p className="text-xs text-slate-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela agrupada por OS */}
      {loading ? (
        <div className="card flex items-center justify-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : grouped.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3">
          <Weight className="w-12 h-12 text-slate-200" />
          <p className="text-slate-400 font-semibold">Nenhum lançamento de {cfg.label}</p>
          <button className="btn-primary btn-sm" onClick={openNovo}><Plus className="w-4 h-4" />Criar primeiro</button>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(grp => {
            const totalGH = grp.items.reduce((s,l) => s+(l.horas_lancadas||0), 0);
            const totalGP = grp.items.reduce((s,l) => s+(l.peso_produzido||0), 0);
            const gkgh = totalGH > 0 ? (totalGP/totalGH).toFixed(1) : '—';
            return (
              <div key={grp.os} className="card overflow-hidden p-0">
                {/* OS Header */}
                <div className={`flex items-center gap-4 px-5 py-3 ${cfg.bg} border-b ${cfg.border}`}>
                  <div className={`w-1.5 h-6 rounded-full`} style={{backgroundColor:cfg.hex}} />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold text-slate-900 text-sm">{grp.os}</span>
                    <span className="text-xs text-slate-500 ml-2">{grp.cliente}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span><Timer className="w-3 h-3 inline mr-1 text-amber-500" />{fmt(totalGH)}</span>
                    <span><Scale className="w-3 h-3 inline mr-1 text-slate-400" />{totalGP.toFixed(1)} kg</span>
                    <span className="font-bold" style={{color:cfg.hex}}><Zap className="w-3 h-3 inline mr-1" />{gkgh} kg/h</span>
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                  {/* Header row */}
                  <div className="grid grid-cols-[90px_1fr_100px_80px_80px_90px_90px_70px_70px] gap-2 px-5 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>Data</span>
                    <span>Períodos</span>
                    <span>Equipamento</span>
                    <span>Operador</span>
                    <span className="text-right">Horas</span>
                    <span className="text-right">Peso (kg)</span>
                    <span className="text-right">kg/h</span>
                    <span className="text-right">% peças</span>
                    <span />
                  </div>
                  {grp.items.map((l: any) => {
                    const kgh = l.horas_lancadas > 0 ? (l.peso_produzido/l.horas_lancadas).toFixed(1) : '—';
                    const kghN = parseFloat(kgh);
                    const kghColor = kghN > 80 ? 'text-emerald-600 font-bold' : kghN > 40 ? 'text-amber-600' : 'text-rose-500';
                    // % real sobre pedaços
                    const pctPedacos = l.pct_sobre_pedacos ?? (
                      l.peso_produzido && l.os_peso_total_kg
                        ? (l.peso_produzido / l.os_peso_total_kg * 100).toFixed(1)
                        : null
                    );
                    // quebra expedição
                    const quebraL = l.quebra_pct;

                    return (
                      <div key={l.id} className="grid grid-cols-[90px_1fr_100px_80px_80px_90px_90px_70px_70px] gap-2 px-5 py-2.5 items-center hover:bg-slate-50/60 transition-colors text-xs">
                        <span className="text-slate-500 font-mono">{fmtDate(l.data_lancamento)}</span>

                        {/* Períodos */}
                        <div className="flex flex-wrap gap-1">
                          {(l.periodos||[]).map((p: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-0.5 font-mono text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded-md">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              {p.hora_inicio}–{p.hora_fim}
                              {p.tem_refeicao && <UtensilsCrossed className="w-2.5 h-2.5 text-amber-400 ml-0.5" />}
                            </span>
                          ))}
                        </div>

                        <span className="font-mono text-slate-600 truncate">{l.equipamento || <span className="text-slate-300">—</span>}</span>
                        <span className="text-slate-500 truncate">{l.operador_exibido || <span className="text-slate-300">—</span>}</span>
                        <span className="text-right font-semibold text-slate-700">{fmt(l.horas_lancadas)}</span>
                        <span className="text-right font-bold text-slate-900">
                          {Number(l.peso_produzido).toFixed(3)}
                          {operacao === 'Expedição' && l.peso_liquido && (
                            <span className="text-emerald-600 font-normal text-[10px] block">liq: {Number(l.peso_liquido).toFixed(3)}</span>
                          )}
                        </span>
                        <span className={`text-right ${kghColor}`}>{kgh}</span>
                        <span className="text-right">
                          {operacao === 'Expedição' && quebraL != null ? (
                            <span className={`font-bold ${quebraL>37?'text-rose-600':quebraL<30?'text-amber-600':'text-emerald-600'}`}>
                              {Number(quebraL).toFixed(1)}%<span className="text-[9px] font-normal text-slate-400 block">quebra</span>
                            </span>
                          ) : pctPedacos != null ? (
                            <span className="text-slate-600 font-semibold">{pctPedacos}%</span>
                          ) : <span className="text-slate-200">—</span>}
                        </span>

                        {/* Ações */}
                        <div className="flex gap-0.5 justify-end">
                          <button onClick={() => openEditar(l)} className="p-1 text-slate-300 hover:text-indigo-500 transition-colors rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => remove(l.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{backgroundColor:cfg.hex}} />
                  {editId ? `Editar Lançamento · ${cfg.label}` : `Novo Lançamento · ${cfg.label}`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Períodos calculados automaticamente</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={save}>
              <div className="modal-body max-h-[78vh] overflow-y-auto space-y-4">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

                {/* OS + Data + Operador + Equipamento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Ordem de Serviço *</label>
                    <select className="select" value={osId} onChange={e => setOsId(e.target.value)} required disabled={!!editId}>
                      <option value="">Selecione a OS...</option>
                      {ordens.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.numero} — {o.cliente_nome}
                          {o.medida_final ? ` · ${o.medida_final}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label"><Calendar className="w-3 h-3 inline mr-1 text-slate-400" />Data *</label>
                    <input type="date" className="input" value={dataLanc} onChange={e => setDataLanc(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label"><Wrench className="w-3 h-3 inline mr-1 text-slate-400" />Equipamento</label>
                    <input className="input font-mono" placeholder="Ex: Laminador 01..." value={equipamento} onChange={e => setEquipamento(e.target.value)} />
                  </div>
                  <div>
                    <label className="label"><User className="w-3 h-3 inline mr-1 text-slate-400" />Operador</label>
                    <input className="input" placeholder="Nome do operador..." value={operadorNome} onChange={e => setOperadorNome(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Qtd Produzida</label>
                    <input type="number" min="0" className="input" placeholder="peças" value={qtdProd} onChange={e => setQtdProd(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Observações</label>
                    <input className="input" placeholder="Notas..." value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                  </div>
                </div>

                {/* Painel de referência de peso */}
                {osForm && (
                  <div className={`rounded-xl border p-3 text-xs ${cfg.bg} ${cfg.border} border`}>
                    <p className="font-bold uppercase tracking-widest text-[10px] mb-2" style={{color:cfg.hex}}>
                      <Weight className="w-3.5 h-3.5 inline mr-1" />Referência de Peso — {cfg.label}
                    </p>
                    {operacao === 'Desbaste' ? (
                      <p className="font-mono" style={{color:cfg.hex}}>
                        {osForm.qtd_chapas} chapas × {Number(osForm.chapa_peso_kg||0).toFixed(3)} kg/chapa = <strong>{pesoChapas.toFixed(3)} kg</strong>
                      </p>
                    ) : operacao === 'Expedição' ? (
                      <div className="space-y-2">
                        <p className="text-slate-600">Peso pedaços (ref.): <strong>{pesoPedacos.toFixed(3)} kg</strong></p>
                        <div>
                          <label className="font-bold text-emerald-700 uppercase text-[10px]">Peso Líquido Final (kg) *</label>
                          <input type="number" step="0.001" className="input mt-1 font-mono font-bold text-emerald-700 border-emerald-300 bg-white"
                            placeholder="ex: 96.500" value={pesoLiquido} onChange={e => setPesoLiquido(e.target.value)} />
                        </div>
                        {quebraKg !== null && quebraPct !== null && (
                          <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${quebraPct>40?'bg-rose-100 text-rose-700':quebraPct>37?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
                            <span className="font-mono text-[11px]">{pesoPedacos.toFixed(2)} − {parseFloat(pesoLiquido).toFixed(2)} = {quebraKg.toFixed(2)} kg</span>
                            <span className="font-bold text-lg ml-3">{quebraPct.toFixed(1)}% quebra</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="font-mono" style={{color:cfg.hex}}>
                        {(osForm.qtd_chapas||1)*(osForm.qtd_pedacos||1)} peças × {Number(osForm.peso_unitario_kg||0).toFixed(4)} kg = <strong>{pesoPedacos.toFixed(3)} kg</strong>
                      </p>
                    )}
                    {kghPreview && (
                      <p className="mt-2 font-semibold" style={{color:cfg.hex}}>
                        <Zap className="w-3 h-3 inline mr-1" />Preview: {kghPreview} kg/h · {fmt(totalH)} horas
                      </p>
                    )}
                  </div>
                )}

                {/* Períodos */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Períodos Trabalhados</p>
                    <button type="button" className="btn-secondary btn-sm" onClick={addP}>
                      <Plus className="w-3.5 h-3.5" />Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {periodos.map((p, i) => {
                      const h = calcH(p.hora_inicio, p.hora_fim, p.tem_refeicao);
                      return (
                        <div key={i} className={`grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center p-2.5 rounded-xl border-2 ${cfg.border} ${cfg.bg}`}>
                          <div>
                            <label className="label text-[10px] mb-0.5">Início</label>
                            <input type="time" className="input py-1.5 text-sm font-mono bg-white" value={p.hora_inicio} onChange={e => updP(i,'hora_inicio',e.target.value)} required />
                          </div>
                          <div>
                            <label className="label text-[10px] mb-0.5">Fim</label>
                            <input type="time" className="input py-1.5 text-sm font-mono bg-white" value={p.hora_fim} onChange={e => updP(i,'hora_fim',e.target.value)} required />
                          </div>
                          <button type="button" onClick={() => updP(i,'tem_refeicao',!p.tem_refeicao)}
                            className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border transition-all mt-4 ${p.tem_refeicao?'bg-amber-100 border-amber-400 text-amber-700':'bg-white border-slate-200 text-slate-300 hover:border-amber-300'}`}
                            title="Descontar refeição (60 min)">
                            <UtensilsCrossed className="w-4 h-4" />
                            <span className="text-[9px] font-bold">-1h</span>
                          </button>
                          <div className="text-center mt-4 min-w-[44px]">
                            {h > 0 ? <>
                              <p className="text-sm font-bold text-slate-800">{fmt(h)}</p>
                              <p className="text-[9px] text-slate-400">horas</p>
                            </> : <span className="text-slate-300 text-xs">—</span>}
                          </div>
                          {periodos.length > 1 && (
                            <button type="button" onClick={() => remP(i)} className="p-1 text-slate-300 hover:text-rose-500 mt-4 rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Totais */}
                  {totalH > 0 && (
                    <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-slate-400">Total Horas</p>
                        <p className="text-lg font-bold" style={{color:cfg.hex}}>{fmt(totalH)}</p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-slate-400">Peso Ref.</p>
                        <p className="text-lg font-bold text-slate-800">{pesoFinal > 0 ? pesoFinal.toFixed(3) : '—'} <span className="text-xs font-normal">kg</span></p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-slate-400">Eficiência</p>
                        <p className={`text-lg font-bold ${kghPreview?(parseFloat(kghPreview)>80?'text-emerald-600':parseFloat(kghPreview)>40?'text-amber-600':'text-slate-700'):'text-slate-300'}`}>
                          {kghPreview||'—'} <span className="text-xs font-normal">kg/h</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}
                  style={saving?{}:{backgroundColor:cfg.hex}}>
                  {saving ? 'Salvando...' : <><Check className="w-4 h-4" />{editId ? 'Atualizar' : 'Salvar'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
