import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, X, Check, AlertCircle, Shield, Lock, Unlock, UserCog } from 'lucide-react';

const PERFIS = ['admin', 'supervisor', 'operador'];

const MODULOS: { id: string; label: string; grupo: string }[] = [
  { id: 'clientes',     label: 'Clientes',            grupo: 'Cadastros' },
  { id: 'chapas',       label: 'Chapas',               grupo: 'Cadastros' },
  { id: 'estufas',      label: 'Estufas',              grupo: 'Cadastros' },
  { id: 'ordens',       label: 'Ordens de Serviço',    grupo: 'Produção' },
  { id: 'lancamentos',  label: 'Lançamentos',          grupo: 'Produção' },
  { id: 'perdas',       label: 'Gestão de Perdas',     grupo: 'Produção' },
  { id: 'eficiencia',   label: 'Eficiência',           grupo: 'Análise' },
  { id: 'relatorios',   label: 'Relatórios',           grupo: 'Análise' },
];

const ACOES: { id: string; label: string; color: string }[] = [
  { id: 'ler',    label: 'Ver',     color: 'text-blue-600' },
  { id: 'criar',  label: 'Criar',   color: 'text-emerald-600' },
  { id: 'editar', label: 'Editar',  color: 'text-amber-600' },
  { id: 'excluir',label: 'Excluir', color: 'text-red-500' },
];

const GRUPOS = ['Cadastros', 'Produção', 'Análise'];

const emptyPerms = (): Record<string, string[]> =>
  Object.fromEntries(MODULOS.map(m => [m.id, ['ler']]));

function togglePerm(perms: Record<string, string[]>, modulo: string, acao: string): Record<string, string[]> {
  const atual = perms[modulo] || [];
  const next = atual.includes(acao) ? atual.filter(a => a !== acao) : [...atual, acao];
  // criar/editar/excluir exigem ler
  if (next.length > 0 && !next.includes('ler')) next.push('ler');
  return { ...perms, [modulo]: next };
}

function toggleModulo(perms: Record<string, string[]>, modulo: string): Record<string, string[]> {
  const temAcesso = (perms[modulo] || []).length > 0;
  return { ...perms, [modulo]: temAcesso ? [] : ['ler'] };
}

