import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
  Plus, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight,
  Layers, Settings, BarChart2, Download, CalendarDays,
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
interface Registro {
  id: number;
  data: string;
  observacoes: string;
  producao: ProducaoItem[];
  operador_id?: number;
}

export default function Laminacao() {
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [view, setView] = useState<'lancamento' | 'relatorio' | 'config'>('lancamento');

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState(today.toISOString().split('T')[0]);
  const [formObs, setFormObs] = useState('');
  const [prodRows, setProdRows] = useState<{ turno: number; maquina: string; valor: string }[]>([{ turno: 1, maquina: '', valor: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [novoMaqTurno, setNovoMaqTurno] = useState(1);
  const [novoMaqNome, setNovoMaqNome] = useState('');
  const [savingMaq, setSavingMaq] = useState(false);

  useEffect(() => {
    loadData();
  }, [ano, mes]);

  async function loadData() {
    setLoading(true);
    const mesStr = String(mes).padStart(2, '0');
    
    // Último dia do mês correto
    const ultimoDia = new Date(ano, mes, 0).getDate();
    
    console.log('Buscando registros para:', ano, mesStr, 'até dia', ultimoDia);
    
    // Buscar registros
    const { data: regs, error: regError } = await supabase
      .from('laminacao_registros')
      .select('*')
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-${ultimoDia}`)
      .order('data');
    
    console.log('Registros encontrados:', regs, 'Erro:', regError);
    
    if (regError) {
      console.error('Erro detalhado:', JSON.stringify(regError, null, 2));
    }
    
    // Buscar produção para cada registro
    const registrosComProducao = await Promise.all((regs || []).map(async (r) => {
      console.log('Buscando produção para registro:', r.id);
      const { data: prod, error: prodError } = await supabase
        .from('laminacao_producao')
        .select('*')
        .eq('registro_id', r.id);
      console.log('Produção encontrada:', prod, 'Erro:', prodError);
      return { ...r, producao: prod || [] };
    }));
    
    console.log('Registros com produção:', registrosComProducao);
    
    const { data: maqs } = await supabase
      .from('laminacao_maquinas_config')
      .select('*')
      .eq('ativo', true)
      .order('ordem');
    
    setRegistros(registrosComProducao);
    setMaquinas(maqs || []);
    setLoading(false);
  }

  const diasDoMes = useMemo(() => {
    const days: string[] = [];
    const last = new Date(ano, mes, 0).getDate();
    for (let d = 1; d <= last; d++) days.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return days;
  }, [ano, mes]);

  const regByDate = useMemo(() => {
    const m: Record<string, Registro> = {};
    registros.forEach(r => { m[r.data] = r; });
    return m;
  }, [registros]);

  const totais = useMemo(() => {
    let total = 0;
    registros.forEach(r => {
      total += r.producao?.reduce((s: number, p: ProducaoItem) => s + (p.valor || 0), 0) || 0;
    });
    return { total };
  }, [registros]);

  const mediaDia = registros.length > 0 ? totais.total / registros.length : 0;

  function openNovo(data?: string) {
    setEditId(null);
    setFormData(data || today.toISOString().split('T')[0]);
    setFormObs('');
    setProdRows([{ turno: 1, maquina: '', valor: '' }]);
    setError('');
    setModal(true);
  }

  function openEditar(r: Registro) {
    setEditId(r.id);
    setFormData(r.data);
    setFormObs(r.observacoes || '');
    setProdRows(r.producao?.map(p => ({ turno: p.turno, maquina: p.maquina, valor: String(p.valor) })) || [{ turno: 1, maquina: '', valor: '' }]);
    setError('');
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const producaoData = prodRows
        .filter(r => r.maquina && parseFloat(r.valor) > 0)
        .map(r => ({ turno: r.turno, maquina: r.maquina, valor: parseFloat(r.valor) }));
      
      console.log('Dados a salvar:', { formData, formObs, producaoData });

      if (editId) {
        await supabase.from('laminacao_registros').update({ data: formData, observacoes: formObs }).eq('id', editId);
        await supabase.from('laminacao_producao').delete().eq('registro_id', editId);
        if (producaoData.length) {
          const { error } = await supabase.from('laminacao_producao').insert(producaoData.map(p => ({ ...p, registro_id: editId })));
          if (error) console.error('Erro ao inserir produção (edit):', error);
        }
      } else {
        const { data: reg, error: regError } = await supabase.from('laminacao_registros').insert({ data: formData, observacoes: formObs }).select().single();
        console.log('Registro criado:', reg, 'Erro:', regError);
        if (producaoData.length && reg) {
          const { error } = await supabase.from('laminacao_producao').insert(producaoData.map(p => ({ ...p, registro_id: reg.id })));
          console.log('Produção inserida:', producaoData, 'Erro:', error);
        }
      }
      setModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('laminacao_producao').delete().eq('registro_id', id);
    await supabase.from('laminacao_registros').delete().eq('id', id);
    loadData();
  }

  async function addMaquina() {
    if (!novoMaqNome.trim()) return;
    setSavingMaq(true);
    await supabase.from('laminacao_maquinas_config').insert({ turno: novoMaqTurno, maquina: novoMaqNome.trim(), ordem: maquinas.length });
    setNovoMaqNome('');
    const { data } = await supabase.from('laminacao_maquinas_config').select('*').eq('ativo', true).order('ordem');
    setMaquinas(data || []);
    setSavingMaq(false);
  }

  async function removerMaquina(id: number) {
    if (!confirm('Remover máquina?')) return;
    await supabase.from('laminacao_maquinas_config').update({ ativo: false }).eq('id', id);
    const { data } = await supabase.from('laminacao_maquinas_config').select('*').eq('ativo', true).order('ordem');
    setMaquinas(data || []);
  }

  const exportExcel = () => {
    const rows: any[] = [];
    diasDoMes.forEach(data => {
      const reg = regByDate[data];
      if (!reg) {
        rows.push({ Data: fmtDate(data), Turno: '', Máquina: '', 'KG Produzidos': '', Observações: '' });
        return;
      }
      (reg.producao || []).forEach((p, idx) => {
        rows.push({
          Data: idx === 0 ? fmtDate(data) : '',
          Turno: TURNO_LABEL[p.turno],
          Máquina: p.maquina,
          'KG Produzidos': p.valor,
          Observações: idx === 0 ? (reg.observacoes || '') : ''
        });
      });
    });
    rows.push({ Data: 'TOTAL MÊS', Turno: '', Máquina: '', 'KG Produzidos': totais.total, Observações: '' });
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Laminação ${MESES_PT[mes - 1]} ${ano}`);
      XLSX.writeFile(wb, `laminacao_${ano}_${String(mes).padStart(2, '0')}.xlsx`);
    });
  };

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" /> Laminação
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

      {/* Nav mês/ano */}
      {view === 'lancamento' && (
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); }}><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex items-center gap-2">
            <select className="select w-36 py-1.5 text-sm" value={mes} onChange={e => setMes(+e.target.value)}>
              {MESES_PT.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
            </select>
            <select className="select w-24 py-1.5 text-sm" value={ano} onChange={e => setAno(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); }}><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-slate-600 ml-1">{MESES_PT[mes - 1]} {ano}</span>
        </div>
      )}

      {/* KPIs */}
      {view === 'lancamento' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Layers className="w-4 h-4 text-purple-500" />, bg: 'bg-purple-50', label: 'Produção Total', value: fmt(totais.total, 0), unit: 'kg' },
            { icon: <CalendarDays className="w-4 h-4 text-indigo-500" />, bg: 'bg-indigo-50', label: 'Dias com Lançamento', value: registros.length, unit: 'dias' },
            { icon: <BarChart2 className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50', label: 'Média/dia', value: fmt(mediaDia, 0), unit: 'kg' },
            { icon: <Settings className="w-4 h-4 text-slate-500" />, bg: 'bg-slate-100', label: 'Máquinas Ativas', value: maquinas.length, unit: 'un' },
          ].map(k => (
            <div key={k.label} className="card py-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{k.icon}</div>
              <div>
                <p className="text-xl font-bold text-slate-900 leading-tight">{k.value} <span className="text-xs font-normal text-slate-400">{k.unit}</span></p>
                <p className="text-xs text-slate-400">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: Configuração de máquinas */}
      {view === 'config' && (
        <div className="card max-w-lg">
          <p className="font-bold text-slate-800 mb-4">Máquinas por Turno</p>
          <div className="space-y-1.5 mb-5">
            {TURNOS.map(t => (
              <div key={t}>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">{TURNO_LABEL[t]}</p>
                {maquinas.filter(m => m.turno === t).map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl border bg-slate-50 border-slate-200 mb-1">
                    <span className="text-sm font-semibold text-slate-700">{m.maquina}</span>
                    <button onClick={() => removerMaquina(m.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <select className="select w-28" value={novoMaqTurno} onChange={e => setNovoMaqTurno(+e.target.value)}>
              {TURNOS.map(t => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
            </select>
            <input className="input flex-1" placeholder="Nome da máquina..." value={novoMaqNome} onChange={e => setNovoMaqNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMaquina()} />
            <button className="btn-primary" onClick={addMaquina} disabled={savingMaq}><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* VIEW: Lançamento - Tabela estilo planilha */}
      {view === 'lancamento' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs">
                  <th className="px-3 py-2.5 text-left font-semibold w-24">DATA</th>
                  <th className="px-3 py-2.5 text-left font-semibold">TURNO / MÁQUINA</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-28">KG</th>
                  <th className="px-3 py-2.5 text-left font-semibold">OBSERVAÇÕES</th>
                  <th className="px-2 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Carregando...</td></tr>
                ) : diasDoMes.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Nenhum dado</td></tr>
                ) : (
                  diasDoMes.map((data, idx) => {
                    const reg = regByDate[data];
                    const isWeekend = new Date(data).getDay() === 0 || new Date(data).getDay() === 6;
                    const bg = isWeekend ? 'bg-slate-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';
                    
                    if (!reg) {
                      return (
                        <tr key={data} className={`${bg} border-b border-slate-100 hover:bg-slate-50`}>
                          <td className="px-3 py-2 text-slate-400">{fmtDate(data)}</td>
                          <td className="px-3 py-2 text-slate-300 italic">—</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                          <td className="px-2 py-2">
                            <button onClick={() => openNovo(data)} className="p-1 text-slate-300 hover:text-indigo-600"><Plus className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      );
                    }

                    const prod = reg.producao || [];
                    const totalDia = prod.reduce((s, p) => s + (p.valor || 0), 0);

                    return (
                      <React.Fragment key={data}>
                        {prod.map((p, i) => (
                          <tr key={`${data}-${i}`} className={`${bg} border-b border-slate-100 hover:bg-slate-50`}>
                            {i === 0 && (
                              <td rowSpan={prod.length || 1} className="px-3 py-2 font-mono text-slate-700 align-top">
                                {fmtDate(data)}
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <span className="text-xs font-bold text-slate-500 mr-2">{TURNO_LABEL[p.turno]}</span>
                              <span className="text-slate-700">{p.maquina}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(p.valor, 0)}</td>
                            {i === 0 && (
                              <td rowSpan={prod.length || 1} className="px-3 py-2 text-slate-500 align-top">{reg.observacoes}</td>
                            )}
                            {i === 0 && (
                              <td rowSpan={prod.length || 1} className="px-2 py-2 align-top">
                                <div className="flex gap-1">
                                  <button onClick={() => openEditar(reg)} className="p-1 text-slate-300 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => excluir(reg.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                        {prod.length === 0 && (
                          <tr className={`${bg} border-b border-slate-100`}>
                            <td className="px-3 py-2 font-mono text-slate-700">{fmtDate(data)}</td>
                            <td className="px-3 py-2 text-slate-300 italic">Sem produção</td>
                            <td className="px-3 py-2"></td>
                            <td className="px-3 py-2 text-slate-500">{reg.observacoes}</td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                <button onClick={() => openEditar(reg)} className="p-1 text-slate-300 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => excluir(reg.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                {/* Total */}
                <tr className="bg-slate-100 font-bold">
                  <td className="px-3 py-3 text-slate-700" colSpan={2}>TOTAL DO MÊS</td>
                  <td className="px-3 py-3 text-right font-mono text-indigo-700">{fmt(totais.total, 0)} kg</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal max-w-lg">
            <div className="modal-header">
              <h3 className="font-bold text-lg">{editId ? 'Editar Registro' : 'Novo Registro'}</h3>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body space-y-4">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4" />{error}</div>}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Data *</label>
                    <input type="date" className="input" value={formData} onChange={e => setFormData(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Observações</label>
                    <input className="input" value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Opcional" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Produção por Turno/Máquina (KG)</label>
                    <button type="button" onClick={() => setProdRows([...prodRows, { turno: 1, maquina: '', valor: '' }])} className="btn-secondary btn-sm">
                      <Plus className="w-3.5 h-3.5" />Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {prodRows.map((row, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select className="select w-28" value={row.turno} onChange={e => {
                          const newRows = [...prodRows];
                          newRows[idx].turno = +e.target.value;
                          setProdRows(newRows);
                        }}>
                          {TURNOS.map(t => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
                        </select>
                        <select className="select flex-1" value={row.maquina} onChange={e => {
                          const newRows = [...prodRows];
                          newRows[idx].maquina = e.target.value;
                          setProdRows(newRows);
                        }}>
                          <option value="">Selecione...</option>
                          {maquinas.filter(m => m.turno === row.turno).map(m => <option key={m.id} value={m.maquina}>{m.maquina}</option>)}
                        </select>
                        <input type="number" className="input w-24" placeholder="kg" value={row.valor} onChange={e => {
                          const newRows = [...prodRows];
                          newRows[idx].valor = e.target.value;
                          setProdRows(newRows);
                        }} />
                        {prodRows.length > 1 && (
                          <button type="button" onClick={() => setProdRows(prodRows.filter((_, i) => i !== idx))} className="p-1 text-slate-300 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : <><Check className="w-4 h-4" />Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
