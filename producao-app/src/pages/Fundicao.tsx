import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import {
  Plus, Edit2, Trash2, X, Check, AlertCircle,
  ChevronLeft, ChevronRight, Settings, BarChart2,
  Flame, Package, Droplets, Fuel, CalendarDays, Download, Wind, Layers,
  Wrench, Clock, DollarSign,
} from 'lucide-react';

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmt(v: number | null | undefined, dec = 0) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtDate(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function pct(part: number, total: number) {
  if (!total) return '0%';
  return (part / total * 100).toFixed(1) + '%';
}

interface MatPrima { material: string; quantidade_kg: number; }
interface Material { id: number; nome: string; tipo: string; }
interface Produto { id: number; codigo: string; descricao: string; espessura_mm: number; comprimento_mm: number; largura_mm?: number; }
interface Registro {
  id: number; data: string; total_kg: number; paletes: number;
  borra_kg: number; gas_glp: number; observacoes: string;
  produto_id?: number; produto_codigo?: string; produto_descricao?: string;
  materias_primas: MatPrima[];
}

const emptyForm = (data: string) => ({
  data, total_kg: '', paletes: '', borra_kg: '', gas_glp: '', observacoes: '', produto_id: '',
});
const emptyProduto = () => ({ codigo: '', descricao: '', espessura_mm: '', comprimento_mm: '', largura_mm: '' });

export default function Fundicao() {
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [view, setView] = useState<'lancamento' | 'relatorio' | 'config' | 'produtos'>('lancamento');

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [totais, setTotais] = useState<any>({});
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [relatorio, setRelatorio] = useState<any[]>([]);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm(today.toISOString().split('T')[0]));
  const [mpForm, setMpForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [novoMaterial, setNovoMaterial] = useState('');
  const [novoMatTipo, setNovoMatTipo] = useState<'mp' | 'especial'>('mp');
  const [savingMat, setSavingMat] = useState(false);

  const [prodModal, setProdModal] = useState(false);
  const [prodEditId, setProdEditId] = useState<number | null>(null);
  const [prodForm, setProdForm] = useState(emptyProduto());
  const [prodError, setProdError] = useState('');
  const [savingProd, setSavingProd] = useState(false);

  // ── Manutenção Fundição ──
  const [manutModal, setManutModal] = useState(false);
  const [manutRegistros, setManutRegistros] = useState<any[]>([]);
  const [manutForm, setManutForm] = useState({ data: '', maquina: '', descricao: '', horas_paradas: '', tecnico: '', custo: '' });
  const [savingManut, setSavingManut] = useState(false);

  const loadManut = () => api.get('/manutencao/fundicao').then(setManutRegistros).catch(() => {});
  const manutByDate = useMemo(() => {
    const m: Record<string, any[]> = {};
    manutRegistros.forEach(r => { if (!m[r.data]) m[r.data] = []; m[r.data].push(r); });
    return m;
  }, [manutRegistros]);

  const openManut = (data: string) => {
    setManutForm({ data, maquina: '', descricao: '', horas_paradas: '', tecnico: '', custo: '' });
    setManutModal(true);
  };

  const saveManut = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingManut(true);
    try {
      await api.post('/manutencao/fundicao', {
        ...manutForm,
        horas_paradas: manutForm.horas_paradas ? parseFloat(manutForm.horas_paradas) : null,
        custo: manutForm.custo ? parseFloat(manutForm.custo) : null,
      });
      setManutModal(false); loadManut();
    } catch (err: any) { }
    finally { setSavingManut(false); }
  };

  const removeManut = async (id: number) => {
    await api.delete(`/manutencao/fundicao/${id}`); loadManut();
  };

  const mpMats = useMemo(() => materiais.filter(m => m.tipo !== 'especial'), [materiais]);
  const especiais = useMemo(() => materiais.filter(m => m.tipo === 'especial'), [materiais]);

  const loadData = useCallback(async () => {
    const [d, m, p] = await Promise.all([
      api.get(`/fundicao?ano=${ano}&mes=${mes}`),
      api.get('/fundicao/materiais'),
      api.get('/fundicao/produtos'),
    ]);
    setRegistros(d.registros);
    setTotais(d.totais);
    setMateriais(m);
    setProdutos(p);
  }, [ano, mes]);

  const loadRelatorio = useCallback(async () => {
    const r = await api.get(`/fundicao/relatorio/mensal?ano=${ano}`);
    setRelatorio(r.meses);
  }, [ano]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (view === 'relatorio') loadRelatorio(); }, [view, loadRelatorio]);
  useEffect(() => { loadManut(); }, [ano, mes]);

  const openNovo = (data?: string) => {
    const d = data || new Date(ano, mes - 1, today.getDate()).toISOString().split('T')[0];
    setForm(emptyForm(d));
    const mp: Record<string, string> = {};
    materiais.forEach(m => { mp[m.nome] = ''; });
    setMpForm(mp);
    setEditId(null); setError(''); setModal(true);
  };

  const openEditar = (r: Registro) => {
    setForm({ data: r.data, total_kg: String(r.total_kg || ''), paletes: String(r.paletes || ''), borra_kg: String(r.borra_kg || ''), gas_glp: String(r.gas_glp || ''), observacoes: r.observacoes || '', produto_id: String(r.produto_id || '') });
    const mp: Record<string, string> = {};
    materiais.forEach(m => { mp[m.nome] = ''; });
    r.materias_primas.forEach(mp2 => { mp[mp2.material] = String(mp2.quantidade_kg || ''); });
    setMpForm(mp);
    setEditId(r.id); setError(''); setModal(true);
  };

  // Auto-sugestão de borra
  const totalMpLancado = useMemo(() => {
    return mpMats.reduce((s, m) => s + (parseFloat(mpForm[m.nome] || '0') || 0), 0);
  }, [mpForm, mpMats]);

  const borraSugerida = useMemo(() => {
    const prod = parseFloat(form.total_kg) || 0;
    if (!prod || !totalMpLancado) return null;
    const v = totalMpLancado - prod;
    return v > 0 ? v : 0;
  }, [totalMpLancado, form.total_kg]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        data: form.data,
        total_kg: parseFloat(form.total_kg) || 0,
        paletes: parseInt(form.paletes) || 0,
        borra_kg: parseFloat(form.borra_kg) || 0,
        gas_glp: parseFloat(form.gas_glp) || 0,
        observacoes: form.observacoes || null,
        produto_id: form.produto_id ? parseInt(form.produto_id) : null,
        materias_primas: materiais
          .filter(m => parseFloat(mpForm[m.nome] || '0') > 0)
          .map(m => ({ material: m.nome, quantidade_kg: parseFloat(mpForm[m.nome]) })),
      };
      if (editId) await api.put(`/fundicao/${editId}`, payload);
      else await api.post('/fundicao', payload);
      setModal(false); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await api.delete(`/fundicao/${id}`); loadData();
  };

  const addMaterial = async () => {
    if (!novoMaterial.trim()) return;
    setSavingMat(true);
    await api.post('/fundicao/materiais', { nome: novoMaterial, tipo: novoMatTipo });
    setNovoMaterial('');
    const m = await api.get('/fundicao/materiais');
    setMateriais(m);
    setSavingMat(false);
  };

  const removerMaterial = async (id: number) => {
    await api.delete(`/fundicao/materiais/${id}`);
    const m = await api.get('/fundicao/materiais');
    setMateriais(m);
  };

  const openNovoProduto = () => { setProdForm(emptyProduto()); setProdEditId(null); setProdError(''); setProdModal(true); };
  const openEditarProduto = (p: Produto) => {
    setProdForm({ codigo: p.codigo, descricao: p.descricao, espessura_mm: String(p.espessura_mm), comprimento_mm: String(p.comprimento_mm), largura_mm: String(p.largura_mm || '') });
    setProdEditId(p.id); setProdError(''); setProdModal(true);
  };
  const saveProduto = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProd(true); setProdError('');
    try {
      const payload = { codigo: prodForm.codigo.toUpperCase().trim(), descricao: prodForm.descricao, espessura_mm: parseFloat(prodForm.espessura_mm), comprimento_mm: parseFloat(prodForm.comprimento_mm), largura_mm: parseFloat(prodForm.largura_mm) || null };
      if (prodEditId) await api.put(`/fundicao/produtos/${prodEditId}`, payload);
      else await api.post('/fundicao/produtos', payload);
      setProdModal(false);
      const p = await api.get('/fundicao/produtos');
      setProdutos(p);
    } catch (err: any) { setProdError(err.message); }
    finally { setSavingProd(false); }
  };
  const excluirProduto = async (id: number) => {
    if (!confirm('Desativar este produto?')) return;
    await api.delete(`/fundicao/produtos/${id}`);
    const p = await api.get('/fundicao/produtos');
    setProdutos(p);
  };

  const mpTotais: Record<string, number> = totais.materias_primas || {};
  const totalMpReal: number = totais.total_mp_real || 0;

  const mediaProd = registros.filter(r => r.total_kg > 0).length > 0
    ? (totais.total_kg || 0) / registros.filter(r => r.total_kg > 0).length : 0;

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

  const exportExcel = () => {
    const rows: any[] = [];
    diasDoMes.forEach(data => {
      const reg = regByDate[data];
      if (!reg) return;
      const row: any = {
        Data: fmtDate(data),
        'Total KG': reg.total_kg,
        Paletes: reg.paletes,
        'Borra (kg)': reg.borra_kg,
        'GAS/GLP': reg.gas_glp,
      };
      materiais.forEach(m => { row[m.nome] = reg.materias_primas?.find(mp => mp.material === m.nome)?.quantidade_kg || 0; });
      row.Observações = reg.observacoes || '';
      rows.push(row);
    });
    const totalRow: any = { Data: 'TOTAL MÊS', 'Total KG': totais.total_kg, Paletes: totais.paletes, 'Borra (kg)': totais.borra_kg, 'GAS/GLP': totais.gas_glp };
    materiais.forEach(m => { totalRow[m.nome] = mpTotais[m.nome] || 0; });
    rows.push(totalRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Fundição ${MESES_PT[mes - 1]} ${ano}`);
    XLSX.writeFile(wb, `fundicao_${ano}_${String(mes).padStart(2, '0')}.xlsx`);
  };

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" /> Fundição
          </h1>
          <p className="page-subtitle">Produção Diária · Matérias-primas · Borra · GLP</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setView('config')} className={`btn-secondary btn-sm ${view === 'config' ? 'ring-2 ring-slate-900' : ''}`}>
            <Settings className="w-3.5 h-3.5" />Materiais
          </button>
          <button onClick={() => setView('produtos')} className={`btn-secondary btn-sm ${view === 'produtos' ? 'ring-2 ring-slate-900' : ''}`}>
            <Layers className="w-3.5 h-3.5" />Produtos
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
      {(view === 'lancamento') && (
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { icon: <Flame className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-50', label: 'Produção Total', value: fmt(totais.total_kg, 3), unit: 'kg' },
            { icon: <Package className="w-4 h-4 text-slate-500" />, bg: 'bg-slate-100', label: 'Paletes', value: fmt(totais.paletes), unit: 'un' },
            { icon: <BarChart2 className="w-4 h-4 text-indigo-500" />, bg: 'bg-indigo-50', label: 'Média/dia', value: fmt(mediaProd, 3), unit: 'kg' },
            { icon: <Droplets className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50', label: 'Borra Total', value: fmt(totais.borra_kg, 3), unit: 'kg' },
            { icon: <Fuel className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50', label: 'GAS/GLP', value: fmt(totais.gas_glp, 0), unit: '' },
            { icon: <Wind className="w-4 h-4 text-rose-400" />, bg: totais.pct_atmosfera > 5 ? 'bg-rose-100' : 'bg-rose-50', label: 'Atmosfera', value: fmt(totais.atmosfera_kg, 3), unit: `kg (${fmt(totais.pct_atmosfera, 1)}%)` },
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

      {/* ── VIEW: Configuração de materiais ── */}
      {view === 'config' && (
        <div className="card max-w-lg">
          <p className="font-bold text-slate-800 mb-4">Matérias-primas e materiais especiais</p>
          <div className="space-y-1.5 mb-5">
            {materiais.map(m => (
              <div key={m.id} className={`flex items-center justify-between py-2 px-3 rounded-xl border ${m.tipo === 'especial' ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 font-mono">{m.nome}</span>
                  {m.tipo === 'especial' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-200 text-violet-700 font-bold">ESPECIAL</span>}
                </div>
                <button onClick={() => removerMaterial(m.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Ex: LATÃO, COBRE..." value={novoMaterial} onChange={e => setNovoMaterial(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && addMaterial()} />
            <select className="select w-28" value={novoMatTipo} onChange={e => setNovoMatTipo(e.target.value as any)}>
              <option value="mp">MP</option>
              <option value="especial">Especial</option>
            </select>
            <button className="btn-primary" onClick={addMaterial} disabled={savingMat}><Plus className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Materiais <strong>Especiais</strong> (ex: BICO KASTELINE, GAS/GLP) ficam em destaque e <strong>não</strong> entram no cálculo de composição.</p>
        </div>
      )}

      {/* ── VIEW: Produtos ── */}
      {view === 'produtos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-slate-800 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" />Produtos Padrão</p>
            <button className="btn-primary btn-sm" onClick={openNovoProduto}><Plus className="w-3.5 h-3.5" />Novo Produto</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs">
                  <th className="px-4 py-2.5 text-left font-semibold">CÓDIGO</th>
                  <th className="px-4 py-2.5 text-left font-semibold">DESCRIÇÃO</th>
                  <th className="px-4 py-2.5 text-right font-semibold">ESPESSURA (mm)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">COMPRIMENTO (mm)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">LARGURA (mm)</th>
                  <th className="px-2 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs">Nenhum produto cadastrado</td></tr>}
                {produtos.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-700">{p.codigo}</td>
                    <td className="px-4 py-2.5 text-slate-700">{p.descricao}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(p.espessura_mm, 1)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(p.comprimento_mm, 0)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{p.largura_mm ? fmt(p.largura_mm, 0) : '—'}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => openEditarProduto(p)} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => excluirProduto(p.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW: Tabela Lançamento ── */}
      {view === 'lancamento' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                {/* % composição — apenas MP */}
                <tr className="bg-slate-800 text-slate-300 text-[10px]">
                  <td className="px-3 py-1 sticky left-0 bg-slate-800"></td>
                  <td className="px-3 py-1 text-right"></td>
                  <td className="px-3 py-1 text-right"></td>
                  <td className="px-3 py-1 text-right bg-amber-900/40"></td>
                  {mpMats.map(m => (
                    <td key={m.id} className="px-3 py-1 text-center font-semibold text-emerald-400">
                      {totalMpReal > 0 ? pct(mpTotais[m.nome] || 0, totalMpReal) : '—'}
                    </td>
                  ))}
                  {especiais.map(m => (
                    <td key={m.id} className="px-3 py-1 text-center bg-violet-900/30 text-violet-300">especial</td>
                  ))}
                  <td className="px-3 py-1 text-right bg-blue-900/40"></td>
                  <td colSpan={2}></td>
                </tr>
                <tr className="bg-slate-900 text-white">
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap sticky left-0 bg-slate-900 z-10">DIA</th>
                  <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">TOTAL (KG)</th>
                  <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">PALETES</th>
                  <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap bg-amber-700">BORRA</th>
                  {mpMats.map(m => (
                    <th key={m.id} className="px-3 py-2.5 text-right font-semibold whitespace-nowrap uppercase">{m.nome}</th>
                  ))}
                  {especiais.map(m => (
                    <th key={m.id} className="px-3 py-2.5 text-right font-semibold whitespace-nowrap uppercase bg-violet-800">{m.nome}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap bg-blue-800">GAS/GLP</th>
                  <th className="px-2 py-2.5 text-left font-semibold min-w-[140px]">OBS</th>
                  <th className="px-2 py-2.5 w-16"></th>
                </tr>
                {/* Linha totais */}
                <tr className="bg-slate-100 border-b-2 border-slate-300 font-bold">
                  <td className="px-3 py-2 text-slate-500 sticky left-0 bg-slate-100 z-10 text-[11px] uppercase tracking-wide">TOTAL MÊS</td>
                  <td className="px-3 py-2 text-right text-slate-900">{fmt(totais.total_kg, 3)}</td>
                  <td className="px-3 py-2 text-right text-slate-900">{fmt(totais.paletes)}</td>
                  <td className="px-3 py-2 text-right text-amber-700 bg-amber-50">{fmt(totais.borra_kg, 3)}</td>
                  {mpMats.map(m => (
                    <td key={m.id} className="px-3 py-2 text-right text-slate-700">{fmt(mpTotais[m.nome] || 0, 0)}</td>
                  ))}
                  {especiais.map(m => (
                    <td key={m.id} className="px-3 py-2 text-right text-violet-700 bg-violet-50">{fmt(mpTotais[m.nome] || 0, 0)}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-blue-700 bg-blue-50">{fmt(totais.gas_glp, 0)}</td>
                  <td className="px-3 py-2 text-slate-400 text-[10px]"></td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {diasDoMes.map(data => {
                  const reg = regByDate[data];
                  const dow = new Date(data + 'T12:00:00').getDay();
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  const isWeekend = isSun || isSat;
                  const dayNum = parseInt(data.split('-')[2]);
                  return (
                    <tr key={data}
                      className={`border-b border-slate-100 transition-colors ${reg ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-50/50'} ${isWeekend ? 'bg-slate-50/70' : ''}`}>
                      <td className={`px-3 py-2 sticky left-0 z-10 whitespace-nowrap font-semibold ${isWeekend ? 'bg-slate-100 text-slate-400' : reg ? 'bg-white text-indigo-600' : 'bg-white text-slate-400'}`}>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{String(dayNum).padStart(2,'0')}/{String(mes).padStart(2,'0')}/{ano}</span>
                          {isSun && <span className="text-[9px] font-bold text-rose-400">DOM</span>}
                          {isSat && <span className="text-[9px] font-bold text-amber-500">SAB</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {reg?.total_kg ? <span className="font-bold text-slate-800">{fmt(reg.total_kg, 3)}</span> : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {reg?.paletes || <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums bg-amber-50/50">
                        {reg?.borra_kg ? <span className="text-amber-700 font-semibold">{fmt(reg.borra_kg, 3)}</span> : <span className="text-slate-200">—</span>}
                      </td>
                      {mpMats.map(m => {
                        const val = reg?.materias_primas?.find(mp => mp.material === m.nome)?.quantidade_kg;
                        return (
                          <td key={m.id} className="px-3 py-2 text-right tabular-nums text-slate-600">
                            {val ? fmt(val, 0) : <span className="text-slate-200">—</span>}
                          </td>
                        );
                      })}
                      {especiais.map(m => {
                        const val = reg?.materias_primas?.find(mp => mp.material === m.nome)?.quantidade_kg;
                        return (
                          <td key={m.id} className="px-3 py-2 text-right tabular-nums bg-violet-50/50">
                            {val ? <span className="text-violet-700 font-semibold">{fmt(val, 0)}</span> : <span className="text-slate-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right tabular-nums bg-blue-50/50">
                        {reg?.gas_glp ? <span className="text-blue-700 font-semibold">{fmt(reg.gas_glp, 0)}</span> : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate block text-[11px]">{reg?.observacoes || ''}</span>
                          {manutByDate[data]?.length > 0 && (
                            <span title={manutByDate[data].map(m => m.descricao).join('; ')}
                              className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold cursor-pointer"
                              onClick={() => openManut(data)}>
                              <Wrench className="w-2.5 h-2.5" />{manutByDate[data].length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {reg ? (
                          <div className="flex gap-0.5 justify-center">
                            <button onClick={() => openEditar(reg)} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => excluir(reg.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openManut(data)} className="p-1 text-slate-300 hover:text-amber-600 transition-colors rounded" title="Registrar Manutenção"><Wrench className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-0.5 justify-center">
                            <button onClick={() => openNovo(data)} className="p-1 text-slate-200 hover:text-indigo-500 transition-colors rounded" title="Lançar produção"><Plus className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openManut(data)} className="p-1 text-slate-200 hover:text-amber-500 transition-colors rounded" title="Registrar Manutenção"><Wrench className="w-3.5 h-3.5" /></button>
                          </div>
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

      {/* ── VIEW: Relatório Anual ── */}
      {view === 'relatorio' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-orange-500" />Resumo Anual — {ano}</p>
            <select className="select w-24 py-1.5 text-sm" value={ano} onChange={e => setAno(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-2.5 text-left font-semibold sticky left-0 bg-slate-900">MÊS</th>
                  <th className="px-3 py-2.5 text-right font-semibold">DIAS</th>
                  <th className="px-3 py-2.5 text-right font-semibold">TOTAL KG</th>
                  <th className="px-3 py-2.5 text-right font-semibold">PALETES</th>
                  <th className="px-3 py-2.5 text-right font-semibold bg-amber-700">BORRA</th>
                  {mpMats.map(m => <th key={m.id} className="px-3 py-2.5 text-right font-semibold uppercase whitespace-nowrap">{m.nome}</th>)}
                  {especiais.map(m => <th key={m.id} className="px-3 py-2.5 text-right font-semibold uppercase whitespace-nowrap bg-violet-800">{m.nome}</th>)}
                  <th className="px-3 py-2.5 text-right font-semibold bg-blue-800">GAS/GLP</th>
                  <th className="px-3 py-2.5 text-right font-semibold bg-rose-800">ATMOSFERA</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.length === 0 && <tr><td colSpan={8 + materiais.length} className="px-4 py-12 text-center text-slate-400">Nenhum dado para o ano {ano}</td></tr>}
                {relatorio.map((r: any) => (
                  <tr key={r.mes} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-700 capitalize sticky left-0 bg-white">{r.mes_nome}</td>
                    <td className="px-3 py-3 text-right text-slate-500">{r.dias}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">{fmt(r.total_kg, 3)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{fmt(r.paletes)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-amber-700 bg-amber-50/50">{fmt(r.borra_kg, 3)}</td>
                    {mpMats.map(m => <td key={m.id} className="px-3 py-3 text-right text-slate-600">{fmt(r.materias_primas?.[m.nome] || 0, 0)}</td>)}
                    {especiais.map(m => <td key={m.id} className="px-3 py-3 text-right text-violet-700 bg-violet-50/50">{fmt(r.materias_primas?.[m.nome] || 0, 0)}</td>)}
                    <td className="px-3 py-3 text-right font-semibold text-blue-700 bg-blue-50/50">{fmt(r.gas_glp, 0)}</td>
                    <td className="px-3 py-3 text-right text-rose-600 bg-rose-50/50">{fmt(r.atmosfera_kg, 3)} <span className="text-[10px] text-rose-400">({fmt(r.pct_atmosfera,1)}%)</span></td>
                  </tr>
                ))}
                {relatorio.length > 0 && (
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="px-4 py-3 sticky left-0 bg-slate-900 uppercase text-xs tracking-wider">TOTAL {ano}</td>
                    <td className="px-3 py-3 text-right">{relatorio.reduce((s: number, m: any) => s + m.dias, 0)}</td>
                    <td className="px-3 py-3 text-right">{fmt(relatorio.reduce((s: number, m: any) => s + m.total_kg, 0), 3)}</td>
                    <td className="px-3 py-3 text-right">{fmt(relatorio.reduce((s: number, m: any) => s + m.paletes, 0))}</td>
                    <td className="px-3 py-3 text-right bg-amber-800">{fmt(relatorio.reduce((s: number, m: any) => s + m.borra_kg, 0), 3)}</td>
                    {mpMats.map(m => <td key={m.id} className="px-3 py-3 text-right">{fmt(relatorio.reduce((s: number, r: any) => s + (r.materias_primas?.[m.nome] || 0), 0), 0)}</td>)}
                    {especiais.map(m => <td key={m.id} className="px-3 py-3 text-right bg-violet-900">{fmt(relatorio.reduce((s: number, r: any) => s + (r.materias_primas?.[m.nome] || 0), 0), 0)}</td>)}
                    <td className="px-3 py-3 text-right bg-blue-900">{fmt(relatorio.reduce((s: number, m: any) => s + m.gas_glp, 0), 0)}</td>
                    <td className="px-3 py-3 text-right bg-rose-900">{fmt(relatorio.reduce((s: number, m: any) => s + m.atmosfera_kg, 0), 3)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal lançamento ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {editId ? 'Editar Registro' : 'Novo Registro — Fundição'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{fmtDate(form.data)}</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={save}>
              <div className="modal-body max-h-[75vh] overflow-y-auto space-y-5">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

                {/* Dados gerais */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Produção</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="label">Data *</label>
                      <input type="date" className="input" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="label">Produto</label>
                      <select className="select" value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}>
                        <option value="">— Selecione —</option>
                        {produtos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Total Produzido (kg)</label>
                      <input type="number" step="0.001" className="input" placeholder="0.000" value={form.total_kg} onChange={e => setForm(f => ({ ...f, total_kg: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Paletes</label>
                      <input type="number" className="input" placeholder="0" value={form.paletes} onChange={e => setForm(f => ({ ...f, paletes: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-amber-500" />Borra Extraída (kg)
                        {borraSugerida !== null && (
                          <button type="button" className="text-[10px] text-amber-600 underline ml-1"
                            onClick={() => setForm(f => ({ ...f, borra_kg: String(borraSugerida.toFixed(3)) }))}>
                            sugerido: {fmt(borraSugerida, 3)}
                          </button>
                        )}
                      </label>
                      <input type="number" step="0.001" className="input" placeholder="0.000" value={form.borra_kg} onChange={e => setForm(f => ({ ...f, borra_kg: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">GAS / GLP</label>
                      <input type="number" step="0.01" className="input" placeholder="0" value={form.gas_glp} onChange={e => setForm(f => ({ ...f, gas_glp: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Observações</label>
                      <input className="input" placeholder="Ex: 3.667 KG 320MM / 8031 KG 250MM..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Matérias-primas */}
                {mpMats.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Matérias-primas</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {mpMats.map(m => (
                        <div key={m.id}>
                          <label className="label font-mono">{m.nome}</label>
                          <input type="number" step="0.001" className="input" placeholder="0"
                            value={mpForm[m.nome] || ''}
                            onChange={e => setMpForm(prev => ({ ...prev, [m.nome]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materiais especiais */}
                {especiais.length > 0 && (
                  <div className="border-t border-violet-100 pt-4 bg-violet-50/30 -mx-5 px-5 pb-3 rounded-b-xl">
                    <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-3">Materiais Especiais (não entram na composição)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {especiais.map(m => (
                        <div key={m.id}>
                          <label className="label font-mono text-violet-700">{m.nome}</label>
                          <input type="number" step="0.001" className="input border-violet-200 focus:ring-violet-400" placeholder="0"
                            value={mpForm[m.nome] || ''}
                            onChange={e => setMpForm(prev => ({ ...prev, [m.nome]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview totais */}
                {totalMpLancado > 0 && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Total MP lançado</p>
                      <p className="text-xl font-bold text-slate-800">{fmt(totalMpLancado, 3)} <span className="text-sm font-normal text-slate-400">kg</span></p>
                    </div>
                    {form.total_kg && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Produzido</p>
                        <p className="text-xl font-bold text-emerald-700">{fmt(parseFloat(form.total_kg), 3)} <span className="text-sm font-normal text-slate-400">kg</span></p>
                      </div>
                    )}
                    {borraSugerida !== null && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Borra sugerida</p>
                        <p className="text-xl font-bold text-amber-700">{fmt(borraSugerida, 3)} <span className="text-sm font-normal text-slate-400">kg</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : <><Check className="w-4 h-4" />Salvar Registro</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Produto ── */}
      {prodModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setProdModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" />{prodEditId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setProdModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveProduto}>
              <div className="modal-body space-y-4">
                {prodError && <div className="alert-error"><AlertCircle className="w-4 h-4 flex-shrink-0" />{prodError}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Código *</label>
                    <input className="input font-mono" placeholder="Ex: 250" value={prodForm.codigo} onChange={e => setProdForm(f => ({ ...f, codigo: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Descrição *</label>
                    <input className="input" placeholder="Ex: Lâmina 320x810" value={prodForm.descricao} onChange={e => setProdForm(f => ({ ...f, descricao: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Espessura (mm) *</label>
                    <input type="number" step="0.01" className="input" placeholder="9.2" value={prodForm.espessura_mm} onChange={e => setProdForm(f => ({ ...f, espessura_mm: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Comprimento (mm) *</label>
                    <input type="number" step="1" className="input" placeholder="810" value={prodForm.comprimento_mm} onChange={e => setProdForm(f => ({ ...f, comprimento_mm: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Largura (mm)</label>
                    <input type="number" step="1" className="input" placeholder="320" value={prodForm.largura_mm} onChange={e => setProdForm(f => ({ ...f, largura_mm: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setProdModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={savingProd}>{savingProd ? 'Salvando...' : <><Check className="w-4 h-4" />Salvar</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Manutenção Fundição ── */}
      {manutModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setManutModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Registrar Manutenção — Fundição</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Data: {manutForm.data}</p>
                </div>
              </div>
              <button onClick={() => setManutModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            {/* Registros existentes na data */}
            {manutByDate[manutForm.data]?.length > 0 && (
              <div className="px-5 pt-4 space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registros do dia</p>
                {manutByDate[manutForm.data].map((m: any) => (
                  <div key={m.id} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <Wrench className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-900">{m.maquina}</p>
                      <p className="text-xs text-amber-700">{m.descricao}</p>
                      <div className="flex gap-3 text-[10px] text-amber-500 mt-0.5">
                        {m.horas_paradas && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{m.horas_paradas}h</span>}
                        {m.tecnico && <span>{m.tecnico}</span>}
                        {m.custo && <span className="flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />R${Number(m.custo).toFixed(2)}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeManut(m.id)} className="p-1 text-amber-400 hover:text-rose-500 transition-colors rounded flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={saveManut}>
              <div className="modal-body space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Novo Registro</p>
                <div>
                  <label className="label">Máquina / Equipamento *</label>
                  <input className="input" placeholder="ex: Forno 1, Desgaseificador, Bomba..." value={manutForm.maquina} onChange={e => setManutForm(f => ({ ...f, maquina: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Descrição do Serviço *</label>
                  <textarea className="input resize-none" rows={3} placeholder="Descreva o problema ou serviço realizado..." value={manutForm.descricao} onChange={e => setManutForm(f => ({ ...f, descricao: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />Horas Paradas</label>
                    <input type="number" step="0.5" min="0" className="input" placeholder="0.0" value={manutForm.horas_paradas} onChange={e => setManutForm(f => ({ ...f, horas_paradas: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1"><DollarSign className="w-3 h-3 text-slate-400" />Custo (R$)</label>
                    <input type="number" step="0.01" min="0" className="input" placeholder="0.00" value={manutForm.custo} onChange={e => setManutForm(f => ({ ...f, custo: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Técnico Responsável</label>
                  <input className="input" placeholder="Nome do técnico" value={manutForm.tecnico} onChange={e => setManutForm(f => ({ ...f, tecnico: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setManutModal(false)}>Fechar</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors" disabled={savingManut}>
                  {savingManut ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : <><Wrench className="w-4 h-4" />Registrar Manutenção</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
