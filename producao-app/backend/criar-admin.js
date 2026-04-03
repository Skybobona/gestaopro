import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'producao.db'));

db.exec('CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT UNIQUE, senha TEXT, perfil TEXT, permissoes TEXT, ativo INTEGER DEFAULT 1, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP)');

try {
    db.prepare('INSERT INTO usuarios (nome, email, senha, perfil, permissoes, ativo) VALUES (?, ?, ?, ?, ?, ?)').run('Administrador', 'admin@admin.com', bcrypt.hashSync('123456', 10), 'admin', '{}', 1);
    console.log('✅ Admin criado com sucesso!');
} catch (e) {
    console.log('⚠️ Erro:', e.message);
}
db.close();