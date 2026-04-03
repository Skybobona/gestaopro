import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Users, Layers, ClipboardList, Factory, TrendingDown,
  BarChart2, ArrowUpRight, ArrowDownRight, Activity,
  Flame, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/clientes').catch(() => []),
      api.get('/chapas').catch(() => []),
      api.get('/producao/os').catch(() => []),
      api.get('/lancamentos').catch(() => []),
      api.get('/perdas').catch(() => []),
      api.get('/estufas').catch(() => ({ estufas: [] })),
    ]).then(([clientes, chapas, ordens, lancamentos, perdas, estufasData]) => {
      setStats({
        clientes: Array.isArray(clientes) ? clientes : [],
        chapas: Array.isArray(chapas) ? chapas : [],
        ordens: Array.isArray(ordens) ? ordens : [],
        lancamentos: Array.isArray(lancamentos) ? lancamentos : [],
        perdas: Array.isArray(perdas) ? perdas : [],
        estufas: Array.isArray(estufasData?.estufas) ? estufasData.estufas : [],
      });
    }).catch(() => {
      setApiError(true);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-500 text-sm">Carregando...</span>
    </div>
  );

  if (apiError || !stats) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-rose-400" />
      <p className="text-slate-600 font-semibold">Não foi possível conectar ao servidor</p>
      <p className="text-slate-400 text-sm">Verifique se o backend está rodando na porta 3001</p>
      <button onClick={() => { setLoading(true); setApiError(false); setStats(null); }}
        className="btn-primary mt-2">Tentar novamente</button>
    </div>
  );

  const { clientes, chapas, ordens, lancamentos, perdas, estufas } = stats;
  const ordensAbertas    = ordens.filter((o: any) => o.status === 'aberta').length;
  const ordensEmProd     = ordens.filter((o: any) => o.status === 'em_producao').length;
  const ordensConcluidas = ordens.filter((o: any) => o.status === 'concluida').length;
  const pesoTotal    = lancamentos.reduce((s: number, l: any) => s + l.peso_produzido, 0);
  const horasTotal   = lancamentos.reduce((s: number, l: any) => s + l.horas_lancadas, 0);
  const kgPorHora    = horasTotal > 0 ? (pesoTotal / horasTotal).toFixed(1) : '—';
  const totalPerdas  = perdas.reduce((s: number, p: any) => s + p.perda_kg, 0);
  const clientesAtivos = clientes.filter((c: any) => c.ativo).length;
  const chapasEstoque  = chapas.reduce((s: number, c: any) => s + c.quantidade, 0);

  return (
    <div className="space-y-6 max-w-7xl">

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Clientes Ativos"
          value={clientesAtivos}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          sub={`${clientes.length} cadastrados`}
        />
        <KpiCard
          label="OS em Produção"
          value={ordensEmProd}
          icon={<Factory className="w-5 h-5" />}
          color="amber"
          sub={`${ordensAbertas} aguardando`}
        />
        <KpiCard
          label="Chapas em Estoque"
          value={chapasEstoque}
          icon={<Layers className="w-5 h-5" />}
          color="emerald"
          sub={`${chapas.length} tipos`}
        />
        <KpiCard
          label="OS Concluídas"
          value={ordensConcluidas}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="purple"
          sub={`${ordens.length} total`}
        />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Produção Total"
          value={`${pesoTotal.toFixed(1)} kg`}
          icon={<Activity className="w-5 h-5 text-indigo-500" />}
          detail={`${lancamentos.length} lançamentos · ${horasTotal.toFixed(0)}h trabalhadas`}
          accent="indigo"
        />
        <MetricCard
          title="Eficiência Média"
          value={`${kgPorHora} kg/h`}
          icon={<BarChart2 className="w-5 h-5 text-emerald-500" />}
          detail="Quilos produzidos por hora lançada"
          accent="emerald"
        />
        <MetricCard
          title="Total de Perdas"
          value={`${totalPerdas.toFixed(1)} kg`}
          icon={<TrendingDown className="w-5 h-5 text-rose-500" />}
          detail={`${perdas.length} registros de perda`}
          accent="rose"
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* OS recentes */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900">Ordens de Serviço Recentes</h2>
              <p className="text-slate-400 text-xs mt-0.5">Últimas ordens cadastradas</p>
            </div>
            <span className="badge-blue">{ordens.length} total</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Número</th>
                  <th className="th">Cliente</th>
                  <th className="th">Tipo</th>
                  <th className="th">Status</th>
                  <th className="th">Data</th>
                </tr>
              </thead>
              <tbody>
                {ordens.slice(0, 7).map((os: any) => (
                  <tr key={os.id}>
                    <td className="td font-mono font-semibold text-indigo-600 text-xs">{os.numero}</td>
                    <td className="td font-medium">{os.cliente_nome}</td>
                    <td className="td capitalize text-slate-500">{os.tipo_peca}</td>
                    <td className="td"><OSStatusBadge status={os.status} /></td>
                    <td className="td text-slate-400 text-xs">{os.data_emissao}</td>
                  </tr>
                ))}
                {ordens.length === 0 && (
                  <tr><td colSpan={5} className="td text-center text-slate-400 py-10">Nenhuma OS cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estufas status */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-slate-900">Status das Estufas</h2>
          </div>
          <div className="space-y-3">
            {estufas.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${e.ativa ? 'bg-emerald-500 shadow-sm shadow-emerald-300' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{e.nome}</p>
                    <p className="text-xs text-slate-400">Cap. {e.capacidade_kg} kg</p>
                  </div>
                </div>
                <span className={e.ativa ? 'badge-green' : 'badge-gray'}>{e.ativa ? 'Ativa' : 'Inativa'}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo Geral</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Lançamentos hoje</span>
              <span className="font-semibold text-slate-700">
                {lancamentos.filter((l: any) => l.data_lancamento === new Date().toISOString().split('T')[0]).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Perdas registradas</span>
              <span className="font-semibold text-rose-600">{perdas.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, sub }: any) {
  const colors: any = {
    indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  border: 'border-indigo-100',  bar: 'bg-indigo-500' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100',   bar: 'bg-amber-500' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', bar: 'bg-emerald-500' },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  border: 'border-purple-100',  bar: 'bg-purple-500' },
  };
  const c = colors[color];
  return (
    <div className={`stat-card border ${c.border}`}>
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.icon} mb-4`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm font-semibold text-slate-600 mt-1">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl">
        <div className={`h-full w-full rounded-b-2xl ${c.bar} opacity-20`} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, detail, accent }: any) {
  const borders: any = { indigo: 'border-l-indigo-500', emerald: 'border-l-emerald-500', rose: 'border-l-rose-500' };
  return (
    <div className={`card border-l-4 ${borders[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
          <p className="text-xs text-slate-400 mt-1.5">{detail}</p>
        </div>
        <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
      </div>
    </div>
  );
}

function OSStatusBadge({ status }: { status: string }) {
  const map: any = {
    aberta:       'badge-blue',
    em_producao:  'badge-yellow',
    concluida:    'badge-green',
    cancelada:    'badge-red',
  };
  const labels: any = { aberta: 'Aberta', em_producao: 'Em Produção', concluida: 'Concluída', cancelada: 'Cancelada' };
  return <span className={map[status] || 'badge-gray'}>{labels[status] || status}</span>;
}
