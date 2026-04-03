import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, X, Check, Calendar, Download } from 'lucide-react';

export default function Laminacao() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [producao, setProducao] = useState([{ turno: 1, maquina: '', valor: 0 }]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: regs } = await supabase.from('laminacao_registros').select('*').order('data', { ascending: false });
    const { data: maqs } = await supabase.from('laminacao_maquinas_config').select('*').eq('ativo', true).order('ordem');
    setRegistros(regs || []);
    setMaquinas(maqs || []);
    setLoading(false);
  }

  async function save() {
    const { data: reg, error } = await supabase
      .from('laminacao_registros')
      .insert({ data, observacoes })
      .select()
      .single();
    
    if (error) {
      alert('Erro: ' + error.message);
      return;
    }

    // Inserir produção
    const prodData = producao
      .filter(p => p.maquina && p.valor > 0)
      .map(p => ({
        registro_id: reg.id,
        turno: p.turno,
        maquina: p.maquina,
        valor: p.valor
      }));

    if (prodData.length > 0) {
      await supabase.from('laminacao_producao').insert(prodData);
    }

    setModal(false);
    loadData();
  }

  async function remove(id: number) {
    if (!confirm('Excluir?')) return;
    await supabase.from('laminacao_producao').delete().eq('registro_id', id);
    await supabase.from('laminacao_registros').delete().eq('id', id);
    loadData();
  }

  const totalMes = registros.reduce((s, r) => s + (r.producao?.reduce((p: number, x: any) => p + (x.valor || 0), 0) || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Laminação</h1>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />Novo Registro
        </button>
      </div>

      <div className="card mb-4">
        <p className="text-sm text-slate-500">Total do Mês</p>
        <p className="text-3xl font-bold">{totalMes.toLocaleString()} kg</p>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="space-y-2">
          {registros.map(r => (
            <div key={r.id} className="card flex justify-between items-center">
              <div>
                <p className="font-bold">{new Date(r.data).toLocaleDateString('pt-BR')}</p>
                <p className="text-sm text-slate-500">{r.observacoes}</p>
              </div>
              <button onClick={() => remove(r.id)} className="btn-ghost text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Novo Registro</h3>
              <button onClick={() => setModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="modal-body">
              <label>Data</label>
              <input type="date" className="input" value={data} onChange={e => setData(e.target.value)} />
              
              <label className="mt-4">Observações</label>
              <input className="input" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional" />

              <p className="mt-4 font-bold">Produção por Turno/Máquina</p>
              {producao.map((p, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <select className="input w-24" value={p.turno} onChange={e => {
                    const newProd = [...producao];
                    newProd[i].turno = parseInt(e.target.value);
                    setProducao(newProd);
                  }}>
                    {[1,2,3].map(t => <option key={t} value={t}>Turno {t}</option>)}
                  </select>
                  <select className="input flex-1" value={p.maquina} onChange={e => {
                    const newProd = [...producao];
                    newProd[i].maquina = e.target.value;
                    setProducao(newProd);
                  }}>
                    <option value="">Selecione...</option>
                    {maquinas.map(m => <option key={m.id} value={m.maquina}>{m.maquina}</option>)}
                  </select>
                  <input type="number" className="input w-24" placeholder="kg" value={p.valor} onChange={e => {
                    const newProd = [...producao];
                    newProd[i].valor = parseInt(e.target.value) || 0;
                    setProducao(newProd);
                  }} />
                </div>
              ))}
              
              <button onClick={() => setProducao([...producao, { turno: 1, maquina: '', valor: 0 }])} className="btn-secondary mt-2">
                + Adicionar
              </button>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={save} className="btn-primary"><Check className="w-4 h-4" />Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
