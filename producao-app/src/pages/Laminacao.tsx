import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Laminação() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Formulário
  const [editando, setEditando] = useState<number | null>(null);
  const [formData, setFormData] = useState('');
  const [formValores, setFormValores] = useState({
    t1m1: '', t1m2: '', t1m3: '',
    t2m1: '', t2m2: '', t2m3: '',
    t3m1: '', t3m2: '', t3m3: '',
    obs: ''
  });

  useEffect(() => { load(); }, [ano, mes]);

  async function load() {
    setLoading(true);
    const mesStr = String(mes).padStart(2, '0');
    const { data } = await supabase
      .from('laminacao_lancamentos')
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
    setFormValores({ t1m1: '', t1m2: '', t1m3: '', t2m1: '', t2m2: '', t2m3: '', t3m1: '', t3m2: '', t3m3: '', obs: '' });
  }

  function editar(reg: any) {
    setEditando(reg.id);
    setFormData(reg.data);
    setFormValores({
      t1m1: reg.t1_maquina1_kg > 0 ? reg.t1_maquina1_kg : '',
      t1m2: reg.t1_maquina2_kg > 0 ? reg.t1_maquina2_kg : '',
      t1m3: reg.t1_maquina3_kg > 0 ? reg.t1_maquina3_kg : '',
      t2m1: reg.t2_maquina1_kg > 0 ? reg.t2_maquina1_kg : '',
      t2m2: reg.t2_maquina2_kg > 0 ? reg.t2_maquina2_kg : '',
      t2m3: reg.t2_maquina3_kg > 0 ? reg.t2_maquina3_kg : '',
      t3m1: reg.t3_maquina1_kg > 0 ? reg.t3_maquina1_kg : '',
      t3m2: reg.t3_maquina2_kg > 0 ? reg.t3_maquina2_kg : '',
      t3m3: reg.t3_maquina3_kg > 0 ? reg.t3_maquina3_kg : '',
      obs: reg.observacoes || ''
    });
  }

  async function salvar() {
    const dados = {
      data: formData,
      t1_maquina1_kg: parseFloat(formValores.t1m1) || 0,
      t1_maquina2_kg: parseFloat(formValores.t1m2) || 0,
      t1_maquina3_kg: parseFloat(formValores.t1m3) || 0,
      t2_maquina1_kg: parseFloat(formValores.t2m1) || 0,
      t2_maquina2_kg: parseFloat(formValores.t2m2) || 0,
      t2_maquina3_kg: parseFloat(formValores.t2m3) || 0,
      t3_maquina1_kg: parseFloat(formValores.t3m1) || 0,
      t3_maquina2_kg: parseFloat(formValores.t3m2) || 0,
      t3_maquina3_kg: parseFloat(formValores.t3m3) || 0,
      observacoes: formValores.obs
    };

    if (editando) {
      await supabase.from('laminacao_lancamentos').update(dados).eq('id', editando);
    } else {
      await supabase.from('laminacao_lancamentos').insert(dados);
    }
    
    setEditando(null);
    load();
  }

  async function excluir(id: number) {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('laminacao_lancamentos').delete().eq('id', id);
    load();
  }

  const totalMes = registros.reduce((s, r) => s + (r.total_dia || 0), 0);

  return (
    <div className="p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laminação</h1>
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
        
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="label">Data</label><input type="date" className="input" value={formData} onChange={e => setFormData(e.target.value)} /></div>
          <div><label className="label">T1 - Máquina 1 (kg)</label><input type="number" className="input" value={formValores.t1m1} onChange={e => setFormValores({...formValores, t1m1: e.target.value})} placeholder="0" /></div>
          <div><label className="label">T1 - Máquina 2 (kg)</label><input type="number" className="input" value={formValores.t1m2} onChange={e => setFormValores({...formValores, t1m2: e.target.value})} placeholder="0" /></div>
          <div><label className="label">T1 - Máquina 3 (kg)</label><input type="number" className="input" value={formValores.t1m3} onChange={e => setFormValores({...formValores, t1m3: e.target.value})} placeholder="0" /></div>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="label">T2 - Máquina 1 (kg)</label><input type="number" className="input" value={formValores.t2m1} onChange={e => setFormValores({...formValores, t2m1: e.target.value})} placeholder="0" /></div>
          <div><label className="label">T2 - Máquina 2 (kg)</label><input type="number" className="input" value={formValores.t2m2} onChange={e => setFormValores({...formValores, t2m2: e.target.value})} placeholder="0" /></div>
          <div><label className="label">T2 - Máquina 3 (kg)</label><input type="number" className="input" value={formValores.t2m3} onChange={e => setFormValores({...formValores, t2m3: e.target.value})} placeholder="0" /></div>
          <div><label className="label">T3 - Máquina 1 (kg)</label><input type="number" className="input" value={formValores.t3m1} onChange={e => setFormValores({...formValores, t3m1: e.target.value})} placeholder="0" /></div>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="label">T3 - Máquina 2 (kg)</label><input type="number" className="input" value={formValores.t3m2} onChange={e => setFormValores({...formValores, t3m2: e.target.value})} placeholder="0" /></div>
          <div><label className="label">T3 - Máquina 3 (kg)</label><input type="number" className="input" value={formValores.t3m3} onChange={e => setFormValores({...formValores, t3m3: e.target.value})} placeholder="0" /></div>
          <div className="col-span-2"><label className="label">Observações</label><input type="text" className="input" value={formValores.obs} onChange={e => setFormValores({...formValores, obs: e.target.value})} placeholder="Observações..." /></div>
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
                <th className="px-3 py-2 text-right">T1-M1</th>
                <th className="px-3 py-2 text-right">T1-M2</th>
                <th className="px-3 py-2 text-right">T1-M3</th>
                <th className="px-3 py-2 text-right">T2-M1</th>
                <th className="px-3 py-2 text-right">T2-M2</th>
                <th className="px-3 py-2 text-right">T2-M3</th>
                <th className="px-3 py-2 text-right">T3-M1</th>
                <th className="px-3 py-2 text-right">T3-M2</th>
                <th className="px-3 py-2 text-right">T3-M3</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((reg, idx) => (
                <tr key={reg.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2">{reg.data?.split('-').reverse().join('/')}</td>
                  <td className="px-3 py-2 text-right">{reg.t1_maquina1_kg > 0 ? reg.t1_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t1_maquina2_kg > 0 ? reg.t1_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t1_maquina3_kg > 0 ? reg.t1_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t2_maquina1_kg > 0 ? reg.t2_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t2_maquina2_kg > 0 ? reg.t2_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t2_maquina3_kg > 0 ? reg.t2_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t3_maquina1_kg > 0 ? reg.t3_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t3_maquina2_kg > 0 ? reg.t3_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right">{reg.t3_maquina3_kg > 0 ? reg.t3_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-right font-bold">{reg.total_dia?.toLocaleString('pt-BR')}</td>
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
