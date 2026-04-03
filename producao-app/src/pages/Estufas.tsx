import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, X, Check, Clock, Send, CheckCircle, AlertCircle, Flame } from 'lucide-react';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function Estufas() {
  const [data, setData] = useState<any>({ estufas: [], horarios: [] });
  const [ordens, setOrdens] = useState<any[]>([]);
  const [envios, setEnvios] = useState<any[]>([]);
  const [horarioModal, setHorarioModal] = useState(false);
  const [envioModal, setEnvioModal] = useState(false);
  const [horarioForm, setHorarioForm] = useState({ estufa_id: '', dia_semana: 'Segunda', hora_inicio: '06:00', hora_fim: '14:00' });
  const [envioForm, setEnvioForm] = useState({ estufa_id: '', os_id: '', quantidade: '', peso_kg: '', hora_envio: '', observacoes: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/estufas').then(setData);
    api.get('/estufas/envios').then(setEnvios);
    api.get('/producao/os').then(d => setOrdens(d.filter((o: any) => o.status !== 'cancelada' && o.status !== 'concluida')));
  };
  useEffect(() => { load(); }, []);

  const saveHorario = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await api.post('/estufas/horarios', { ...horarioForm, estufa_id: parseInt(horarioForm.estufa_id) }); setHorarioModal(false); load(); }
    catch (err: any) { setError(err.message); }
  };

  const saveEnvio = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/estufas/envios', { estufa_id: parseInt(envioForm.estufa_id), os_id: parseInt(envioForm.os_id), quantidade: parseInt(envioForm.quantidade), peso_kg: parseFloat(envioForm.peso_kg), hora_envio: envioForm.hora_envio || null, observacoes: envioForm.observacoes || null });
      setEnvioModal(false); load();
    } catch (err: any) { setError(err.message); }
  };

  const atualizarStatus = async (id: number, status: string) => { await api.patch(`/estufas/envios/${id}/status`, { status }); load(); };

  const statusColor: any = { aguardando: 'badge-yellow', enviado: 'badge-blue', concluido: 'badge-green' };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header">
        <div><h1 className="page-title">Controle de Estufas</h1><p className="page-subtitle">Gestão das 3 estufas e envios de produção</p></div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => { setHorarioForm({ estufa_id: '', dia_semana: 'Segunda', hora_inicio: '06:00', hora_fim: '14:00' }); setError(''); setHorarioModal(true); }}><Clock className="w-4 h-4" />Horário</button>
          <button className="btn-primary" onClick={() => { setEnvioForm({ estufa_id: '', os_id: '', quantidade: '', peso_kg: '', hora_envio: '', observacoes: '' }); setError(''); setEnvioModal(true); }}><Send className="w-4 h-4" />Novo Envio</button>
        </div>
      </div>

      {/* Cards das estufas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.estufas.map((estufa: any) => {
          const horarios = data.horarios.filter((h: any) => h.estufa_id === estufa.id);
          const enviosAtivos = envios.filter((e: any) => e.estufa_id === estufa.id && e.status !== 'concluido');
          const pesoEnviado = enviosAtivos.reduce((s: number, e: any) => s + e.peso_kg, 0);
          const pct = Math.min(100, (pesoEnviado / estufa.capacidade_kg) * 100);
          return (
            <div key={estufa.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${estufa.ativa ? 'bg-orange-50' : 'bg-slate-100'}`}>
                    <Flame className={`w-5 h-5 ${estufa.ativa ? 'text-orange-500' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{estufa.nome}</p>
                    <p className="text-xs text-slate-400">Cap. {estufa.capacidade_kg} kg</p>
                  </div>
                </div>
                <span className={estufa.ativa ? 'badge-green' : 'badge-red'}>{estufa.ativa ? 'Ativa' : 'Inativa'}</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Ocupação atual</span>
                  <span className="font-semibold">{pesoEnviado.toFixed(1)} / {estufa.capacidade_kg} kg</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">{pct.toFixed(0)}% ocupado</p>
              </div>

              <div>
                <p className="section-title">Horários</p>
                {horarios.length === 0
                  ? <p className="text-xs text-slate-400 py-2">Nenhum horário cadastrado</p>
                  : horarios.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700">{h.dia_semana}</span>
                      <span className="text-slate-500 font-mono">{h.hora_inicio} – {h.hora_fim}</span>
                      <button onClick={() => api.delete(`/estufas/horarios/${h.id}`).then(load)} className="text-slate-300 hover:text-rose-500 transition-colors ml-2"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de envios */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div><h2 className="font-bold text-slate-900">Envios para Estufas</h2><p className="text-xs text-slate-400 mt-0.5">{envios.length} registros</p></div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th className="th">Estufa</th><th className="th">OS</th><th className="th">Cliente</th>
              <th className="th">Qtd</th><th className="th">Peso</th><th className="th">Data</th>
              <th className="th">Hora</th><th className="th">Status</th><th className="th">Ações</th>
            </tr></thead>
            <tbody>
              {envios.map((e: any) => (
                <tr key={e.id}>
                  <td className="td font-medium">{e.estufa_nome}</td>
                  <td className="td font-mono text-xs text-indigo-600 font-semibold">{e.os_numero}</td>
                  <td className="td">{e.cliente_nome}</td>
                  <td className="td text-right">{e.quantidade}</td>
                  <td className="td text-right font-semibold">{e.peso_kg} kg</td>
                  <td className="td text-slate-500 text-xs">{e.data_envio}</td>
                  <td className="td text-slate-500">{e.hora_envio || '—'}</td>
                  <td className="td"><span className={statusColor[e.status] || 'badge-gray'}>{e.status}</span></td>
                  <td className="td">
                    {e.status === 'aguardando' && <button onClick={() => atualizarStatus(e.id, 'enviado')} className="btn-secondary btn-sm"><Send className="w-3 h-3" />Enviar</button>}
                    {e.status === 'enviado' && <button onClick={() => atualizarStatus(e.id, 'concluido')} className="btn-success btn-sm"><CheckCircle className="w-3 h-3" />Concluir</button>}
                  </td>
                </tr>
              ))}
              {envios.length === 0 && <tr><td colSpan={9} className="td text-center text-slate-400 py-12">Nenhum envio registrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal horário */}
      {horarioModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHorarioModal(false)}>
          <div className="modal max-w-sm">
            <div className="modal-header"><div><h2 className="font-bold text-slate-900">Cadastrar Horário</h2></div><button onClick={() => setHorarioModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
            <form onSubmit={saveHorario}>
              <div className="modal-body">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4" />{error}</div>}
                <div><label className="label">Estufa *</label><select className="select" value={horarioForm.estufa_id} onChange={e => setHorarioForm(f => ({ ...f, estufa_id: e.target.value }))} required><option value="">Selecione...</option>{data.estufas.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
                <div><label className="label">Dia da Semana *</label><select className="select" value={horarioForm.dia_semana} onChange={e => setHorarioForm(f => ({ ...f, dia_semana: e.target.value }))}>{DIAS.map(d => <option key={d}>{d}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Início</label><input type="time" className="input" value={horarioForm.hora_inicio} onChange={e => setHorarioForm(f => ({ ...f, hora_inicio: e.target.value }))} /></div>
                  <div><label className="label">Fim</label><input type="time" className="input" value={horarioForm.hora_fim} onChange={e => setHorarioForm(f => ({ ...f, hora_fim: e.target.value }))} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setHorarioModal(false)}>Cancelar</button><button type="submit" className="btn-primary"><Check className="w-4 h-4" />Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal envio */}
      {envioModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEnvioModal(false)}>
          <div className="modal">
            <div className="modal-header"><div><h2 className="font-bold text-slate-900">Registrar Envio</h2><p className="text-xs text-slate-400 mt-0.5">Envio de material para estufa</p></div><button onClick={() => setEnvioModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
            <form onSubmit={saveEnvio}>
              <div className="modal-body">
                {error && <div className="alert-error"><AlertCircle className="w-4 h-4" />{error}</div>}
                <div><label className="label">Estufa *</label><select className="select" value={envioForm.estufa_id} onChange={e => setEnvioForm(f => ({ ...f, estufa_id: e.target.value }))} required><option value="">Selecione...</option>{data.estufas.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
                <div><label className="label">Ordem de Serviço *</label><select className="select" value={envioForm.os_id} onChange={e => setEnvioForm(f => ({ ...f, os_id: e.target.value }))} required><option value="">Selecione...</option>{ordens.map((o: any) => <option key={o.id} value={o.id}>{o.numero} – {o.cliente_nome}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Quantidade *</label><input type="number" className="input" value={envioForm.quantidade} onChange={e => setEnvioForm(f => ({ ...f, quantidade: e.target.value }))} required /></div>
                  <div><label className="label">Peso (kg) *</label><input type="number" step="0.01" className="input" value={envioForm.peso_kg} onChange={e => setEnvioForm(f => ({ ...f, peso_kg: e.target.value }))} required /></div>
                </div>
                <div><label className="label">Hora Programada</label><input type="time" className="input" value={envioForm.hora_envio} onChange={e => setEnvioForm(f => ({ ...f, hora_envio: e.target.value }))} /></div>
                <div><label className="label">Observações</label><textarea className="input" rows={2} value={envioForm.observacoes} onChange={e => setEnvioForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setEnvioModal(false)}>Cancelar</button><button type="submit" className="btn-primary"><Check className="w-4 h-4" />Registrar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
