import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TURNOS = [1, 2, 3];

export default function Laminacao() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form
  const [data, setData] = useState('');
  const [turno, setTurno] = useState(1);
  const [maquina, setMaquina] = useState('');
  const [kg, setKg] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => { load(); }, [ano, mes]);

  async function load() {
    setLoading(true);
    const { data: rows } = await supabase
      .from('laminacao_simples')
      .select('*')
      .gte('data', `${ano}-${String(mes).padStart(2,'0')}-01`)
      .lte('data', `${ano}-${String(mes).padStart(2,'0')}-31`)
      .order('data', { ascending: false })
      .order('turno');
    setDados(rows || []);
    setLoading(false);
  }

  async function salvar() {
    if (!data || !maquina || !kg) {
      alert('Preencha data, máquina e KG!');
      return;
    }
    
    await supabase.from('laminacao_simples').insert({
      data,
      turno,
      maquina,
      kg_produzidos: parseFloat(kg),
      observacoes: obs
    });
    
    setShowForm(false);
    setData(''); setMaquina(''); setKg(''); setObs('');
    load();
  }

  async function excluir(id: number) {
    if (!confirm('Excluir?')) return;
    await supabase.from('laminacao_simples').delete().eq('id', id);
    load();
  }

  const total = dados.reduce((s, r) => s + (r.kg_produzidos || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laminação</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" />Novo</button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button className="btn-secondary" onClick={() => setMes(m => m === 1 ? 12 : m - 1)}><ChevronLeft /></button>
        <select className="select" value={mes} onChange={e => setMes(+e.target.value)}>{MESES.map((n,i) => <option key={i} value={i+1}>{n}</option>)}</select>
        <select className="select" value={ano} onChange={e => setAno(+e.target.value)}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
        <button className="btn-secondary" onClick={() => setMes(m => m === 12 ? 1 : m + 1)}><ChevronRight /></button>
        <span className="ml-4 font-bold">Total: {total.toLocaleString('pt-BR')} kg</span>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2">DATA</th>
                <th className="px-3 py-2">TURNO</th>
                <th className="px-3 py-2">MÁQUINA</th>
                <th className="px-3 py-2 text-right">KG</th>
                <th className="px-3 py-2">OBS</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {dados.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2">{r.data?.split('-').reverse().join('/')}</td>
                  <td className="px-3 py-2">{r.turno}</td>
                  <td className="px-3 py-2">{r.maquina}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.kg_produzidos?.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2 text-slate-500">{r.observacoes}</td>
                  <td className="px-2 py-2"><button onClick={() => excluir(r.id)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal max-w-md">
            <div className="modal-header"><h3>Novo Registro</h3><button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button></div>
            <div className="modal-body space-y-3">
              <div><label className="label">Data *</label><input type="date" className="input" value={data} onChange={e => setData(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Turno</label><select className="input" value={turno} onChange={e => setTurno(+e.target.value)}>{TURNOS.map(t => <option key={t} value={t}>Turno {t}</option>)}</select></div>
                <div><label className="label">Máquina *</label><input className="input" value={maquina} onChange={e => setMaquina(e.target.value)} placeholder="Ex: Laminador 01" /></div>
              </div>
              <div><label className="label">KG Produzidos *</label><input type="number" className="input" value={kg} onChange={e => setKg(e.target.value)} placeholder="1500" /></div>
              <div><label className="label">Observações</label><input className="input" value={obs} onChange={e => setObs(e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar}><Check className="w-4 h-4" />Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
