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

export default function Laminacao() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Campos do formulário
  const [editando, setEditando] = useState(null);
  const [data, setData] = useState('');
  const [turno, setTurno] = useState('1');
  const [t1m1, setT1m1] = useState('');
  const [t1m2, setT1m2] = useState('');
  const [t1m3, setT1m3] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setCarregando(true);
    const { data: lista } = await supabase
      .from('laminacao_lancamentos')
      .select('*')
      .order('data', { ascending: false });
    setRegistros(lista || []);
    setCarregando(false);
  }

  function iniciarNovo() {
    setEditando(null);
    setData('');
    setTurno('1');
    setT1m1('');
    setT1m2('');
    setT1m3('');
    setObs('');
  }

  function editar(reg) {
    setEditando(reg.id);
    setData(formatarDataBR(reg.data));
    setTurno(reg.turno?.toString() || '1');
    setT1m1(reg.t1_maquina1_kg > 0 ? reg.t1_maquina1_kg : '');
    setT1m2(reg.t1_maquina2_kg > 0 ? reg.t1_maquina2_kg : '');
    setT1m3(reg.t1_maquina3_kg > 0 ? reg.t1_maquina3_kg : '');
    setObs(reg.observacoes || '');
  }

  async function salvar(e) {
    e.preventDefault();
    
    const dataISO = converterDataISO(data);
    
    const dados = {
      data: dataISO,
      turno: parseInt(turno),
      t1_maquina1_kg: parseFloat(t1m1) || 0,
      t1_maquina2_kg: parseFloat(t1m2) || 0,
      t1_maquina3_kg: parseFloat(t1m3) || 0,
      observacoes: obs
    };

    if (editando) {
      await supabase.from('laminacao_lancamentos').update(dados).eq('id', editando);
    } else {
      const { error } = await supabase.from('laminacao_lancamentos').insert(dados);
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
    await supabase.from('laminacao_lancamentos').delete().eq('id', id);
    carregarDados();
  }

  if (carregando) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Laminação</h1>

      {/* Formulário */}
      <form onSubmit={salvar} className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-bold mb-3">{editando ? 'Editar Registro' : 'Novo Registro'}</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
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
            <label className="block text-sm mb-1">Turno</label>
            <select className="w-full border p-2 rounded" value={turno} onChange={e => setTurno(e.target.value)}>
              <option value="1">Turno 1</option>
              <option value="2">Turno 2</option>
              <option value="3">Turno 3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Máquina 1 (kg)</label>
            <input type="number" className="w-full border p-2 rounded" value={t1m1} onChange={e => setT1m1(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Máquina 2 (kg)</label>
            <input type="number" className="w-full border p-2 rounded" value={t1m2} onChange={e => setT1m2(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Máquina 3 (kg)</label>
            <input type="number" className="w-full border p-2 rounded" value={t1m3} onChange={e => setT1m3(e.target.value)} placeholder="0" />
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
              <th className="p-3 text-center">Turno</th>
              <th className="p-3 text-right">Maq 1</th>
              <th className="p-3 text-right">Maq 2</th>
              <th className="p-3 text-right">Maq 3</th>
              <th className="p-3 text-left">Obs</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {registros.map((reg) => (
              <tr key={reg.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{formatarDataBR(reg.data)}</td>
                <td className="p-3 text-center">{reg.turno || 1}</td>
                <td className="p-3 text-right">{reg.t1_maquina1_kg > 0 ? reg.t1_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                <td className="p-3 text-right">{reg.t1_maquina2_kg > 0 ? reg.t1_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                <td className="p-3 text-right">{reg.t1_maquina3_kg > 0 ? reg.t1_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
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
