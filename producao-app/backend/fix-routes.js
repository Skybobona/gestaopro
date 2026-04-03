import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, 'src', 'routes');

const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Troca o import do banco local para o adaptador da nuvem
    content = content.replace(
        /import db from ['"]\.\.\/database['"];?/g,
        "import { dbQuery, dbRun, dbGet } from '../db-adapter';"
    );

    // 2. Adiciona "async" nas funções da rota
    content = content.replace(
        /\((?!async )(req[^)]*)\)\s*=>\s*\{/g,
        'async ($1) => {'
    );

    // 3. Troca db.prepare('...').all() para await dbQuery('...')
    const replacePrepare = (match, quote, sql, method, args) => {
        const cleanArgs = args.trim() === '' ? '' : `, [${args.trim()}]`;
        const fnMap = { all: 'dbQuery', run: 'dbRun', get: 'dbGet' };
        return `await ${fnMap[method]}(${quote}${sql}${quote}${cleanArgs})`;
    };

    content = content.replace(
        /db\.prepare\((['"`])([\s\S]*?)\1\)\.(all|run|get)\(([\s\S]*?)\)/g,
        replacePrepare
    );

    // 4. Troca resultado de insert local para resultado da nuvem
    content = content.replace(/result\.lastInsertRowid/g, 'result.lastID');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Corrigido: ${file}`);
}
console.log('\n🎉 Todas as rotas foram adaptadas para o Supabase!');