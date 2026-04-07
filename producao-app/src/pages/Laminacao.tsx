import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ChevronLeft, ChevronRight, Trash2, X, Save, Plus } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Gerar dias do mês
function getDiasDoMes(ano: number, mes: number) {
  const dias = [];
  const ultimo = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    dias.push(`${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  return dias;
}

export default function Laminacao() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [dados, setDados] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState('');
  const [formValues, setFormValues] = useState({
    t1_maquina1_kg: '', t1_maquina2_kg: '', t1_maquina3_kg: '',
    t2_maquina1_kg: '', t2_maquina2_kg: '', t2_maquina3_kg: '',
    t3_maquina1_kg: '', t3_maquina2_kg: '', t3_maquina3_kg: '',
    observacoes: ''
  });

  useEffect(() => { load(); }, [ano, mes]);

  async function load() {
    setLoading(true);
    const mesStr = String(mes).padStart(2, '0');
    const { data: rows } = await supabase
      .from('laminacao_lancamentos')
      .select('*')
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-31`)
      .order('data');
    
    const map: Record<string, any> = {};
    (rows || []).forEach(r => { map[r.data] = r; });
    setDados(map);
    setLoading(false);
  }

  function openModal(data: string) {
    const reg = dados[data];
    setModalData(data);
    setFormValues({
      t1_maquina1_kg: reg?.t1_maquina1_kg > 0 ? reg.t1_maquina1_kg : '',
      t1_maquina2_kg: reg?.t1_maquina2_kg > 0 ? reg.t1_maquina2_kg : '',
      t1_maquina3_kg: reg?.t1_maquina3_kg > 0 ? reg.t1_maquina3_kg : '',
      t2_maquina1_kg: reg?.t2_maquina1_kg > 0 ? reg.t2_maquina1_kg : '',
      t2_maquina2_kg: reg?.t2_maquina2_kg > 0 ? reg.t2_maquina2_kg : '',
      t2_maquina3_kg: reg?.t2_maquina3_kg > 0 ? reg.t2_maquina3_kg : '',
      t3_maquina1_kg: reg?.t3_maquina1_kg > 0 ? reg.t3_maquina1_kg : '',
      t3_maquina2_kg: reg?.t3_maquina2_kg > 0 ? reg.t3_maquina2_kg : '',
      t3_maquina3_kg: reg?.t3_maquina3_kg > 0 ? reg.t3_maquina3_kg : '',
      observacoes: reg?.observacoes || ''
    });
    setModalOpen(true);
  }

  async function salvar() {
    const valores = Object.fromEntries(
      Object.entries(formValues).map(([k, v]) => [k, v === '' ? 0 : parseFloat(v as string)])
    );

    const regExistente = dados[modalData];
    
    if (regExistente) {
      await supabase.from('laminacao_lancamentos').update(valores).eq('id', regExistente.id);
    } else {
      await supabase.from('laminacao_lancamentos').insert({ data: modalData, ...valores });
    }
    
    setModalOpen(false);
    load();
  }

  async function excluir(data: string) {
    if (!confirm('Excluir todos os dados deste dia?')) return;
    const reg = dados[data];
    if (reg) {
      await supabase.from('laminacao_lancamentos').delete().eq('id', reg.id);
      load();
    }
  }

  const dias = getDiasDoMes(ano, mes);
  const totalMes = Object.values(dados).reduce((s, r) => s + (r.total_dia || 0), 0);

  return (
    <div className="p-4 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laminação</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setMes(m => m === 1 ? 12 : m - 1)}><ChevronLeft className="w-4 h-4" /></button>
          <select className="select" value={mes} onChange={e => setMes(+e.target.value)}>{MESES.map((n,i) => <option key={i} value={i+1}>{n}</option>)}</select>
          <select className="select" value={ano} onChange={e => setAno(+e.target.value)}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button className="btn-secondary" onClick={() => setMes(m => m === 12 ? 1 : m + 1)}><ChevronRight className="w-4 h-4" /></button>
          <span className="ml-4 font-bold text-lg">Total Mês: {totalMes.toLocaleString('pt-BR')} kg</span>
        </div>
      </div>

      {/* Tabela Excel */}
      {loading ? <p>Carregando...</p> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th rowSpan={2} className="px-2 py-2 text-left border-r border-slate-700">DATA</th>
                  <th colSpan={3} className="px-2 py-1 text-center border-r border-slate-700 bg-blue-800">TURNO 1</th>
                  <th colSpan={3} className="px-2 py-1 text-center border-r border-slate-700 bg-green-800">TURNO 2</th>
                  <th colSpan={3} className="px-2 py-1 text-center border-r border-slate-700 bg-purple-800">TURNO 3</th>
                  <th rowSpan={2} className="px-2 py-2 text-right border-r border-slate-700">TOTAL</th>
                  <th rowSpan={2} className="px-2 py-2">AÇÕES</th>
                </tr>
                <tr className="text-xs">
                  {['M1','M2','M3','M1','M2','M3','M1','M2','M3'].map((m, i) => (
                    <th key={i} className={`px-2 py-1 text-center border-r border-slate-700 ${i < 3 ? 'bg-blue-700' : i < 6 ? 'bg-green-700' : 'bg-purple-700'}`}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dias.map((data, idx) => {
                  const reg = dados[data];
                  const isWeekend = new Date(data).getDay() === 0 || new Date(data).getDay() === 6;
                  const bg = isWeekend ? 'bg-yellow-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  const temDados = !!reg;
                  
                  return (
                    <tr 
                      key={data} 
                      className={`${bg} hover:bg-blue-100 cursor-pointer transition-colors`}
                      onClick={() => openModal(data)}
                    >
                      <td className="px-2 py-2 font-mono text-xs border-r border-slate-200">
                        {data.split('-').reverse().join('/')}
                      </td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t1_maquina1_kg > 0 ? reg.t1_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t1_maquina2_kg > 0 ? reg.t1_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t1_maquina3_kg > 0 ? reg.t1_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t2_maquina1_kg > 0 ? reg.t2_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t2_maquina2_kg > 0 ? reg.t2_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t2_maquina3_kg > 0 ? reg.t2_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t3_maquina1_kg > 0 ? reg.t3_maquina1_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t3_maquina2_kg > 0 ? reg.t3_maquina2_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono border-r border-slate-200">{reg?.t3_maquina3_kg > 0 ? reg.t3_maquina3_kg.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold border-r border-slate-200">{reg?.total_dia > 0 ? reg.total_dia.toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-2 py-2">
                        {temDados && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); excluir(data); }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal Popup */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-bold">Lançamento - {modalData.split('-').reverse().join('/')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="modal-body">
              <div className="grid grid-cols-3 gap-4">
                {/* Turno 1 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-blue-700 border-b border-blue-200 pb-1">Turno 1</h4>
                  {['t1_maquina1_kg', 't1_maquina2_kg', 't1_maquina3_kg'].map((campo, i) => (
                    <div key={campo}>
                      <label className="text-xs text-slate-500">Máquina {i+1} (kg)</label>
                      <input
                        type="number"
                        className="input w-full"
                        value={formValues[campo as keyof typeof formValues]}
                        onChange={e => setFormValues({...formValues, [campo]: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                
                {/* Turno 2 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-green-700 border-b border-green-200 pb-1">Turno 2</h4>
                  {['t2_maquina1_kg', 't2_maquina2_kg', 't2_maquina3_kg'].map((campo, i) => (
                    <div key={campo}>
                      <label className="text-xs text-slate-500">Máquina {i+1} (kg)</label>
                      <input
                        type="number"
                        className="input w-full"
                        value={formValues[campo as keyof typeof formValues]}
                        onChange={e => setFormValues({...formValues, [campo]: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                
                {/* Turno 3 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-purple-700 border-b border-purple-200 pb-1">Turno 3</h4>
                  {['t3_maquina1_kg', 't3_maquina2_kg', 't3_maquina3_kg'].map((campo, i) => (
                    <div key={campo}>
                      <label className="text-xs text-slate-500">Máquina {i+1} (kg)</label>
                      <input
                        type="number"
                        className="input w-full"
                        value={formValues[campo as keyof typeof formValues]}
                        onChange={e => setFormValues({...formValues, [campo]: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="text-xs text-slate-500">Observações</label>
                <input
                  type="text"
                  className="input w-full"
                  value={formValues.observacoes}
                  onChange={e => setFormValues({...formValues, observacoes: e.target.value})}
                  placeholder="Digite observações se houver..."
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar}>
                <Save className="w-4 h-4" />Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
