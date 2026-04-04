import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { ChevronLeft, ChevronRight, Save, Trash2, Plus } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Estrutura das colunas: [campo_no_banco, titulo, largura]
const COLUNAS = [
  ['data', 'DATA', '100px'],
  ['t1_maquina1_kg', 'T1-M1', '80px'],
  ['t1_maquina2_kg', 'T1-M2', '80px'],
  ['t1_maquina3_kg', 'T1-M3', '80px'],
  ['t2_maquina1_kg', 'T2-M1', '80px'],
  ['t2_maquina2_kg', 'T2-M2', '80px'],
  ['t2_maquina3_kg', 'T2-M3', '80px'],
  ['t3_maquina1_kg', 'T3-M1', '80px'],
  ['t3_maquina2_kg', 'T3-M2', '80px'],
  ['t3_maquina3_kg', 'T3-M3', '80px'],
  ['total_dia', 'TOTAL', '100px'],
  ['observacoes', 'OBSERVAÇÕES', '200px'],
];

export default function Laminacao() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [dados, setDados] = useState<Record<string, any>>({});
  const [editando, setEditando] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

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

  // Gerar dias do mês
  const dias = [];
  const ultimo = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    dias.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  function getValor(data: string, campo: string) {
    const reg = dados[data];
    if (!reg) return '';
    const val = reg[campo];
    if (val === 0 || val === null || val === undefined) return '';
    return val.toString();
  }

  function iniciarEdicao(data: string, campo: string, valor: string) {
    const key = `${data}-${campo}`;
    setEditando({ ...editando, [key]: valor });
  }

  function atualizarEdicao(data: string, campo: string, valor: string) {
    const key = `${data}-${campo}`;
    setEditando({ ...editando, [key]: valor });
  }

  async function salvarCelula(data: string, campo: string) {
    const key = `${data}-${campo}`;
    const valor = editando[key];
    if (valor === undefined) {
      console.log('Valor undefined, cancelando');
      return;
    }
    
    console.log('Salvando:', { data, campo, valor, key });
    setSalvando(key);
    
    // Remover do estado de edição
    const novoEditando = { ...editando };
    delete novoEditando[key];
    setEditando(novoEditando);

    const numValor = parseFloat(valor);
    console.log('Valor numérico:', numValor);
    
    if (isNaN(numValor)) {
      console.log('Valor inválido, cancelando');
      setSalvando(null);
      return;
    }
    
    // UPSERT: tentar update primeiro, se não existir faz insert
    const { data: existing } = await supabase
      .from('laminacao_lancamentos')
      .select('id')
      .eq('data', data);
    
    console.log('Registros encontrados:', existing);

    if (existing && existing.length > 0) {
      const id = existing[0].id;
      console.log('Fazendo UPDATE no ID:', id);
      const { error } = await supabase
        .from('laminacao_lancamentos')
        .update({ [campo]: numValor })
        .eq('id', id);
      if (error) console.error('Erro update:', error);
      else console.log('Update OK');
    } else {
      console.log('Fazendo INSERT');
      const { error } = await supabase
        .from('laminacao_lancamentos')
        .insert({ data, [campo]: numValor });
      if (error) console.error('Erro insert:', error);
      else console.log('Insert OK');
    }

    // Recarregar
    console.log('Recarregando dados...');
    await load();
    console.log('Dados após load:', dados);
    setSalvando(null);
  }

  function handleKeyDown(e: React.KeyboardEvent, data: string, campo: string) {
    if (e.key === 'Enter') {
      salvarCelula(data, campo);
    } else if (e.key === 'Escape') {
      const key = `${data}-${campo}`;
      delete editando[key];
      setEditando({ ...editando });
    }
  }

  // Calcular totais do mês
  const totalMes = Object.values(dados).reduce((s, r) => s + (r.total_dia || 0), 0);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laminação - Planilha de Produção</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setMes(m => m === 1 ? 12 : m - 1)}><ChevronLeft /></button>
          <select className="select" value={mes} onChange={e => setMes(+e.target.value)}>{MESES.map((n,i) => <option key={i} value={i+1}>{n}</option>)}</select>
          <select className="select" value={ano} onChange={e => setAno(+e.target.value)}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button className="btn-secondary" onClick={() => setMes(m => m === 12 ? 1 : m + 1)}><ChevronRight /></button>
          <span className="ml-4 font-bold text-lg">Total Mês: {totalMes.toLocaleString('pt-BR')} kg</span>
        </div>
      </div>

      {/* Tabela estilo Excel */}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="overflow-x-auto border border-slate-300 rounded">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-2 text-left font-bold border-r border-slate-600" style={{width:'100px'}}>DATA</th>
                <th colSpan={3} className="px-2 py-2 text-center font-bold border-r border-slate-600 bg-blue-700">TURNO 1</th>
                <th colSpan={3} className="px-2 py-2 text-center font-bold border-r border-slate-600 bg-green-700">TURNO 2</th>
                <th colSpan={3} className="px-2 py-2 text-center font-bold border-r border-slate-600 bg-purple-700">TURNO 3</th>
                <th className="px-2 py-2 text-center font-bold border-r border-slate-600 bg-slate-600">TOTAL</th>
                <th className="px-2 py-2 text-left font-bold">OBSERVAÇÕES</th>
              </tr>
              <tr className="bg-slate-700 text-white text-xs">
                <th className="border-r border-slate-600"></th>
                {['M1','M2','M3','M1','M2','M3','M1','M2','M3'].map((m, i) => (
                  <th key={i} className="px-1 py-1 text-center border-r border-slate-600" style={{width:'80px'}}>{m}</th>
                ))}
                <th className="border-r border-slate-600">kg</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dias.map((data, idx) => {
                const reg = dados[data];
                const isWeekend = new Date(data).getDay() === 0 || new Date(data).getDay() === 6;
                const bg = isWeekend ? 'bg-yellow-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                
                return (
                  <tr key={data} className={`${bg} hover:bg-blue-50`}>
                    <td className="px-2 py-1 font-mono text-xs border-r border-slate-200 font-bold">
                      {data.split('-').reverse().join('/')}
                    </td>
                    
                    {/* Campos editáveis */}
                    {COLUNAS.slice(1, -2).map(([campo, titulo]) => {
                      const key = `${data}-${campo}`;
                      const estaEditando = editando.hasOwnProperty(key);
                      const valor = estaEditando ? editando[key] : getValor(data, campo as string);
                      
                      return (
                        <td key={campo as string} className="p-0 border-r border-slate-200">
                          {estaEditando ? (
                            <input
                              type="number"
                              className="w-full h-full px-1 py-1 text-right font-mono text-sm border-2 border-blue-500 outline-none bg-yellow-100"
                              value={valor}
                              onChange={e => atualizarEdicao(data, campo as string, e.target.value)}
                              onBlur={() => salvarCelula(data, campo as string)}
                              onKeyDown={e => handleKeyDown(e, data, campo as string)}
                              autoFocus
                            />
                          ) : (
                            <div
                              className="px-1 py-1 text-right font-mono text-sm cursor-pointer hover:bg-blue-100 min-h-[24px]"
                              onClick={() => iniciarEdicao(data, campo as string, getValor(data, campo as string))}
                            >
                              {valor ? parseFloat(valor).toLocaleString('pt-BR') : ''}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    
                    {/* Total (calculado) */}
                    <td className="px-2 py-1 text-right font-mono font-bold border-r border-slate-200 bg-slate-100">
                      {reg?.total_dia ? reg.total_dia.toLocaleString('pt-BR') : ''}
                    </td>
                    
                    {/* Observações */}
                    <td className="p-0">
                      {<ObservacaoCell 
                        data={data} 
                        valor={reg?.observacoes || ''} 
                        onSave={load}
                      />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-sm text-slate-500">💡 Clique em qualquer célula para editar. Pressione Enter para salvar.</p>
    </div>
  );
}

// Componente para célula de observações
function ObservacaoCell({ data, valor, onSave }: { data: string, valor: string, onSave: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valorLocal, setValorLocal] = useState(valor);

  async function salvar() {
    const { data: existing } = await supabase
      .from('laminacao_lancamentos')
      .select('id')
      .eq('data', data)
      .single();

    if (existing) {
      await supabase.from('laminacao_lancamentos').update({ observacoes: valorLocal }).eq('id', existing.id);
    } else {
      await supabase.from('laminacao_lancamentos').insert({ data, observacoes: valorLocal });
    }
    setEditando(false);
    onSave();
  }

  if (editando) {
    return (
      <input
        className="w-full px-2 py-1 text-sm border-2 border-blue-500 outline-none"
        value={valorLocal}
        onChange={e => setValorLocal(e.target.value)}
        onBlur={salvar}
        onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditando(false); }}
        autoFocus
      />
    );
  }

  return (
    <div 
      className="px-2 py-1 text-sm cursor-pointer hover:bg-blue-100 min-h-[24px] truncate"
      onClick={() => setEditando(true)}
    >
      {valor}
    </div>
  );
}
