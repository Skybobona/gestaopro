import { dbRun } from './db-adapter';

export function registrarAuditoria(params: any) {
  try {
    dbRun(
      'INSERT INTO audit_log (usuario_id, usuario_nome, acao, modulo, registro_id, descricao, dados_antes, dados_depois, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        params.usuario_id ?? null, params.usuario_nome, params.acao, params.modulo, 
        params.registro_id ? String(params.registro_id) : null, params.descricao ?? null,
        params.dados_antes ? JSON.stringify(params.dados_antes) : null,
        params.dados_depois ? JSON.stringify(params.dados_depois) : null, params.ip ?? null
      ]
    );
  } catch (e) {
    console.error('Erro ao registrar auditoria:', e);
  }
}
