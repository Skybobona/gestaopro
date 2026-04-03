import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    let content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
    let original = content;

    // 1. Troca o import
    content = content.replace(
        /import db from ['"]\.\.\/database['"];?/g,
        "import { dbQuery, dbRun, dbGet } from '../db-adapter';\nimport { registrarAuditoria } from '../database';"
    );
    if (!content.includes('registrarAuditoria(')) {
        content = content.replace("\nimport { registrarAuditoria } from '../database';", "");
    }

    // 2. Adiciona async nas funções
    content = content.replace(/\((?:req|_req|req: AuthRequest)[^)]*\)\s*=>\s*\{/g, (m) => m.startsWith('async ') ? m : 'async ' + m);

    // 3. Converte db.prepare().all/run/get de forma segura
    const methods = ['all', 'run', 'get'];
    const fnMap = { all: 'dbQuery', run: 'dbRun', get: 'dbGet' };
    for (const method of methods) {
        const regex = new RegExp(`db\\.prepare\\((['"\`])([\\s\\S]*?)\\1\\)\\s*\\.${method}\\(([\\s\\S]*?)\\)\\s*;?`, 'g');
        content = content.replace(regex, (match, q, sql, args) => {
            sql = sql.replace(/\n/g, ' ').trim();
            args = args.replace(/\n/g, ' ').trim();
            return `await ${fnMap[method]}(${q}${sql}${q}, ${args ? '[' + args + ']' : ''});`;
        });
    }

    // 4. Corrige lastInsertRowid
    content = content.replace(/result\.lastInsertRowid/g, 'result.lastID');

    if (content !== original) {
        fs.writeFileSync(path.join(routesDir, file), content, 'utf-8');
        console.log('✅ Corrigido: ' + file);
    } else {
        console.log('⏭️ Pulado: ' + file);
    }
}
console.log('\n🎉 Todas as rotas foram adaptadas para o Supabase!');