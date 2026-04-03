import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'producao.db'));

try {
    // 1. Clientes
    db.exec(`INSERT OR IGNORE INTO clientes (nome, codigo, cnpj, telefone, email) VALUES 
    ('Indústria Alpha', 'CLI001', '12345678000199', '11999990001', 'contato@alpha.com'),
    ('Metalúrgica Beta', 'CLI002', '98765432000188', '11999990002', 'vendas@beta.com'),
    ('Comércio Gama', 'CLI003', '11222333000144', '11988880003', 'financeiro@gama.com')`);

    // 2. Chapas
    db.exec(`INSERT OR IGNORE INTO chapas (codigo, liga, espessura, largura, comprimento, peso_kg, quantidade) VALUES 
    ('CHP-001', 'Alumínio 6061', 10.5, 1200, 2500, 85.0, 50),
    ('CHP-002', 'Alumínio 5052', 5.0, 1000, 2000, 27.0, 120),
    ('CHP-003', 'Alumínio 7075', 15.0, 800, 1500, 30.5, 25)`);

    // 3. Ordens de Serviço
    db.exec(`INSERT OR IGNORE INTO ordens_servico (numero, cliente_id, chapa_id, descricao, qtd_chapas, status, data_emissao) VALUES 
    ('OS-2024-001', 1, 1, 'Corte e Desbaste para peças de motor', 10, 'em_producao', date('now')),
    ('OS-2024-002', 2, 2, 'Laminação de chapas finas', 20, 'aberta', date('now', '-5 days')),
    ('OS-2024-003', 1, 1, 'Expedição de lote urgente', 5, 'concluida', date('now', '-10 days')),
    ('OS-2024-004', 3, 3, 'Corte especial sob medida', 2, 'aberta', date('now', '-1 day'))`);

    // 4. Máquinas (para a tela de Manutenção)
    db.exec(`INSERT OR IGNORE INTO manutencao_maquinas (nome, codigo, tipo, setor, custo_hora) VALUES 
    ('Forno de Fusão Principal', 'FOR-01', 'forno', 'Fundição', 150.00),
    ('Laminadora 01', 'LAM-01', 'maquina', 'Laminação', 200.00),
    ('Serra de Corte CNC', 'COR-01', 'maquina', 'Corte', 80.00)`);

    console.log('✅ Dados de exemplo inseridos com sucesso!');
} catch (e) {
    console.log('⚠️ Erro:', e.message);
}
db.close();