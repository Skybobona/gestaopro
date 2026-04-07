import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Trash2 } from 'lucide-react';

export default function Fundicao() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Campos do formulário
  const [data, setData] = useState('');
  const [totalKg, setTotalKg] = useState('');
  const [paletes, setPaletes] = useState('');
  const [obs, setObs] = useState('');

  // Carregar ao abrir
  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    const { data: lista } = await supabase
      .from('fundicao_lancamentos')
      .select('*')
      .order('data', { ascending: false });
    setRegistros(lista || []);
    setCarregando(false);
  }

  async function salvar(e) {
    e.preventDefault();
    
    await supabase.from('fundicao_lancamentos').insert({
      data: data,
      total_kg: parseFloat(totalKg) || 0,
      paletes: parseInt(paletes) || 0,
      observacoes: obs
    });
    
    // Limpar formulário
    setData('');
    setTotalKg('');
    setPaletes('');
    setObs('');
    
    // Recarregar lista
    carregarDados();
  }

  async function excluir(id) {
    if (!confirm('Excluir?')) return;
    await supabase.from('fundicao_lancamentos').delete().eq('id', id);
    carregarDados();
  }

  if (carregando) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fundação</h1>

      {/* Formulário */}
      <form onSubmit={salvar} className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-bold mb-3">Novo Registro</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-sm mb-1">Data</label>
            <input type="date" className="w-full border p-2 rounded" value={data} onChange={e => setData(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Total (kg)</label>
            <input type="number" className="w-full border p-2 rounded" value={totalKg} onChange={e => setTotalKg(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Paletes</label>
            <input type="number" className="w-full border p-2 rounded" value={paletes} onChange={e => setPaletes(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Obs</label>
            <input type="text" className="w-full border p-2 rounded" value={obs} onChange={e => setObs(e.target.value)} placeholder="..." />
          </div>
        </div>
        
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Salvar Registro
        </button>
      </form>

      {/* Lista */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-right">Total (kg)</th>
              <th className="p-3 text-right">Paletes</th>
              <th className="p-3 text-left">Obs</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {registros.map((reg) => (
              <tr key={reg.id} className="border-t">
                <td className="p-3">{reg.data}</td>
                <td className="p-3 text-right font-bold">{reg.total_kg > 0 ? reg.total_kg.toLocaleString('pt-BR') : '-'}</td>
                <td className="p-3 text-right">{reg.paletes > 0 ? reg.paletes : '-'}</td>
                <td className="p-3">{reg.observacoes}</td>
                <td className="p-3">
                  <button onClick={() => excluir(reg.id)} className="text-red-600">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
