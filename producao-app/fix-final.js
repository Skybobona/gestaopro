import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(routesDir, file);
    let lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    let output = [];
    let i = 0;

    while (i < lines.length) {
        let line = lines[i];

        if (line.includes("from '../database'")) {
            if (line.includes('registrarAuditoria')) {
                output.push("import { dbQuery, dbRun, dbGet } from '../db-adapter';");
                output.push("import { registrarAuditoria } from '../database';");
            } else {
                output.push("import { dbQuery, dbRun, dbGet } from '../db-adapter';");
            }
            i++; continue;
        }

        if (line.match(/\(req[^)]*\)\s*=>\s*\{/)) {
            output.push(line.replace('(req', 'async (req'));
            i++; continue;
        }

        if (line.includes('db.prepare(')) {
            let statement = line;
            let j = i + 1;
            while (!statement.trim().endsWith(';') && j < lines.length) {
                statement += '\n' + lines[j];
                j++;
            }

            let cleaned = statement.replace(/db\.prepare\((['"\])([\s\S]*?)\1\)\s*,\s*\[[^\]]*\]\s*\.?/g, 'db.prepare(\\\).');

            const match = cleaned.match(/db\.prepare\((['"\])([\s\S]*?)\1\)\.(all|run|get)\(([\s\S]*)\)\s*;/);
            if (match) {
                const quote = match[1];
                let sql = match[2].trim();
                const method = match[3];
                let argsStr = match[4].trim();

                const fnMap = { all: 'dbQuery', run: 'dbRun', get: 'dbGet' };
                const fn = fnMap[method];

                let finalArgs = argsStr.replace(/\n/g, ' ').split(',').map(a => a.trim()).filter(a => a).join(', ');

                let finalCall = 'await ' + fn + '(' + quote + sql + quote;
                if (finalArgs) finalCall += ', [' + finalArgs + ']';
                finalCall += ');';

                finalCall = finalCall.replace('result.lastInsertRowid', 'result.lastID');

                const indent = statement.match(/^\s*/)[0];
                output.push(indent + finalCall);
            } else {
                output.push('// AUTO-FIX ERROR');
            }
            i = j; continue;
        }

        if (line.includes('lastInsertRowid')) {
            output.push(line.replace('lastInsertRowid', 'lastID'));
            i++; continue;
        }

        output.push(line);
        i++;
    }

    fs.writeFileSync(filePath, output.join('\n'), 'utf-8');
    console.log('✅ Corrigido: ' + file);
}
console.log('\n🎉 Todas as rotas foram corrigidas!');