function setTodasAcoes(perms: Record<string, string[]>, modulo: string, todas: boolean): Record<string, string[]> {
  return { ...perms, [modulo]: todas ? ACOES.map(a => a.id) : [] };
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'operador', ativo: 1 });
  const [permissoes, setPermissoes] = useState<Record<string, string[]>>(emptyPerms());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'dados' | 'permissoes'>('dados');

  const load = () => api.get('/usuarios').then(setUsuarios);
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ nome: '', email: '', senha: '', perfil: 'operador', ativo: 1 });
    setPermissoes(emptyPerms());
    setEditing(null); setError(''); setTab('dados'); setModal(true);
  };

  const openEdit = (u: any) => {
    setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil, ativo: u.ativo });
    const perms: Record<string, string[]> = {};
    MODULOS.forEach(m => { perms[m.id] = u.permissoes?.[m.id] || []; });
    setPermissoes(perms);
    setEditing(u); setError(''); setTab('dados'); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form, permissoes };
      if (editing) await api.put(`/usuarios/${editing.id}`, payload);
      else await api.post('/usuarios', payload);
      setModal(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const deactivate = async (id: number) => {
    if (!confirm('Desativar este usuário?')) return;
    await api.delete(`/usuarios/${id}`); load();
  };

  const isAdmin = form.perfil === 'admin';
  const totalPerms = (p: Record<string, string[]>) =>
    Object.values(p).reduce((s, a) => s + a.length, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários do Sistema</h1>
          <p className="page-subtitle">Controle de acesso granular por módulo e ação</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus className="w-4 h-4" />Novo Usuário</button>
      </div>

      {/* Legenda de perfis */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { perfil: 'admin', icon: Shield, label: 'Administrador', desc: 'Acesso irrestrito a tudo', color: 'text-slate-700', bg: 'bg-slate-100' },
          { perfil: 'supervisor', icon: UserCog, label: 'Supervisor', desc: 'Permissões configuráveis', color: 'text-slate-600', bg: 'bg-slate-50' },
          { perfil: 'operador', icon: Lock, label: 'Operador', desc: 'Permissões configuráveis', color: 'text-slate-500', bg: 'bg-slate-50' },
        ].map(p => (
          <div key={p.perfil} className="card py-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${p.bg} flex items-center justify-center flex-shrink-0`}>
              <p.icon className={`w-4 h-4 ${p.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 capitalize">{p.label}</p>
              <p className="text-xs text-slate-400">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Usuário</th>
                <th className="th">Email</th>
                <th className="th">Perfil</th>
                <th className="th">Permissões</th>
                <th className="th">Status</th>
                <th className="th">Cadastro</th>
                <th className="th">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const permsCount = u.perfil === 'admin' ? '∞' : totalPerms(u.permissoes || {});
                return (
                  <tr key={u.id}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{u.nome}</span>
                      </div>
                    </td>
                    <td className="td text-slate-500 text-sm">{u.email}</td>
                    <td className="td">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md capitalize
                        ${u.perfil === 'admin' ? 'bg-slate-900 text-white' : u.perfil === 'supervisor' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.perfil === 'admin' ? <Shield className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {u.perfil}
                      </span>
                    </td>
                    <td className="td">
                      {u.perfil === 'admin' ? (
                        <span className="text-xs text-slate-400 italic">Acesso total</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {MODULOS.filter(m => (u.permissoes?.[m.id] || []).length > 0).slice(0, 3).map(m => (
                            <span key={m.id} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{m.label}</span>
                          ))}
                          {MODULOS.filter(m => (u.permissoes?.[m.id] || []).length > 0).length > 3 && (
                            <span className="text-xs text-slate-400">+{MODULOS.filter(m => (u.permissoes?.[m.id] || []).length > 0).length - 3}</span>
                          )}
                          {permsCount === 0 && <span className="text-xs text-slate-300 italic">Sem acesso</span>}
                        </div>
                      )}
                    </td>
                    <td className="td">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${u.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="td text-slate-400 text-xs">{u.criado_em?.split('T')[0]}</td>
                    <td className="td">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="btn-ghost btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                        {u.ativo && <button onClick={() => deactivate(u.id)} className="btn-ghost btn-sm text-slate-300 hover:text-red-500 text-xs">Desativar</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && <tr><td colSpan={7} className="td text-center text-slate-400 py-12">Nenhum usuário cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-900">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Defina dados e permissões de acesso</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {(['dados', 'permissoes'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px
                    ${tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  {t === 'dados' ? 'Dados' : 'Permissões'}
                </button>
              ))}
            </div>

            <form onSubmit={save}>
              <div className="modal-body">
                {error && <div className="alert-error mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

                {/* Aba Dados */}
                {tab === 'dados' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Nome *</label>
                        <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="label">Email *</label>
                        <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                      </div>
                      <div className="col-span-2">
                        <label className="label">{editing ? 'Nova Senha (em branco para manter)' : 'Senha *'}</label>
                        <input type="password" className="input" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} required={!editing} />
                      </div>
                    </div>

                    <div>
                      <label className="label mb-2">Perfil *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {PERFIS.map(p => (
                          <button key={p} type="button" onClick={() => setForm(f => ({ ...f, perfil: p }))}
                            className={`py-3 px-3 rounded-xl text-xs font-semibold border-2 transition-all capitalize
                              ${form.perfil === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                            {p === 'admin' ? '⚙ Admin' : p === 'supervisor' ? '👔 Supervisor' : '🔧 Operador'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {editing && (
                      <div>
                        <label className="label mb-2">Status</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[{ v: 1, l: '● Ativo' }, { v: 0, l: '○ Inativo' }].map(s => (
                            <button key={s.v} type="button" onClick={() => setForm(f => ({ ...f, ativo: s.v }))}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all
                                ${form.ativo === s.v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                              {s.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Aba Permissões */}
                {tab === 'permissoes' && (
                  <div>
                    {isAdmin ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-4">
                          <Unlock className="w-7 h-7 text-white" />
                        </div>
                        <p className="font-bold text-slate-800">Administrador tem acesso total</p>
                        <p className="text-sm text-slate-400 mt-1">Não é necessário configurar permissões</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-400">Configure o que este usuário pode fazer em cada módulo</p>
                          <div className="flex gap-2">
                            <button type="button" className="btn-secondary btn-sm"
                              onClick={() => setPermissoes(Object.fromEntries(MODULOS.map(m => [m.id, ACOES.map(a => a.id)])))}>
                              Tudo
                            </button>
                            <button type="button" className="btn-secondary btn-sm"
                              onClick={() => setPermissoes(Object.fromEntries(MODULOS.map(m => [m.id, []])))}>
                              Nenhum
                            </button>
                          </div>
                        </div>

                        {GRUPOS.map(grupo => (
                          <div key={grupo}>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{grupo}</p>
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Módulo</th>
                                    {ACOES.map(a => (
                                      <th key={a.id} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 w-16">{a.label}</th>
                                    ))}
                                    <th className="px-3 py-2.5 w-10" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {MODULOS.filter(m => m.grupo === grupo).map((m, i, arr) => {
                                    const mPerms = permissoes[m.id] || [];
                                    const todas = ACOES.every(a => mPerms.includes(a.id));
                                    const alguma = mPerms.length > 0;
                                    return (
                                      <tr key={m.id} className={`${i < arr.length - 1 ? 'border-b border-slate-100' : ''} ${alguma ? '' : 'opacity-50'}`}>
                                        <td className="px-4 py-2.5 font-medium text-slate-700">{m.label}</td>
                                        {ACOES.map(a => (
                                          <td key={a.id} className="px-3 py-2.5 text-center">
                                            <button type="button"
                                              onClick={() => setPermissoes(p => togglePerm(p, m.id, a.id))}
                                              className={`w-5 h-5 rounded border-2 transition-all inline-flex items-center justify-center
                                                ${mPerms.includes(a.id)
                                                  ? 'bg-slate-900 border-slate-900'
                                                  : 'bg-white border-slate-300 hover:border-slate-500'}`}>
                                              {mPerms.includes(a.id) && <Check className="w-3 h-3 text-white" />}
                                            </button>
                                          </td>
                                        ))}
                                        <td className="px-3 py-2.5 text-center">
                                          <button type="button"
                                            onClick={() => setPermissoes(p => setTodasAcoes(p, m.id, !todas))}
                                            title={todas ? 'Remover tudo' : 'Marcar tudo'}
                                            className="text-xs text-slate-400 hover:text-slate-700 font-medium">
                                            {todas ? '✕' : '✓'}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {tab === 'dados' && !isAdmin && (
                  <button type="button" className="btn-secondary mr-auto" onClick={() => setTab('permissoes')}>
                    Permissões →
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : <><Check className="w-4 h-4" />Salvar Usuário</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
