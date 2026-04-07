import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Fundicao() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Formulário
  const [editando, setEditando] = useState<number | null>(null);
  const [formData, setFormData] = useState('');
  const [formValores, setFormValores] = useState({
    total_kg: '',
    paletes: '',
    borra_kg: '',
    gas_glp: '',
    obs: ''
  });

  useEffect(() => { load(); }, [ano, mes]);

  async function load() {
    setLoading(true);
    const mesStr = String(mes).padStart(2, '0');
    const { data } = await supabase
      .from('fundicao_lancamentos')
      .select('*')
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-31`)
      .order('data', { ascending: false });
    setRegistros(data || []);
    setLoading(false);
  }

  function iniciarNovo() {
    setEditando(null);
    setFormData(new Date().toISOString().split('T')[0]);
    setFormValores({ total_kg: '', paletes: '', borra_kg: '', gas_glp: '', obs: '' });
  }

  function editar(reg: any) {
    setEditando(reg.id);
    setFormData(reg.data);
    setFormValores({
      total_kg: reg.total_kg > 0 ? reg.total_kg : '',
      paletes: reg.paletes > 0 ? reg.paletes : '',
      borra_kg: reg.borra_kg > 0 ? reg.borra_kg : '',
      gas_glp: reg.gas_glp > 0 ? reg.gas_glp : '',
      obs: reg.observacoes || ''
    });
  }

  async function salvar() {
    const dados = {
      data: formData,
      total_kg: parseFloat(formValores.total_kg) || 0,
      paletes: parseInt(formValores.paletes) || 0,
      borra_kg: parseFloat(formValores.borra_kg) || 0,
      gas_glp: parseFloat(formValores.gas_glp) || 0,
      observacoes: formValores.obs
    };

    if (editando) {
      await supabase.from('fundicao_lancamentos').update(dados).eq('id', editando);
    } else {
      await supabase.from('fundicao_lancamentos').insert(dados);
    }
    
    setEditando(null);
    load();
  }

  async function excluir(id: number) {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('fundicao_lancamentos').delete().eq('id', id);
    load();
  }

  const totalMes = registros.reduce((s, r) => s + (r.total_kg || 0), 0);

  return (
    <div className="p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Fundação</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setMes(m => m === 1 ? 12 : m - 1)}><ChevronLeft /></button>
          <select className="select" value={mes} onChange={e => setMes(+e.target.value)}>{MESES.map((n,i) => <option key={i} value={i+1}>{n}</option>)}</select>
          <select className="select" value={ano} onChange={e => setAno(+e.target.value)}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button className="btn-secondary" onClick={() => setMes(m => m === 12 ? 1 : m + 1)}><ChevronRight /></button>
          <span className="ml-4 font-bold">Total: {totalMes.toLocaleString('pt-BR')} kg</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">{editando ? 'Editar Registro' : 'Novo Registro'}</h3>
          {!editando && <button onClick={iniciarNovo} className="btn-primary btn-sm"><Plus className="w-4 h-4" />Novo</button>}
        </div>
        
        <div className="grid grid-cols-5 gap-3 mb-3">
          <div><label className="label">Data</label><input type="date" className="input" value={formData} onChange={e => setFormData(e.target.value)} /></div>
          <div><label className="label">Total Produzido (kg)</label><input type="number" className="input" value={formValores.total_kg} onChange={e => setFormValores({...formValores, total_kg: e.target.value})} placeholder="0" /></div>
          <div><label className="label">Paletes</label><input type="number" className="input" value={formValores.paletes} onChange={e => setFormValores({...formValores, paletes: e.target.value})} placeholder="0" /></div>
          <div><label className="label">Borra (kg)</label><input type="number" className="input" value={formValores.borra_kg} onChange={e => setFormValores({...formValores, borra_kg: e.target.value})} placeholder="0" /></div>
          <div><label className="label">Gás GLP</label><input type="number" className="input" value={formValores.gas_glp} onChange={e => setFormValores({...formValores, gas_glp: e.target.value})} placeholder="0" /></div>
        </div>
        
        <div className="mb-3">
          <label className="label">Observações</label>
          <input type="text" className="input w-full" value={formValores.obs} onChange={e => setFormValores({...formValores, obs: e.target.value})} placeholder="Observações..." />
        </div>
        
        <div className="flex gap-2">
          <button onClick={salvar} className="btn-primary">{editando ? 'Atualizar' : 'Salvar'}</button>
          {editando && <button onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>}
        </div>
      </div>

      {/* Lista */}
      {loading ? <p>Carregando...</p> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2 text-right">Total (kg)</th>
                <th className="px-3 py-2 text-right">Paletes</th>
                <th className="px-3 py-2 text-right">Borra (kg)</th>
                <th className="px-3 py-2 text-right">Gás GLP</th>
                <th className="px-3 py-2">Observações</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((reg, idx) => (
                <tr key={reg.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2">{reg.data?.split('-').reverse().join('/')}</td>
                  <td className="px-3 py-2 text-right font-bold">{reg.total_kg?.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2 text-right">{reg.paletes > 0 ? reg.paletes : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.borra_kg > 0 ? reg.borra_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.gas_glp > 0 ? reg.gas_glp.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-slate-500">{reg.observacoes}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => editar(reg)} className="p-1 text-blue-500 mr-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => excluir(reg.id)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
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
