import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import {
  Plus, Edit2, Trash2, X, Check, AlertCircle,
  ChevronLeft, ChevronRight, Settings, BarChart2,
  Layers, CalendarDays, Download,
} from 'lucide-react';

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TURNOS = [1, 2, 3];
const TURNO_LABEL: Record<number, string> = { 1: 'Turno 1', 2: 'Turno 2', 3: 'Turno 3' };

function fmt(v: number | null | undefined, dec = 0) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtDate(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

interface Maquina { id: number; turno: number; maquina: string; ordem: number; }
interface ProducaoItem { turno: number; maquina: string; valor: number; }
interface ProducaoRow { turno: number; maquina: string; valor: string; }
interface Registro { id: number; data: string; observacoes: string; producao: ProducaoItem[]; total: number; }

export default function Laminacao() {
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [view, setView] = useState<'lancamento' | 'relatorio' | 'config'>('lancamento');

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [totalMes, setTotalMes] = useState(0);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [relatorio, setRelatorio] = useState<any>(null);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState(today.toISOString().split('T')[0]);
  const [formObs, setFormObs] = useState('');
  const [prodRows, setProdRows] = useState<ProducaoRow[]>([{ turno: 1, maquina: '', valor: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [novoMaqTurno, setNovoMaqTurno] = useState(1);
  const [novoMaqNome, setNovoMaqNome] = useState('');
  const [savingMaq, setSavingMaq] = useState(false);

  const maqByTurno = useMemo(() => {
    const m: Record<number, Maquina[]> = {};
    TURNOS.forEach(t => { m[t] = maquinas.filter(mq => mq.turno === t).sort((a, b) => a.ordem - b.ordem); });
    return m;
  }, [maquinas]);

  const loadData = useCallback(async () => {
    const [d, m] = await Promise.all([
      api.get(`/laminacao?ano=${ano}&mes=${mes}`),
      api.get('/laminacao/maquinas'),
    ]);
    setRegistros(d.registros);
    setTotalMes(d.total_mes);
    setMaquinas(m);
  }, [ano, mes]);

  const loadRelatorio = useCallback(async () => {
    const r = await api.get(`/laminacao/relatorio/mensal?ano=${ano}`);
    setRelatorio(r);
  }, [ano]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (view === 'relatorio') loadRelatorio(); }, [view, loadRelatorio]);

  const emptyProdRow = (): ProducaoRow => ({ turno: 1, maquina: '', valor: '' });

  const openNovo = (data?: string) => {
    const d = data || new Date(ano, mes - 1, today.getDate()).toISOString().split('T')[0];
    setFormData(d); setFormObs('');
    setProdRows(maquinas.length > 0
      ? maquinas.map(mq => ({ turno: mq.turno, maquina: mq.maquina, valor: '' }))
      : [emptyProdRow()]);
    setEditId(null); setError(''); setModal(true);
  };

  const openEditar = (r: Registro) => {
    setFormData(r.data); setFormObs(r.observacoes || '');
    if (r.producao.length > 0) {
      setProdRows(r.producao.map(p => ({ turno: p.turno, maquina: p.maquina, valor: String(p.valor || '') })));
    } else {
      setProdRows([emptyProdRow()]);
    }
    setEditId(r.id); setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const producao: ProducaoItem[] = prodRows
        .filter(r => r.maquina.trim() && parseFloat(r.valor) > 0)
        .map(r => ({ turno: r.turno, maquina: r.maquina.trim(), valor: parseFloat(r.valor) }));
      const payload = { data: formData, observacoes: formObs || null, producao };
      if (editId) await api.put(`/laminacao/${editId}`, payload);
      else await api.post('/laminacao', payload);
      setModal(false); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await api.delete(`/laminacao/${id}`); loadData();
  };

  const addMaquina = async () => {
    if (!novoMaqNome.trim()) return;
    setSavingMaq(true);
    await api.post('/laminacao/maquinas', { turno: novoMaqTurno, maquina: novoMaqNome });
    setNovoMaqNome('');
    const m = await api.get('/laminacao/maquinas');
    setMaquinas(m);
    setSavingMaq(false);
  };

  const removerMaquina = async (id: number) => {
    await api.delete(`/laminacao/maquinas/${id}`);
    const m = await api.get('/laminacao/maquinas');
    setMaquinas(m);
  };

  const diasDoMes = useMemo(() => {
    const days: string[] = [];
    const last = new Date(ano, mes, 0).getDate();
    for (let d = 1; d <= last; d++) days.push(`${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    return days;
  }, [ano, mes]);

  const regByDate = useMemo(() => {
    const m: Record<string, Registro> = {};
    registros.forEach(r => { m[r.data] = r; });
    return m;
  }, [registros]);

  const totalMesForm = useMemo(() => {
    return prodRows.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
  }, [prodRows]);

  const exportExcel = () => {
    const rows: any[] = [];
    diasDoMes.forEach(data => {
      const reg = regByDate[data];
      if (!reg) return;
      const row: any = { Data: fmtDate(data) };
      TURNOS.forEach(t => {
        maqByTurno[t]?.forEach(mq => {
          const val = reg.producao.find(p => p.turno === t && p.maquina === mq.maquina)?.valor || 0;
          row[`T${t} - ${mq.maquina}`] = val;
        });
      });
      row.Total = reg.total;
      row.Observações = reg.observacoes || '';
      rows.push(row);
    });
    const totalRow: any = { Data: 'TOTAL MÊS' };
    TURNOS.forEach(t => {
      maqByTurno[t]?.forEach(mq => {
        totalRow[`T${t} - ${mq.maquina}`] = registros.reduce((s, r) => s + (r.producao.find(p => p.turno === t && p.maquina === mq.maquina)?.valor || 0), 0);
      });
    });
    totalRow.Total = totalMes;
    rows.push(totalRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laminação ${MESES_PT[mes - 1]} ${ano}`);
    XLSX.writeFile(wb, `laminacao_${ano}_${String(mes).padStart(2,'0')}.xlsx`);
  };

  const TURNO_COLORS: Record<number, string> = {
    1: 'bg-indigo-700',
    2: 'bg-slate-700',
    3: 'bg-teal-700',
  };

  return (
    <div className="space-y-5 max-w-[1600px]">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" /> Laminação
          </h1>
          <p className="page-subtitle">Produção Diária por Turno e Máquina</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setView('config')} className={`btn-secondary btn-sm ${view === 'config' ? 'ring-2 ring-slate-900' : ''}`}>
            <Settings className="w-3.5 h-3.5" />Máquinas
          </button>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(['lancamento','relatorio'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                {v === 'lancamento' ? 'Lançamento' : 'Relatório Anual'}
              </button>
            ))}
          </div>
          {view === 'lancamento' && (
            <>
              <button className="btn-secondary btn-sm" onClick={exportExcel}><Download className="w-3.5 h-3.5" />Excel</button>
              <button className="btn-primary" onClick={() => openNovo()}><Plus className="w-4 h-4" />Novo Registro</button>
            </>
          )}
        </div>
      </div>

      {view === 'lancamento' && (
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={() => { if (mes === 1) { setMes(12); setAno(a => a-1); } else setMes(m => m-1); }}><ChevronLeft className="w-4 h-4" /></button>
          <select className="select w-36 py-1.5 text-sm" value={mes} onChange={e => setMes(+e.target.value)}>
            {MESES_PT.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
          </select>
          <select className="select w-24 py-1.5 text-sm" value={ano} onChange={e => setAno(+e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-secondary btn-sm" onClick={() => { if (mes === 12) { setMes(1); setAno(a => a+1); } else setMes(m => m+1); }}><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-slate-600 ml-1">{MESES_PT[mes-1]} {ano}</span>
        </div>
      )}

      {view === 'lancamento' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0"><Layers className="w-4 h-4 text-indigo-500" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{fmt(totalMes, 0)}</p>
              <p className="text-xs text-slate-400">Total Mês</p>
            </div>
          </div>
          <div className="card py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0"><BarChart2 className="w-4 h-4 text-slate-500" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{registros.length > 0 ? fmt(totalMes / registros.length, 0) : '—'}</p>
              <p className="text-xs text-slate-400">Média/dia</p>
            </div>
          </div>
          {TURNOS.slice(0, 2).map(t => {
            const total = registros.reduce((s, r) => s + r.producao.filter(p => p.turno === t).reduce((ss, p) => ss + p.valor, 0), 0);
            return (
              <div key={t} className="card py-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t === 1 ? 'bg-indigo-50' : 'bg-teal-50'}`}>
                  <span className="text-sm font-bold text-slate-600">T{t}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{fmt(total, 0)}</p>
                  <p className="text-xs text-slate-400">{TURNO_LABEL[t]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View Config Máquinas ── */}
      {view === 'config' && (
        <div className="card max-w-lg">
          <p className="font-bold text-slate-800 mb-4">Máquinas por Turno</p>
          {TURNOS.map(t => (
            <div key={t} className="mb-4">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${t === 1 ? 'text-indigo-600' : t === 2 ? 'text-slate-500' : 'text-teal-600'}`}>{TURNO_LABEL[t]}</p>
              <div className="space-y-1.5">
                {maqByTurno[t]?.map(mq => (
                  <div key={mq.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-sm font-semibold text-slate-700 font-mono">{mq.maquina}</span>
                    <button onClick={() => removerMaquina(mq.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <select className="select w-32" value={novoMaqTurno} onChange={e => setNovoMaqTurno(+e.target.value)}>
              {TURNOS.map(t => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
            </select>
            <input className="input flex-1" placeholder="Nome da máquina" value={novoMaqNome} onChange={e => setNovoMaqNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMaquina()} />
            <button className="btn-primary" onClick={addMaquina} disabled={savingMaq}><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ── View Lancamento (tabela planilha) ── */}
      {view === 'lancamento' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                {/* Agrupamento por turno */}
                <tr className="bg-slate-800 text-white text-[11px]">
                  <th className="px-3 py-2 text-left sticky left-0 bg-slate-800"></th>
                  {TURNOS.map(t => {
                    const cols = maqByTurno[t]?.length || 0;
                    if (!cols) return null;
                    return <th key={t} colSpan={cols} className={`px-3 py-2 text-center font-bold border-l border-slate-700 ${TURNO_COLORS[t]}`}>{TURNO_LABEL[t]}</th>;
                  })}
                  <th className="px-3 py-2 text-right bg-slate-900 border-l border-slate-700">TOTAL</th>
                  <th className="px-2 py-2 w-12 bg-slate-800"></th>
                </tr>
                <tr className="bg-slate-900 text-white">
                  <th className="px-3 py-2.5 text-left font-semibold sticky left-0 bg-slate-900 z-10">DIA</th>
                  {TURNOS.flatMap(t => (maqByTurno[t] || []).map(mq => (
                    <th key={`${t}_${mq.maquina}`} className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{mq.maquina}</th>
                  )))}
                  <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap bg-slate-800">TOTAL</th>
                  <th className="px-2 py-2.5 w-12"></th>
                </tr>
                <tr className="bg-slate-100 border-b-2 border-slate-300 font-bold text-xs">
                  <td className="px-3 py-2 text-slate-500 sticky left-0 bg-slate-100 z-10 uppercase tracking-wide text-[11px]">TOTAL MÊS</td>
                  {TURNOS.flatMap(t => (maqByTurno[t] || []).map(mq => {
                    const val = registros.reduce((s, r) => s + (r.producao.find(p => p.turno === t && p.maquina === mq.maquina)?.valor || 0), 0);
                    return <td key={`${t}_${mq.maquina}`} className="px-3 py-2 text-right tabular-nums text-slate-700">{val > 0 ? fmt(val, 0) : '—'}</td>;
                  }))}
                  <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-200">{fmt(totalMes, 0)}</td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {diasDoMes.map(data => {
                  const reg = regByDate[data];
                  const dow = new Date(data + 'T12:00:00').getDay();
                  const isSun = dow === 0; const isSat = dow === 6;
                  const dayNum = parseInt(data.split('-')[2]);
                  return (
                    <tr key={data} className={`border-b border-slate-100 transition-colors ${reg ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-50/50'} ${(isSun || isSat) ? 'bg-slate-50/70' : ''}`}>
                      <td className={`px-3 py-2 sticky left-0 z-10 whitespace-nowrap font-semibold ${(isSun || isSat) ? 'bg-slate-100 text-slate-400' : reg ? 'bg-white text-indigo-600' : 'bg-white text-slate-400'}`}>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{String(dayNum).padStart(2,'0')}/{String(mes).padStart(2,'0')}/{ano}</span>
                          {isSun && <span className="text-[9px] font-bold text-rose-400">DOM</span>}
                          {isSat && <span className="text-[9px] font-bold text-amber-500">SAB</span>}
                        </div>
                      </td>
                      {TURNOS.flatMap(t => (maqByTurno[t] || []).map(mq => {
                        const val = reg?.producao.find(p => p.turno === t && p.maquina === mq.maquina)?.valor;
                        return (
                          <td key={`${t}_${mq.maquina}`} className="px-3 py-2 text-right tabular-nums text-slate-600">
                            {val ? <span className="font-semibold">{fmt(val, 0)}</span> : <span className="text-slate-200">—</span>}
                          </td>
                        );
                      }))}
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800 bg-slate-50">
                        {reg ? fmt(reg.total, 0) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {reg ? (
                          <div className="flex gap-0.5 justify-center">
                            <button onClick={() => openEditar(reg)} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => excluir(reg.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => openNovo(data)} className="p-1 text-slate-200 hover:text-indigo-500 transition-colors rounded"><Plus className="w-3.5 h-3.5" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View Relatório Anual ── */}
      {view === 'relatorio' && relatorio && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-500" />Resumo Anual — {ano}</p>
            <select className="select w-24 py-1.5 text-sm" value={ano} onChange={e => setAno(+e.target.value)}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-2.5 text-left sticky left-0 bg-slate-900">MÊS</th>
                  <th className="px-3 py-2.5 text-right">DIAS</th>
                  <th className="px-3 py-2.5 text-right">TOTAL</th>
                  {relatorio.maquinas?.map((mq: any) => (
                    <th key={`${mq.turno}_${mq.maquina}`} className="px-3 py-2.5 text-right whitespace-nowrap">T{mq.turno} {mq.maquina}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(relatorio.meses || []).map((m: any) => (
                  <tr key={m.mes} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-700 capitalize sticky left-0 bg-white">{m.mes_nome}</td>
                    <td className="px-3 py-3 text-right text-slate-500">{m.dias}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">{fmt(m.total, 0)}</td>
                    {relatorio.maquinas?.map((mq: any) => (
                      <td key={`${mq.turno}_${mq.maquina}`} className="px-3 py-3 text-right text-slate-600">
                        {fmt(m.maquinas?.[`${mq.turno}_${mq.maquina}`] || 0, 0)}
                      </td>
                    ))}
                  </tr>
                ))}
                {relatorio.meses?.length > 0 && (
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="px-4 py-3 sticky left-0 bg-slate-900 uppercase text-xs tracking-wider">TOTAL {ano}</td>
                    <td className="px-3 py-3 text-right">{relatorio.meses.reduce((s: number, m: any) => s + m.dias, 0)}</td>
                    <td className="px-3 py-3 text-right">{fmt(relatorio.meses.reduce((s: number, m: any) => s + m.total, 0), 0)}</td>
                    {relatorio.maquinas?.map((mq: any) => (
                      <td key={`${mq.turno}_${mq.maquina}`} className="px-3 py-3 text-right">
                        {fmt(relatorio.meses.reduce((s: number, m: any) => s + (m.maquinas?.[`${mq.turno}_${mq.maquina}`] || 0), 0), 0)}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Lançamento ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" />{editId ? 'Editar Registro' : 'Novo Registro — Laminação'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{fmtDate(formData)}</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body max-h-[75vh] overflow-y-auto space-y-5">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Data *</label>
                    <input type="date" className="input" value={formData} onChange={e => setFormData(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Observações</label>
                    <input className="input" placeholder="Opcional..." value={formObs} onChange={e => setFormObs(e.target.value)} />
                  </div>
                </div>

                {/* Linhas turno + máquina + kg */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Produção por Turno / Máquina (kg)</p>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setProdRows(r => [...r, emptyProdRow()])}>
                      <Plus className="w-3.5 h-3.5" />Adicionar Linha
                    </button>
                  </div>
                  <div className="space-y-2">
                    {/* Cabeçalho */}
                    <div className="grid grid-cols-[80px_1fr_120px_32px] gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      <span>Turno</span><span>Máquina</span><span className="text-right">Kg produzidos</span><span></span>
                    </div>
                    {prodRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-[80px_1fr_120px_32px] gap-2 items-center">
                        <select
                          className="select text-xs py-1.5"
                          value={row.turno}
                          onChange={e => setProdRows(rows => rows.map((r, idx) => idx === i ? { ...r, turno: +e.target.value } : r))}>
                          {TURNOS.map(t => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
                        </select>
                        <input
                          className="input text-xs py-1.5 font-mono"
                          list={`maq-list-${i}`}
                          placeholder="Ex: Desbaste 01"
                          value={row.maquina}
                          onChange={e => setProdRows(rows => rows.map((r, idx) => idx === i ? { ...r, maquina: e.target.value } : r))} />
                        <datalist id={`maq-list-${i}`}>
                          {maquinas.filter(mq => mq.turno === row.turno).map(mq => (
                            <option key={mq.id} value={mq.maquina} />
                          ))}
                        </datalist>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          className="input text-xs py-1.5 text-right tabular-nums"
                          placeholder="0"
                          value={row.valor}
                          onChange={e => setProdRows(rows => rows.map((r, idx) => idx === i ? { ...r, valor: e.target.value } : r))} />
                        {prodRows.length > 1 ? (
                          <button type="button" onClick={() => setProdRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                  </div>
                </div>

                {totalMesForm > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-xs text-indigo-500 font-semibold">Total lançado neste dia</p>
                    <p className="text-2xl font-bold text-indigo-700">{fmt(totalMesForm, 0)} <span className="text-sm font-normal text-indigo-400">kg</span></p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : <><Check className="w-4 h-4" />Salvar Registro</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
