import os
import pathlib

# Configurações
OUTPUT_FILE = "resumo_projeto.md"
MAX_FILE_SIZE = 1024 * 1024  # Ignora arquivos maiores que 1MB (para evitar logs gigantes)

# Pastas e arquivos a ignorar (Segurança e Limpeza)
IGNORE_DIRS = {
    '.git', 'node_modules', '__pycache__', 'venv', 'env', '.venv', 
    'build', 'dist', '.idea', '.vscode', 'coverage', '.next', 'out'
}
IGNORE_FILES = {
    '.env', '.env.local', '.env.production', 'package-lock.json', 
    'yarn.lock', 'poetry.lock', 'Gemfile.lock', 'Thumbs.db'
}
IGNORE_EXTENSIONS = {
    '.pyc', '.pyo', '.so', '.dll', '.exe', '.bin', '.dat', 
    '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.pdf', '.zip', '.tar', '.gz'
}
# Palavras-chave sensíveis para evitar vazar segredos acidentalmente
SENSITIVE_KEYWORDS = {'password', 'senha', 'secret', 'chave', 'token', 'api_key'}

def should_ignore_file(file_path, name):
    # Ignora extensões binárias
    if pathlib.Path(name).suffix.lower() in IGNORE_EXTENSIONS:
        return True
    # Ignora nomes específicos
    if name in IGNORE_FILES:
        return True
    # Verifica se o caminho contém palavras sensíveis (básico)
    lower_path = file_path.lower()
    for keyword in SENSITIVE_KEYWORDS:
        if keyword in lower_path and name.endswith('.env'):
            return True
    return False

def should_ignore_dir(name):
    return name in IGNORE_DIRS

def gerar_resumo():
    print(f"🔍 Analisando projeto... (Arquivo de saída: {OUTPUT_FILE})")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("# Resumo do Projeto\n\n")
        out.write("## 📂 Estrutura de Arquivos\n\n")
        out.write("```\n")
        
        # 1. Escrever a árvore de diretórios
        for root, dirs, files in os.walk("."):
            # Filtrar pastas ignoradas
            dirs[:] = [d for d in dirs if not should_ignore_dir(d)]
            
            # Calcular nível de indentação
            level = root.replace(".", "").count(os.sep)
            indent = " " * 2 * level
            out.write(f"{indent}{os.path.basename(root)}/\n")
            
            sub_indent = " " * 2 * (level + 1)
            for file in files:
                if not should_ignore_file(root, file):
                    out.write(f"{sub_indent}{file}\n")
        
        out.write("```\n\n")
        out.write("## 📄 Conteúdo dos Arquivos\n\n")

        # 2. Escrever o conteúdo dos arquivos
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if not should_ignore_dir(d)]
            
            for file in files:
                if should_ignore_file(root, file):
                    continue
                
                file_path = os.path.join(root, file)
                
                # Verificar tamanho
                try:
                    if os.path.getsize(file_path) > MAX_FILE_SIZE:
                        continue
                except OSError:
                    continue

                # Ler conteúdo
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    out.write(f"### 📄 `{file_path}`\n\n")
                    out.write("```plaintext\n")
                    out.write(content)
                    out.write("\n```\n\n")
                except Exception as e:
                    out.write(f"### ⚠️ Erro ao ler `{file_path}`: {e}\n\n")

    print(f"✅ Concluso! Verifique o arquivo '{OUTPUT_FILE}' antes de compartilhar.")
    print("⚠️  IMPORTANTE: Revise o arquivo gerado para garantir que não há senhas ou dados sensíveis!")

if __name__ == "__main__":
    gerar_resumo()