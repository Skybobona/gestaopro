import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import {
  Plus, Edit2, Trash2, Search, X, Check, Package, AlertCircle,
  ArrowUpDown, AlertTriangle, TrendingUp, Layers, ChevronRight,
  BarChart2, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';

interface Chapa {
  id: number; codigo: string; liga: string; espessura: number;
  largura: number; comprimento: number; peso_kg: number; quantidade: number;
  fornecedor: string; lote: string;
}

const empty = { codigo: '', liga: '', espessura: '', largura: '', comprimento: '', peso_kg: '', quantidade: '0', fornecedor: '', lote: '' };

const LIGAS_COMUNS = ['1050', '1060', '1100', '3003', '3105', '5052', '5754', '6061', '6063', '8011'];

export default function Chapas() {
  const [chapas, setChapas] = useState<Chapa[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [ligaFilter, setLigaFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [estoqueModal, setEstoqueModal] = useState<Chapa | null>(null);
  const [editing, setEditing] = useState<Chapa | null>(null);
  const [selected, setSelected] = useState<Chapa | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [qtdAjuste, setQtdAjuste] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState<'entrada' | 'saida'>('entrada');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => Promise.all([
    api.get('/chapas').then(setChapas),
    api.get('/producao/os').then(setOrdens).catch(() => {}),
  ]);
  useEffect(() => { load(); }, []);

  const calcPeso = () => {
    const e = parseFloat(form.espessura), l = parseFloat(form.largura), c = parseFloat(form.comprimento);
    if (e && l && c) setForm(f => ({ ...f, peso_kg: ((e / 10) * (l / 10) * (c / 10) * 2.7).toFixed(3) }));
  };

  const openNew = () => { setForm({ ...empty }); setEditing(null); setError(''); setModal(true); };
  const openEdit = (c: Chapa) => {
    setForm({ codigo: c.codigo, liga: c.liga, espessura: String(c.espessura), largura: String(c.largura), comprimento: String(c.comprimento), peso_kg: String(c.peso_kg), quantidade: String(c.quantidade), fornecedor: c.fornecedor || '', lote: c.lote || '' });
    setEditing(c); setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = { ...form, espessura: parseFloat(form.espessura), largura: parseFloat(form.largura), comprimento: parseFloat(form.comprimento), peso_kg: parseFloat(form.peso_kg), quantidade: parseInt(form.quantidade) };
      if (editing) await api.put(`/chapas/${editing.id}`, data);
      else await api.post('/chapas', data);
      setModal(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const ajustarEstoque = async () => {
    if (!estoqueModal || !qtdAjuste) return;
    const delta = ajusteTipo === 'entrada' ? Math.abs(parseInt(qtdAjuste)) : -Math.abs(parseInt(qtdAjuste));
    await api.patch(`/chapas/${estoqueModal.id}/estoque`, { quantidade: delta });
    setEstoqueModal(null); setQtdAjuste(''); load();
  };

  const remove = async (id: number) => {
    if (!confirm('Excluir esta chapa?')) return;
    await api.delete(`/chapas/${id}`); load();
    if (selected?.id === id) setSelected(null);
  };

  const ligas = useMemo(() => [...new Set(chapas.map(c => c.liga))].sort(), [chapas]);

  const filtered = useMemo(() => chapas.filter(c =>
    (!ligaFilter || c.liga === ligaFilter) &&
    (!search || c.codigo.toLowerCase().includes(search.toLowerCase()) || c.liga.toLowerCase().includes(search.toLowerCase()) || (c.fornecedor || '').toLowerCase().includes(search.toLowerCase()))
  ), [chapas, search, ligaFilter]);

  const criticos = chapas.filter(c => c.quantidade <= 5);
  const totalEstoque = chapas.reduce((s, c) => s + c.quantidade, 0);
  const pesoTotalEstoque = chapas.reduce((s, c) => s + c.peso_kg * c.quantidade, 0);

  const ordensDaChapa = selected ? ordens.filter(o => o.chapa_id === selected.id) : [];

  const novaQtd = qtdAjuste && estoqueModal
    ? ajusteTipo === 'entrada'
      ? estoqueModal.quantidade + Math.abs(parseInt(qtdAjuste || '0'))
      : estoqueModal.quantidade - Math.abs(parseInt(qtdAjuste || '0'))
    : null;

  return (
    <div className="space-y-5 max-w-[1600px]">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chapas de Alumínio</h1>
          <p className="page-subtitle">{chapas.length} tipos · {totalEstoque} unidades · {pesoTotalEstoque.toFixed(0)} kg em estoque</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus className="w-4 h-4" />Nova Chapa</button>
      </div>

      {/* Alertas de estoque crítico */}
      {criticos.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Estoque crítico em {criticos.length} tipo{criticos.length > 1 ? 's' : ''}</p>
            <div className="flex gap-2 flex-wrap mt-1">
              {criticos.map(c => (
                <button key={c.id} onClick={() => { setSelected(c); setEstoqueModal(c); setQtdAjuste(''); setAjusteTipo('entrada'); }}
                  className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors">
                  {c.codigo} ({c.quantidade} un)
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main 2-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ── Lista ── */}
        <div className="card p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input className="input pl-9 py-2 text-sm" placeholder="Código, liga ou fornecedor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setLigaFilter('')} className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${!ligaFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Todas
              </button>
              {ligas.map(l => (
                <button key={l} onClick={() => setLigaFilter(ligaFilter === l ? '' : l)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${ligaFilter === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {l}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} tipo{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Grid de chapas */}
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <div className="px-4 py-16 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="font-semibold">Nenhuma chapa encontrada</p>
                <button className="btn-primary btn-sm mt-4" onClick={openNew}><Plus className="w-3.5 h-3.5" />Cadastrar</button>
              </div>
            )}
            {filtered.map(c => {
              const isSelected = selected?.id === c.id;
              const statusColor = c.quantidade <= 0 ? 'text-rose-600 bg-rose-50' : c.quantidade <= 5 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
              return (
                <div key={c.id}
                  onClick={() => setSelected(isSelected ? null : c)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-slate-50/60 border-l-2 border-transparent'}`}>
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Layers className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 text-sm">{c.codigo}</span>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">{c.liga}</span>
                      {c.quantidade <= 5 && c.quantidade > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Crítico</span>}
                      {c.quantidade <= 0 && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-semibold">Zerado</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <span>{c.espessura}×{c.largura}×{c.comprimento} mm</span>
                      <span>{c.peso_kg} kg/un</span>
                      {c.fornecedor && <span className="truncate max-w-[120px]">{c.fornecedor}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`text-center px-2.5 py-1 rounded-lg ${statusColor}`}>
                      <p className="text-lg font-bold leading-tight">{c.quantidade}</p>
                      <p className="text-[10px] font-medium">un</p>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={e => { e.stopPropagation(); setEstoqueModal(c); setQtdAjuste(''); setAjusteTipo('entrada'); }} className="p-1.5 text-slate-300 hover:text-emerald-600 transition-colors rounded-lg" title="Ajustar estoque"><ArrowUpDown className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); remove(c.id); }} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
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
          {selected ? (
            <>
              {/* Detalhe da chapa */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono font-bold text-indigo-600 text-lg">{selected.codigo}</p>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">{selected.liga}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(selected)} className="btn-secondary btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setSelected(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    ['Espessura', `${selected.espessura} mm`],
                    ['Largura', `${selected.largura} mm`],
                    ['Comprimento', `${selected.comprimento} mm`],
                    ['Peso/un', `${selected.peso_kg} kg`],
                    ['Fornecedor', selected.fornecedor || '—'],
                    ['Lote', selected.lote || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-lg px-2.5 py-2">
                      <p className="text-[10px] text-slate-400">{k}</p>
                      <p className="text-xs font-bold text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
                <div className={`rounded-xl p-3 text-center border ${selected.quantidade <= 0 ? 'bg-rose-50 border-rose-200' : selected.quantidade <= 5 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-3xl font-bold ${selected.quantidade <= 0 ? 'text-rose-600' : selected.quantidade <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{selected.quantidade}</p>
                  <p className="text-xs text-slate-500">unidades em estoque</p>
                  <p className="text-xs font-semibold text-slate-600 mt-1">{(selected.peso_kg * selected.quantidade).toFixed(1)} kg total</p>
                </div>
                <button onClick={() => { setEstoqueModal(selected); setQtdAjuste(''); setAjusteTipo('entrada'); }}
                  className="mt-3 w-full btn-secondary btn-sm">
                  <ArrowUpDown className="w-3.5 h-3.5" />Ajustar Estoque
                </button>
              </div>

              {/* OS usando esta chapa */}
              <div className="card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />Ordens de Serviço
                </p>
                {ordensDaChapa.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhuma OS usa esta chapa</p>
                ) : (
                  <div className="space-y-1.5">
                    {ordensDaChapa.slice(0, 6).map(o => (
                      <div key={o.id} className="flex items-center gap-2 py-1 -mx-1 px-1 rounded-lg hover:bg-slate-50">
                        <span className="font-mono text-xs font-bold text-indigo-600">{o.numero}</span>
                        <span className="text-xs text-slate-500 truncate flex-1">{o.cliente_nome}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${o.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : o.status === 'em_producao' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {o.status === 'em_producao' ? 'Produz.' : o.status === 'concluida' ? 'Conc.' : 'Aberta'}
                        </span>
                      </div>
                    ))}
                    {ordensDaChapa.length > 6 && (
                      <p className="text-xs text-slate-400 text-center pt-1">+{ordensDaChapa.length - 6} mais</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Stats por liga */}
              <div className="card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" />Estoque por Liga
                </p>
                {ligas.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhuma chapa cadastrada</p>
                ) : ligas.map(liga => {
                  const chapasDaLiga = chapas.filter(c => c.liga === liga);
                  const qtd = chapasDaLiga.reduce((s, c) => s + c.quantidade, 0);
                  const maxQtd = Math.max(...ligas.map(l => chapas.filter(c => c.liga === l).reduce((s, c) => s + c.quantidade, 0)));
                  return (
                    <div key={liga} className="mb-3 cursor-pointer" onClick={() => setLigaFilter(ligaFilter === liga ? '' : liga)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-700 w-12">{liga}</span>
                        <span className="text-[10px] text-slate-400 flex-1">{chapasDaLiga.length} tipo{chapasDaLiga.length !== 1 ? 's' : ''}</span>
                        <span className="text-xs font-bold text-slate-800">{qtd} <span className="text-slate-400 font-normal">un</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${maxQtd > 0 ? (qtd / maxQtd * 100).toFixed(0) : 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumo geral */}
              <div className="card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />Resumo
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Tipos cadastrados', value: chapas.length, icon: <Layers className="w-4 h-4 text-indigo-400" /> },
                    { label: 'Unidades em estoque', value: totalEstoque, icon: <Package className="w-4 h-4 text-emerald-400" /> },
                    { label: 'Peso total (kg)', value: pesoTotalEstoque.toFixed(0), icon: <TrendingUp className="w-4 h-4 text-blue-400" /> },
                    { label: 'Estoque crítico', value: criticos.length, icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      {s.icon}
                      <span className="text-xs text-slate-600 flex-1">{s.label}</span>
                      <span className="text-sm font-bold text-slate-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-xs text-slate-400 py-2">← Clique em uma chapa para ver detalhes</p>
            </>
          )}
        </div>
      </div>

      {/* Modal cadastro */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900">{editing ? 'Editar Chapa' : 'Nova Chapa'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Al = 2,7 g/cm³ · Peso calculado automaticamente</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body space-y-4">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Código *</label>
                    <input className="input font-mono" placeholder="ex: CH-1050-3.5" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} required />
                  </div>
                  <div>
                    <label className="label">Liga *</label>
                    <input className="input" list="ligas-list" placeholder="ex: 1050, 3003..." value={form.liga} onChange={e => setForm(f => ({ ...f, liga: e.target.value }))} required />
                    <datalist id="ligas-list">{LIGAS_COMUNS.map(l => <option key={l} value={l} />)}</datalist>
                  </div>
                  <div>
                    <label className="label">Espessura (mm) *</label>
                    <input type="number" step="0.01" className="input" placeholder="ex: 3.50" value={form.espessura} onChange={e => setForm(f => ({ ...f, espessura: e.target.value }))} onBlur={calcPeso} required />
                  </div>
                  <div>
                    <label className="label">Largura (mm) *</label>
                    <input type="number" step="0.1" className="input" placeholder="ex: 1000" value={form.largura} onChange={e => setForm(f => ({ ...f, largura: e.target.value }))} onBlur={calcPeso} required />
                  </div>
                  <div>
                    <label className="label">Comprimento (mm) *</label>
                    <input type="number" step="0.1" className="input" placeholder="ex: 2000" value={form.comprimento} onChange={e => setForm(f => ({ ...f, comprimento: e.target.value }))} onBlur={calcPeso} required />
                  </div>
                  <div>
                    <label className="label">Peso unitário (kg)</label>
                    <input type="number" step="0.001" className="input bg-indigo-50 font-mono" placeholder="Calculado automaticamente" value={form.peso_kg} onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Quantidade inicial</label>
                    <input type="number" min="0" className="input" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Fornecedor</label>
                    <input className="input" placeholder="Nome do fornecedor" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Lote / Referência</label>
                    <input className="input" placeholder="Número do lote ou referência interna" value={form.lote} onChange={e => setForm(f => ({ ...f, lote: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : <><Check className="w-4 h-4" />{editing ? 'Salvar Alterações' : 'Cadastrar Chapa'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal estoque */}
      {estoqueModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEstoqueModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900">Movimentação de Estoque</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{estoqueModal.codigo} · {estoqueModal.liga}</p>
              </div>
              <button onClick={() => setEstoqueModal(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm text-slate-600">Estoque atual</span>
                <span className="font-bold text-slate-900 text-2xl">{estoqueModal.quantidade} <span className="text-sm font-normal text-slate-400">un</span></span>
              </div>
              <div>
                <label className="label">Tipo de Movimentação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAjusteTipo('entrada')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all border-2 ${ajusteTipo === 'entrada' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <ArrowUp className="w-4 h-4" />Entrada
                  </button>
                  <button type="button" onClick={() => setAjusteTipo('saida')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all border-2 ${ajusteTipo === 'saida' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <ArrowDown className="w-4 h-4" />Saída
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Quantidade *</label>
                <input type="number" min="1" className="input text-lg font-bold" placeholder="0" value={qtdAjuste} onChange={e => setQtdAjuste(e.target.value)} />
              </div>
              {qtdAjuste && novaQtd !== null && (
                <div className={`flex items-center justify-between p-3 rounded-xl border ${novaQtd < 0 ? 'bg-rose-50 border-rose-200' : novaQtd <= 5 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Minus className="w-4 h-4 text-slate-400" />
                    Novo estoque
                  </div>
                  <span className={`font-bold text-xl ${novaQtd < 0 ? 'text-rose-600' : novaQtd <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {novaQtd} un
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEstoqueModal(null)}>Cancelar</button>
              <button className={`${ajusteTipo === 'entrada' ? 'btn-primary' : 'bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors'}`}
                onClick={ajustarEstoque} disabled={!qtdAjuste}>
                <Check className="w-4 h-4" />Confirmar {ajusteTipo === 'entrada' ? 'Entrada' : 'Saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
