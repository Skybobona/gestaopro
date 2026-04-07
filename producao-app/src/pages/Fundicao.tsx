import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Trash2, Edit2 } from 'lucide-react';

// Formatar data para BR
function formatarDataBR(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Converter data BR para ISO
function converterDataISO(dataBR) {
  if (!dataBR) return '';
  const [dia, mes, ano] = dataBR.split('/');
  return `${ano}-${mes}-${dia}`;
}

export default function Fundicao() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Campos do formulário
  const [editando, setEditando] = useState(null);
  const [data, setData] = useState('');
  const [totalKg, setTotalKg] = useState('');
  const [paletes, setPaletes] = useState('');
  const [borraKg, setBorraKg] = useState('');
  const [gasGlp, setGasGlp] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setCarregando(true);
    const { data: lista } = await supabase
      .from('fundicao_lancamentos')
      .select('*')
      .order('data', { ascending: false });
    setRegistros(lista || []);
    setCarregando(false);
  }

  function iniciarNovo() {
    setEditando(null);
    setData('');
    setTotalKg('');
    setPaletes('');
    setBorraKg('');
    setGasGlp('');
    setObs('');
  }

  function editar(reg) {
    setEditando(reg.id);
    setData(formatarDataBR(reg.data));
    setTotalKg(reg.total_kg > 0 ? reg.total_kg : '');
    setPaletes(reg.paletes > 0 ? reg.paletes : '');
    setBorraKg(reg.borra_kg > 0 ? reg.borra_kg : '');
    setGasGlp(reg.gas_glp > 0 ? reg.gas_glp : '');
    setObs(reg.observacoes || '');
  }

  async function salvar(e) {
    e.preventDefault();
    
    const dataISO = converterDataISO(data);
    
    const dados = {
      data: dataISO,
      total_kg: parseFloat(totalKg) || 0,
      paletes: parseInt(paletes) || 0,
      borra_kg: parseFloat(borraKg) || 0,
      gas_glp: parseFloat(gasGlp) || 0,
      observacoes: obs
    };

    if (editando) {
      await supabase.from('fundicao_lancamentos').update(dados).eq('id', editando);
    } else {
      const { error } = await supabase.from('fundicao_lancamentos').insert(dados);
      if (error) {
        alert('Erro: ' + error.message);
        return;
      }
    }
    
    iniciarNovo();
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
        <h2 className="font-bold mb-3">{editando ? 'Editar Registro' : 'Novo Registro'}</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm mb-1">Data (DD/MM/AAAA)</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={data} 
              onChange={e => setData(e.target.value)} 
              placeholder="01/04/2026"
              required 
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Total Produzido (kg)</label>
            <input type="number" className="w-full border p-2 rounded" value={totalKg} onChange={e => setTotalKg(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Paletes</label>
            <input type="number" className="w-full border p-2 rounded" value={paletes} onChange={e => setPaletes(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Borra (kg)</label>
            <input type="number" className="w-full border p-2 rounded" value={borraKg} onChange={e => setBorraKg(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Gás GLP</label>
            <input type="number" className="w-full border p-2 rounded" value={gasGlp} onChange={e => setGasGlp(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Observações</label>
            <input type="text" className="w-full border p-2 rounded" value={obs} onChange={e => setObs(e.target.value)} placeholder="..." />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {editando ? 'Atualizar' : 'Salvar'}
          </button>
          {editando && (
            <button type="button" onClick={iniciarNovo} className="bg-gray-500 text-white px-4 py-2 rounded">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-right">Total (kg)</th>
              <th className="p-3 text-right">Paletes</th>
              <th className="p-3 text-right">Borra</th>
              <th className="p-3 text-right">Gás</th>
              <th className="p-3 text-left">Obs</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {registros.map((reg) => (
              <tr key={reg.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{formatarDataBR(reg.data)}</td>
                <td className="p-3 text-right font-bold">{reg.total_kg > 0 ? reg.total_kg.toLocaleString('pt-BR') : '-'}</td>
                <td className="p-3 text-right">{reg.paletes > 0 ? reg.paletes : '-'}</td>
                <td className="p-3 text-right">{reg.borra_kg > 0 ? reg.borra_kg.toLocaleString('pt-BR') : '-'}</td>
                <td className="p-3 text-right">{reg.gas_glp > 0 ? reg.gas_glp.toLocaleString('pt-BR') : '-'}</td>
                <td className="p-3">{reg.observacoes}</td>
                <td className="p-3">
                  <button onClick={() => editar(reg)} className="text-blue-600 mr-2">
                    <Edit2 size={18} />
                  </button>
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
