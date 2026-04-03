import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Plus, Eye, X, Check, AlertCircle, Weight, Calculator,
  Edit2, ArrowRight, ChevronRight, Clock, Scale, Layers,
  CheckCircle2, Circle, PlayCircle, XCircle, Activity,
  Wrench, BarChart2, Timer, Ruler, Hash,
} from 'lucide-react';

const STATUS_LIST = ['aberta','em_producao','concluida','cancelada'] as const;
const STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta', em_producao: 'Em Produção', concluida: 'Concluída', cancelada: 'Cancelada',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  aberta:      <Circle className="w-3.5 h-3.5 text-blue-400" />,
  em_producao: <PlayCircle className="w-3.5 h-3.5 text-amber-400" />,
  concluida:   <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  cancelada:   <XCircle className="w-3.5 h-3.5 text-rose-400" />,
};
const STATUS_BG: Record<string, string> = {
  aberta: 'bg-blue-50 border-blue-200 text-blue-700',
  em_producao: 'bg-amber-50 border-amber-200 text-amber-700',
  concluida: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  cancelada: 'bg-rose-50 border-rose-200 text-rose-500',
};
const TEMPERAS = ['','F','O','H12','H14','H18','H22','H24','H111','H112','T3','T4','T5','T6','T651'];

interface Calculo { largura_chapa: number; peso_unitario_kg: number; peso_total_kg: number; medida_final: string; formula: string; }

const emptyForm = () => ({
  cliente_id:'', chapa_id:'', descricao:'',
  qtd_chapas:'1', qtd_pedacos:'1',
  corte_mm:'', desbaste_mm:'', laminar_pct:'',
  tempera:'', data_previsao:'',
});

