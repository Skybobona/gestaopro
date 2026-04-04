import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function Laminacao() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados ao abrir
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('laminacao_lancamentos')
      .select('*')
      .order('data', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newRow = {
      data: formData.get('data'),
      t1_maquina1_kg: parseFloat(formData.get('t1m1') as string) || 0,
      t1_maquina2_kg: parseFloat(formData.get('t1m2') as string) || 0,
      t2_maquina1_kg: parseFloat(formData.get('t2m1') as string) || 0,
      observacoes: formData.get('obs'),
    };

    await supabase.from('laminacao_lancamentos').insert(newRow);
    form.reset();
    fetchData(); // Recarregar
  }

  async function deleteRow(id: number) {
    await supabase.from('laminacao_lancamentos').delete().eq('id', id);
    fetchData();
  }

  if (loading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Laminação</h1>

      {/* Formulário simples */}
      <form onSubmit={addRow} className="card mb-4 space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <input name="data" type="date" className="input" required />
          <input name="t1m1" type="number" placeholder="T1-M1 KG" className="input" />
          <input name="t1m2" type="number" placeholder="T1-M2 KG" className="input" />
          <input name="t2m1" type="number" placeholder="T2-M1 KG" className="input" />
        </div>
        <input name="obs" placeholder="Observações" className="input w-full" />
        <button type="submit" className="btn-primary w-full">Adicionar Registro</button>
      </form>

      {/* Lista simples */}
      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.id} className="card flex justify-between items-center">
            <div>
              <strong>{row.data}</strong> | 
              T1-M1: {row.t1_maquina1_kg}kg | 
              T1-M2: {row.t1_maquina2_kg}kg | 
              T2-M1: {row.t2_maquina1_kg}kg
              {row.observacoes && <span className="text-slate-500"> | {row.observacoes}</span>}
            </div>
            <button onClick={() => deleteRow(row.id)} className="text-red-500">X</button>
          </div>
        ))}
      </div>
    </div>
  );
}
