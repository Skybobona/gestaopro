import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, X, Check, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TURNOS = [1, 2, 3];
const TURNO_LABEL: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };

function fmt(v: number) {
  return v?.toLocaleString('pt-BR') || '0';
}

export default function Laminacao() {
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [registros, setRegistros] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário simplificado
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState('');
  const [formObs, setFormObs] = useState('');
  const [formTurno, setFormTurno] = useState(1);
  const [formMaq, setFormMaq] = useState('');
  const [formKg, setFormKg] = useState('');

  useEffect(() => { loadData(); }, [ano, mes]);

  async function loadData() {
    setLoading(true);
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = new Date(ano, mes, 0).getDate();
    
    const { data: regs } = await supabase
      .from('laminacao_registros')
      .select('*')
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-${ultimoDia}`)
      .order('data');
    
    const registrosComProd = await Promise.all((regs || []).map(async (r) => {
      const { data: prod } = await supabase.from('laminacao_producao').select('*').eq('registro_id', r.id);
      return { ...r, producao: prod || [] };
    }));
    
    const { data: maqs } = await supabase.from('laminacao_maquinas_config').select('*').eq('ativo', true).order('ordem');
    
    setRegistros(registrosComProd);
    setMaquinas(maqs || []);
    setLoading(false);
  }

  async function salvar() {
    if (!formData || !formMaq || !formKg) {
      alert('Preencha data, máquina e KG!');
      return;
    }

    const kgNum = parseFloat(formKg);
    if (isNaN(kgNum) || kgNum <= 0) {
      alert('KG inválido!');
      return;
    }

    // Verificar se já existe registro para esta data
    const { data: existing } = await supabase.from('laminacao_registros').select('id').eq('data', formData).single();
    
    let regId;
    if (existing) {
      await supabase.from('laminacao_registros').update({ observacoes: formObs }).eq('id', existing.id);
      regId = existing.id;
    } else {
      const { data: reg } = await supabase.from('laminacao_registros').insert({ data: formData, observacoes: formObs }).select().single();
      regId = reg.id;
    }

    // Inserir produção
    await supabase.from('laminacao_producao').insert({
      registro_id: regId,
      turno: formTurno,
      maquina: formMaq,
      valor: kgNum
    });

    setShowForm(false);
    setFormData('');
    setFormObs('');
    setFormTurno(1);
    setFormMaq('');
    setFormKg('');
    loadData();
  }

  async function excluir(id: number) {
    if (!confirm('Excluir?')) return;
    await supabase.from('laminacao_producao').delete().eq('registro_id', id);
    await supabase.from('laminacao_registros').delete().eq('id', id);
    loadData();
  }

  // Calcular dias do mês
  const dias = [];
  const ultimo = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= ultimo; d++) dias.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  const regByDate = {} as Record<string, any>;
  registros.forEach(r => regByDate[r.data] = r);

  const totalKg = registros.reduce((s, r) => s + (r.producao?.reduce((p: number, x: any) => p + (x.valor || 0), 0) || 0), 0);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laminação</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" />Novo</button>
      </div>

      {/* Navegação */}
      <div className="flex items-center gap-2 mb-4">
        <button className="btn-secondary" onClick={() => setMes(m => m === 1 ? 12 : m - 1)}><ChevronLeft /></button>
        <select className="select" value={mes} onChange={e => setMes(+e.target.value)}>
          {MESES_PT.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
        </select>
        <select className="select" value={ano} onChange={e => setAno(+e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => setMes(m => m === 12 ? 1 : m + 1)}><ChevronRight /></button>
        <span className="ml-4 font-bold">Total: {fmt(totalKg)} kg</span>
      </div>

      {/* Tabela */}
      {loading ? <p>Carregando...</p> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2 text-left">DATA</th>
                <th className="px-3 py-2 text-left">TURNO</th>
                <th className="px-3 py-2 text-left">MÁQUINA</th>
                <th className="px-3 py-2 text-right">KG</th>
                <th className="px-3 py-2">OBS</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {dias.map((data, idx) => {
                const reg = regByDate[data];
                const prod = reg?.producao || [];
                const bg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                
                if (!reg || prod.length === 0) {
                  return (
                    <tr key={data} className={`${bg} border-b`}>
                      <td className="px-3 py-2">{data.split('-').reverse().join('/')}</td>
                      <td className="px-3 py-2 text-slate-300">—</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-2 py-2"><button onClick={() => { setFormData(data); setShowForm(true); }} className="p-1 text-slate-400"><Plus className="w-4 h-4" /></button></td>
                    </tr>
                  );
                }

                return prod.map((p: any, i: number) => (
                  <tr key={`${data}-${i}`} className={`${bg} border-b`}>
                    {i === 0 && <td rowSpan={prod.length} className="px-3 py-2 font-mono">{data.split('-').reverse().join('/')}</td>}
                    <td className="px-3 py-2">{TURNO_LABEL[p.turno]}</td>
                    <td className="px-3 py-2">{p.maquina}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(p.valor)}</td>
                    {i === 0 && <td rowSpan={prod.length} className="px-3 py-2 text-slate-500">{reg.observacoes}</td>}
                    {i === 0 && (
                      <td rowSpan={prod.length} className="px-2 py-2">
                        <button onClick={() => excluir(reg.id)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal max-w-md">
            <div className="modal-header">
              <h3>Novo Registro</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <label className="label">Data *</label>
                <input type="date" className="input" value={formData} onChange={e => setFormData(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Turno</label>
                  <select className="input" value={formTurno} onChange={e => setFormTurno(+e.target.value)}>
                    {TURNOS.map(t => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Máquina *</label>
                  <select className="input" value={formMaq} onChange={e => setFormMaq(e.target.value)}>
                    <option value="">Selecione...</option>
                    {maquinas.filter(m => m.turno === formTurno).map(m => <option key={m.id} value={m.maquina}>{m.maquina}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">KG Produzidos *</label>
                <input type="number" className="input" value={formKg} onChange={e => setFormKg(e.target.value)} placeholder="Ex: 1500" />
              </div>
              <div>
                <label className="label">Observações</label>
                <input className="input" value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Opcional" />
              </div>
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