function fmtDate(s: string) {
  if (!s) return '—'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`;
}

// ── Calculadora de Laminação ─────────────────────────────
// Fórmula: espessura_inicial / desbaste_final * largura_chapa = comprimento_laminado
// comprimento_laminado / corte = nº pedaços por chapa (conservação de volume)
function CalcLaminacao({ chapa, desbasteMm, corteMm, onApply }: {
  chapa: any; desbasteMm: number; corteMm: number; onApply: (pedacos: number) => void;
}) {
  if (!chapa || !desbasteMm || desbasteMm <= 0) return null;
  const espessuraInicial = Number(chapa.espessura);
  const largura = Number(chapa.largura);
  const compLaminado = espessuraInicial > 0 ? (espessuraInicial / desbasteMm) * largura : 0;
  const pedacosPorChapa = corteMm > 0 ? Math.floor(compLaminado / corteMm) : 0;
  const sobra = corteMm > 0 ? compLaminado - (pedacosPorChapa * corteMm) : compLaminado;
  const aproveitamento = corteMm > 0 && compLaminado > 0 ? ((pedacosPorChapa * corteMm) / compLaminado * 100) : 0;

  return (
    <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-4">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Ruler className="w-3.5 h-3.5" />Calculadora de Laminação
      </p>
      <div className="text-xs text-amber-800 font-mono mb-3 bg-white/60 rounded-lg px-3 py-2">
        {espessuraInicial} mm ÷ {desbasteMm} mm × {largura} mm = <strong>{compLaminado.toFixed(1)} mm</strong> laminado
        {corteMm > 0 && <> → <strong>{pedacosPorChapa} pç</strong> × {corteMm}mm</>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-lg p-2 text-center border border-amber-200">
          <p className="text-[10px] text-amber-500">Comp. Laminado</p>
          <p className="font-bold text-amber-800 text-sm">{compLaminado.toFixed(1)}</p>
          <p className="text-[10px] text-amber-400">mm</p>
        </div>
        <div className={`rounded-lg p-2 text-center border ${pedacosPorChapa > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-amber-200'}`}>
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5"><Hash className="w-2.5 h-2.5" />Pedaços/Chapa</p>
          <p className={`font-bold text-xl leading-tight ${pedacosPorChapa > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{corteMm > 0 ? pedacosPorChapa : '—'}</p>
          <p className="text-[10px] text-slate-400">peças</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center border border-amber-200">
          <p className="text-[10px] text-amber-500">Sobra</p>
          <p className="font-bold text-amber-800 text-sm">{corteMm > 0 ? sobra.toFixed(1) : '—'}</p>
          <p className="text-[10px] text-amber-400">mm ({aproveitamento.toFixed(0)}%)</p>
        </div>
      </div>
      {pedacosPorChapa > 0 && (
        <button type="button" onClick={() => onApply(pedacosPorChapa)}
          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
          <Check className="w-3.5 h-3.5" />Usar {pedacosPorChapa} pedaço{pedacosPorChapa !== 1 ? 's' : ''}/chapa
        </button>
      )}
    </div>
  );
}

export default function Ordens() {
  const navigate = useNavigate();
  const [ordens,   setOrdens]   = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [chapas,   setChapas]   = useState<any[]>([]);
  const [modal,    setModal]    = useState(false);
  const [detalhe,  setDetalhe]  = useState<any|null>(null);
  const [editId,   setEditId]   = useState<number|null>(null);
  const [editStatus, setEditStatus] = useState('aberta');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,   setSearch]   = useState('');
  const [form,     setForm]     = useState(emptyForm());
  const [calculo,  setCalculo]  = useState<Calculo|null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [selected, setSelected] = useState<any|null>(null);

  const load = () => api.get('/producao/os').then(setOrdens);
  useEffect(() => {
    load();
    api.get('/clientes').then(d => setClientes(d.filter((c:any)=>c.ativo)));
    api.get('/chapas').then(setChapas);
  }, []);

  const calcularPeso = useCallback(async (f: ReturnType<typeof emptyForm>) => {
    if (!f.chapa_id||!f.corte_mm||!f.desbaste_mm) { setCalculo(null); return; }
    setCalcLoading(true);
    try {
      const r = await api.post('/producao/calcular', {
        chapa_id: parseInt(f.chapa_id),
        corte_mm: parseFloat(f.corte_mm),
        desbaste_mm: parseFloat(f.desbaste_mm),
        qtd_chapas: parseInt(f.qtd_chapas)||1,
        qtd_pedacos: parseInt(f.qtd_pedacos)||1,
      });
      setCalculo(r);
    } catch { setCalculo(null); }
    finally { setCalcLoading(false); }
  }, []);

  const handleChange = (field: string, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (['chapa_id','corte_mm','desbaste_mm','qtd_chapas','qtd_pedacos'].includes(field)) calcularPeso(next);
  };

  const openNova = () => {
    setForm(emptyForm()); setCalculo(null);
    setEditId(null); setEditStatus('aberta'); setError(''); setModal(true);
  };
  const openEditar = (os: any) => {
    setForm({
      cliente_id: String(os.cliente_id), chapa_id: String(os.chapa_id||''),
      descricao: os.descricao||'', qtd_chapas: String(os.qtd_chapas||1),
      qtd_pedacos: String(os.qtd_pedacos||1), corte_mm: String(os.corte_mm||''),
      desbaste_mm: String(os.desbaste_mm||''), laminar_pct: String(os.laminar_pct||''),
      tempera: os.tempera||'', data_previsao: os.data_previsao||'',
    });
    setCalculo(os.peso_unitario_kg ? {
      largura_chapa: os.chapa_largura, peso_unitario_kg: os.peso_unitario_kg,
      peso_total_kg: os.peso_total_kg, medida_final: os.medida_final||'', formula: '',
    } : null);
    setEditId(os.id); setEditStatus(os.status||'aberta');
    setDetalhe(null); setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = {
        cliente_id: parseInt(form.cliente_id),
        chapa_id: form.chapa_id ? parseInt(form.chapa_id) : null,
        descricao: form.descricao||null,
        qtd_chapas: parseInt(form.qtd_chapas)||1,
        qtd_pedacos: parseInt(form.qtd_pedacos)||1,
        corte_mm: form.corte_mm ? parseFloat(form.corte_mm) : null,
        desbaste_mm: form.desbaste_mm ? parseFloat(form.desbaste_mm) : null,
        laminar_pct: form.laminar_pct ? parseFloat(form.laminar_pct) : null,
        tempera: form.tempera||null,
        data_previsao: form.data_previsao||null,
        status: editStatus,
      };
      if (editId) await api.put(`/producao/os/${editId}`, payload);
      else        await api.post('/producao/os', payload);
      setModal(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const verDetalhe = async (os: any) => {
    const d = await api.get(`/producao/os/${os.id}`);
    setDetalhe(d); setSelected(os);
  };

  const mudarStatus = async (id: number, status: string) => {
    await api.patch(`/producao/os/${id}/status`, { status });
    load(); setDetalhe((p:any) => p ? {...p,status} : null);
  };

  const selectedChapa = chapas.find(c => String(c.id)===form.chapa_id);
  const totalPecas = (parseInt(form.qtd_chapas)||1) * (parseInt(form.qtd_pedacos)||1);

  const filtered = useMemo(() => ordens.filter(o =>
    (!statusFilter || o.status===statusFilter) &&
    (!search || o.numero.toLowerCase().includes(search.toLowerCase()) ||
                o.cliente_nome.toLowerCase().includes(search.toLowerCase()))
  ), [ordens, statusFilter, search]);

  // Stats por status
  const countByStatus = useMemo(() => {
    const m: Record<string,number> = {};
    STATUS_LIST.forEach(s => { m[s] = ordens.filter(o=>o.status===s).length; });
    return m;
  }, [ordens]);

  const totalPesoAberto = useMemo(() =>
    ordens.filter(o=>o.status==='aberta'||o.status==='em_producao')
      .reduce((s,o)=>s+(Number(o.peso_total_kg)||0),0), [ordens]);

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ordens de Serviço</h1>
          <p className="page-subtitle">Cálculo automático · Al 2,7 g/cm³ · Pipeline de produção</p>
        </div>
        <button className="btn-primary" onClick={openNova}><Plus className="w-4 h-4" />Nova OS</button>
      </div>

      {/* Pipeline de status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUS_LIST.map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter===s?'':s)}
            className={`card py-3 flex items-center gap-3 border-2 transition-all text-left ${statusFilter===s?'border-slate-900 shadow-md':'border-transparent'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              s==='aberta'?'bg-blue-50':s==='em_producao'?'bg-amber-50':s==='concluida'?'bg-emerald-50':'bg-rose-50'}`}>
              {STATUS_ICON[s]}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-tight">{countByStatus[s]||0}</p>
              <p className="text-xs text-slate-400">{STATUS_LABELS[s]}</p>
            </div>
            {statusFilter===s && <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
          </button>
        ))}
      </div>

      {/* Main 2-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ── Tabela ── */}
        <div className="card p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <input className="input py-2 text-sm max-w-xs flex-1" placeholder="Buscar por OS ou cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} ordem{filtered.length!==1?'s':''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px]">
                  <th className="px-4 py-2.5 text-left font-semibold">OS</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Chapa · Liga</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Corte</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Esp.</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Ch × Pç</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Peso Unit.</th>
                  <th className="px-3 py-2.5 text-right font-semibold bg-emerald-900">Peso Total</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Tempera</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Previsão</th>
                  <th className="px-2 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="px-4 py-16 text-center text-slate-400">
                    <Activity className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p>Nenhuma OS encontrada</p>
                    <button className="btn-primary btn-sm mt-4" onClick={openNova}><Plus className="w-3.5 h-3.5" />Criar Nova OS</button>
                  </td></tr>
                )}
                {filtered.map(o => (
                  <tr key={o.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer ${selected?.id===o.id?'bg-indigo-50/40':''}`}
                    onClick={() => verDetalhe(o)}>
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-bold text-indigo-600 text-xs flex items-center gap-1">
                        {o.numero}<ArrowRight className="w-2.5 h-2.5 opacity-40" />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 max-w-[140px] truncate">{o.cliente_nome}</td>
                    <td className="px-3 py-2.5">
                      {o.chapa_codigo
                        ? <span className="flex items-center gap-1">
                            <span className="font-mono text-xs font-bold text-slate-700">{o.chapa_codigo}</span>
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded font-semibold">{o.chapa_liga}</span>
                          </span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{o.corte_mm?`${o.corte_mm}`:'—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{o.desbaste_mm?`${o.desbaste_mm}`:'—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{o.qtd_chapas}×{o.qtd_pedacos}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-indigo-600 font-semibold">{o.peso_unitario_kg?`${Number(o.peso_unitario_kg).toFixed(4)}`:'—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums bg-emerald-50/50">
                      {o.peso_total_kg
                        ? <span className="font-bold text-emerald-700">{Number(o.peso_total_kg).toFixed(3)} <span className="font-normal text-emerald-400">kg</span></span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {o.tempera ? <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{o.tempera}</span> : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BG[o.status]||'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {STATUS_ICON[o.status]}{STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                      {o.data_previsao ? <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtDate(o.data_previsao)}</span> : '—'}
                    </td>
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => verDetalhe(o)} className="p-1 text-slate-300 hover:text-indigo-600 rounded transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEditar(o)} className="p-1 text-slate-300 hover:text-indigo-600 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          {/* Detalhe da OS selecionada */}
          {detalhe ? (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold text-indigo-600 text-base">{detalhe.numero}</p>
                    <p className="text-sm text-slate-600 font-medium">{detalhe.cliente_nome}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEditar(detalhe)} className="btn-secondary btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setDetalhe(null); setSelected(null); }} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Dados técnicos */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label:'Chapa',     value: detalhe.chapa_codigo||'—' },
                    { label:'Liga',      value: detalhe.chapa_liga||'—' },
                    { label:'Corte',     value: detalhe.corte_mm ? `${detalhe.corte_mm} mm` : '—' },
                    { label:'Espessura', value: detalhe.desbaste_mm ? `${detalhe.desbaste_mm} mm` : '—' },
                    { label:'Chapas',    value: detalhe.qtd_chapas||'—' },
                    { label:'Pedaços',   value: detalhe.qtd_pedacos||'—' },
                    { label:'Tempera',   value: detalhe.tempera||'—' },
                    { label:'Total Pç',  value: (detalhe.qtd_chapas||1)*(detalhe.qtd_pedacos||1) },
                  ].map(({label,value}) => (
                    <div key={label} className="bg-slate-50 rounded-lg px-2.5 py-2">
                      <p className="text-[10px] text-slate-400">{label}</p>
                      <p className="text-xs font-bold text-slate-800 font-mono">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Pesos */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-indigo-400 flex items-center justify-center gap-1 mb-1"><Weight className="w-2.5 h-2.5" />Peso Unit.</p>
                    <p className="text-lg font-bold text-indigo-700">{detalhe.peso_unitario_kg?Number(detalhe.peso_unitario_kg).toFixed(4):'—'}</p>
                    <p className="text-[10px] text-indigo-400">kg/peça</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mb-1"><Scale className="w-2.5 h-2.5" />Peso Total</p>
                    <p className="text-2xl font-bold text-emerald-700">{detalhe.peso_total_kg?Number(detalhe.peso_total_kg).toFixed(3):'—'}</p>
                    <p className="text-[10px] text-emerald-400">kg</p>
                  </div>
                </div>

                {/* Alterar Status */}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Alterar Status</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => mudarStatus(detalhe.id, s)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        detalhe.status===s ? STATUS_BG[s]+' border-2' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                      {STATUS_ICON[s]}{STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <button onClick={() => navigate('/lancamentos')}
                className="w-full btn-primary flex items-center gap-2">
                <Timer className="w-4 h-4" />Lançar Produção desta OS<ArrowRight className="w-4 h-4 ml-auto" />
              </button>
            </>
          ) : (
            <>
              {/* Resumo geral */}
              <div className="card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" />Em Aberto
                </p>
                <div className="space-y-2">
                  {[
                    { label:'OS Abertas',         value: countByStatus['aberta'],      color:'bg-blue-100 text-blue-700' },
                    { label:'Em Produção',         value: countByStatus['em_producao'], color:'bg-amber-100 text-amber-700' },
                    { label:'Peso Total Aberto',   value: `${totalPesoAberto.toFixed(1)} kg`, color:'bg-emerald-100 text-emerald-700' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-500">{s.label}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Próximas a vencer */}
              {ordens.filter(o=>o.data_previsao&&(o.status==='aberta'||o.status==='em_producao')).length > 0 && (
                <div className="card">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />Próximas Entregas
                  </p>
                  {ordens
                    .filter(o=>o.data_previsao&&(o.status==='aberta'||o.status==='em_producao'))
                    .sort((a,b)=>a.data_previsao.localeCompare(b.data_previsao))
                    .slice(0,5)
                    .map(o => (
                      <div key={o.id} className="flex items-center gap-2 py-1.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg cursor-pointer" onClick={() => verDetalhe(o)}>
                        <span className="font-mono text-xs font-bold text-indigo-600">{o.numero}</span>
                        <span className="text-xs text-slate-400 truncate flex-1">{o.cliente_nome}</span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">{fmtDate(o.data_previsao)}</span>
                      </div>
                    ))}
                </div>
              )}

              <div className="card bg-slate-900 text-white py-4">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Ações Rápidas</p>
                {[
                  { label:'Lançar Produção', path:'/lancamentos', icon:<Timer className="w-3.5 h-3.5" /> },
                  { label:'Ver Clientes', path:'/clientes', icon:<Wrench className="w-3.5 h-3.5" /> },
                ].map(a => (
                  <button key={a.path} onClick={() => navigate(a.path)}
                    className="w-full flex items-center gap-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded-lg transition-all">
                    {a.icon}<span>{a.label}</span><ArrowRight className="w-3 h-3 ml-auto" />
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-slate-400 py-2">← Clique em uma OS para ver detalhes</p>
            </>
          )}
        </div>
      </div>

      {/* ── Modal formulário OS ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth: 960, width:'95vw' }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">{editId?'Editar Ordem de Serviço':'Nova Ordem de Serviço'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Numeração automática · Al 2,7 g/cm³ · Peso calculado em tempo real</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                {error && <div className="alert-error mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">

                  {/* Col esquerda */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados da OS</p>
                      <div className="space-y-3">
                        <div>
                          <label className="label">Cliente *</label>
                          <select className="select" value={form.cliente_id} onChange={e => handleChange('cliente_id',e.target.value)} required>
                            <option value="">Selecione o cliente...</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Data Previsão</label>
                            <input type="date" className="input" value={form.data_previsao} onChange={e => handleChange('data_previsao',e.target.value)} />
                          </div>
                          <div>
                            <label className="label">Tempera</label>
                            <select className="select" value={form.tempera} onChange={e => handleChange('tempera',e.target.value)}>
                              {TEMPERAS.map(t => <option key={t} value={t}>{t||'—'}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="label">Descrição</label>
                          <input className="input" placeholder="Ex: Lâminas 320mm H14 para exportação..." value={form.descricao} onChange={e => handleChange('descricao',e.target.value)} />
                        </div>
                        {editId && (
                          <div>
                            <label className="label">Status</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {STATUS_LIST.map(s => (
                                <button key={s} type="button" onClick={() => setEditStatus(s)}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border ${editStatus===s?STATUS_BG[s]+' border-2':'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                  {STATUS_ICON[s]}{STATUS_LABELS[s]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Chapa / Material</p>
                      <select className="select" value={form.chapa_id} onChange={e => handleChange('chapa_id',e.target.value)}>
                        <option value="">Selecione a chapa...</option>
                        {chapas.map(c => (
                          <option key={c.id} value={c.id}>{c.codigo} — {c.liga} — {c.largura}×{c.espessura}mm (est. {c.quantidade})</option>
                        ))}
                      </select>
                      {selectedChapa && (
                        <div className="mt-2 p-3 bg-indigo-50 rounded-xl grid grid-cols-4 gap-3 text-center">
                          {[['Liga',selectedChapa.liga],['Largura',`${selectedChapa.largura}mm`],['Esp.',`${selectedChapa.espessura}mm`],['Estoque',`${selectedChapa.quantidade}un`]].map(([k,v]) => (
                            <div key={k}><p className="text-xs text-indigo-400">{k}</p><p className="font-bold text-indigo-800 text-sm">{v}</p></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Col direita */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Medidas e Quantidades</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Qtd Chapas</label>
                          <input type="number" min="1" className="input" value={form.qtd_chapas} onChange={e => handleChange('qtd_chapas',e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Pedaços / Chapa</label>
                          <input type="number" min="1" className="input" value={form.qtd_pedacos} onChange={e => handleChange('qtd_pedacos',e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Corte (mm)</label>
                          <input type="number" step="0.01" className="input" placeholder="ex: 450" value={form.corte_mm} onChange={e => handleChange('corte_mm',e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Desbaste / Esp. Final (mm)</label>
                          <input type="number" step="0.01" className="input" placeholder="ex: 3.26" value={form.desbaste_mm} onChange={e => handleChange('desbaste_mm',e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Laminar (%)</label>
                          <input type="number" step="0.1" min="0" max="100" className="input" placeholder="ex: 20" value={form.laminar_pct} onChange={e => handleChange('laminar_pct',e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Medida Final</label>
                          <input className="input bg-slate-50 text-slate-500 font-mono text-sm" readOnly value={calculo?.medida_final||'—'} />
                        </div>
                      </div>
                    </div>

                    {/* ── Calculadora de Laminação ── */}
                    {selectedChapa && form.desbaste_mm && (
                      <CalcLaminacao chapa={selectedChapa} desbasteMm={parseFloat(form.desbaste_mm)} corteMm={parseFloat(form.corte_mm)||0}
                        onApply={(pedacos) => handleChange('qtd_pedacos', String(pedacos))} />
                    )}

                    {/* Cálculo de peso */}
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5" />Cálculo de Peso
                      </p>
                      {calcLoading ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                          <span className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />Calculando...
                        </div>
                      ) : calculo ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Total Peças</p>
                            <p className="text-2xl font-bold text-slate-700">{totalPecas}</p>
                            <p className="text-xs text-slate-400">unidades</p>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Largura Chapa</p>
                            <p className="text-2xl font-bold text-slate-700">{calculo.largura_chapa}</p>
                            <p className="text-xs text-slate-400">mm</p>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-indigo-400 mb-1 flex items-center justify-center gap-1"><Weight className="w-3 h-3" />Peso Unitário</p>
                            <p className="text-2xl font-bold text-indigo-700">{Number(calculo.peso_unitario_kg).toFixed(4)}</p>
                            <p className="text-xs text-indigo-400">kg / peça</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-emerald-400 mb-1 flex items-center justify-center gap-1"><Weight className="w-3 h-3" />Peso Total</p>
                            <p className="text-3xl font-bold text-emerald-700">{Number(calculo.peso_total_kg).toFixed(3)}</p>
                            <p className="text-xs text-emerald-400">kg</p>
                          </div>
                          {calculo.formula && (
                            <div className="col-span-2 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono truncate">{calculo.formula}</div>
                          )}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                          Selecione a chapa e preencha Corte + Desbaste para calcular automaticamente
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : <><Check className="w-4 h-4" />{editId?'Salvar Alterações':'Criar OS'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
