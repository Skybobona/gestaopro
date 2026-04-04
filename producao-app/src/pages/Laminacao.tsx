import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Laminacao() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [ano, mes]);

  async function fetchData() {
    setLoading(true);
    const mesStr = String(mes).padStart(2, '0');
    const { data } = await supabase
      .from('laminacao_lancamentos')
      .select('*')
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-31`)
      .order('data', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    await supabase.from('laminacao_lancamentos').insert({
      data: formData.get('data'),
      t1_maquina1_kg: parseFloat(formData.get('t1m1') as string) || 0,
      t1_maquina2_kg: parseFloat(formData.get('t1m2') as string) || 0,
      t1_maquina3_kg: parseFloat(formData.get('t1m3') as string) || 0,
      t2_maquina1_kg: parseFloat(formData.get('t2m1') as string) || 0,
      t2_maquina2_kg: parseFloat(formData.get('t2m2') as string) || 0,
      t2_maquina3_kg: parseFloat(formData.get('t2m3') as string) || 0,
      observacoes: formData.get('obs'),
    });
    form.reset();
    fetchData();
  }

  async function deleteRow(id: number) {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('laminacao_lancamentos').delete().eq('id', id);
    fetchData();
  }

  const totalMes = rows.reduce((s, r) => s + (r.total_dia || 0), 0);

  return (
    <div className="p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laminação</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setMes(m => m === 1 ? 12 : m - 1)}><ChevronLeft className="w-4 h-4" /></button>
          <select className="select" value={mes} onChange={e => setMes(+e.target.value)}>{MESES.map((n,i) => <option key={i} value={i+1}>{n}</option>)}</select>
          <select className="select" value={ano} onChange={e => setAno(+e.target.value)}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button className="btn-secondary" onClick={() => setMes(m => m === 12 ? 1 : m + 1)}><ChevronRight className="w-4 h-4" /></button>
          <span className="ml-4 font-bold">Total: {totalMes.toLocaleString('pt-BR')} kg</span>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={addRow} className="card mb-4">
        <div className="grid grid-cols-8 gap-2 mb-2">
          <input name="data" type="date" className="input" required />
          <input name="t1m1" type="number" placeholder="T1-M1" className="input" />
          <input name="t1m2" type="number" placeholder="T1-M2" className="input" />
          <input name="t1m3" type="number" placeholder="T1-M3" className="input" />
          <input name="t2m1" type="number" placeholder="T2-M1" className="input" />
          <input name="t2m2" type="number" placeholder="T2-M2" className="input" />
          <input name="t2m3" type="number" placeholder="T2-M3" className="input" />
          <button type="submit" className="btn-primary">Adicionar</button>
        </div>
        <input name="obs" placeholder="Observações" className="input w-full" />
      </form>

      {/* Tabela */}
      {loading ? <p>Carregando...</p> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2 text-left">DATA</th>
                <th className="px-3 py-2 text-right">T1-M1</th>
                <th className="px-3 py-2 text-right">T1-M2</th>
                <th className="px-3 py-2 text-right">T1-M3</th>
                <th className="px-3 py-2 text-right">T2-M1</th>
                <th className="px-3 py-2 text-right">T2-M2</th>
                <th className="px-3 py-2 text-right">T2-M3</th>
                <th className="px-3 py-2 text-right">TOTAL</th>
                <th className="px-3 py-2">OBS</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 font-mono">{row.data?.split('-').reverse().join('/')}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.t1_maquina1_kg > 0 ? row.t1_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.t1_maquina2_kg > 0 ? row.t1_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.t1_maquina3_kg > 0 ? row.t1_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.t2_maquina1_kg > 0 ? row.t2_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.t2_maquina2_kg > 0 ? row.t2_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.t2_maquina3_kg > 0 ? row.t2_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{row.total_dia?.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2 text-slate-500">{row.observacoes}</td>
                  <td className="px-2 py-2">
                    <button onClick={() => deleteRow(row.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
