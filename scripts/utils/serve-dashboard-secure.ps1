# Script seguro para servir apenas o dashboard HTML
# Nao lista diretorios e bloqueia acesso a arquivos sensiveis

$ErrorActionPreference = "Stop"

$port = 8080
$dashboardFile = "analytics-dashboard.html"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servidor Seguro - Dashboard Analytics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servindo apenas: $dashboardFile" -ForegroundColor Green
Write-Host "Porta: $port" -ForegroundColor Green
Write-Host ""
Write-Host "URL: http://localhost:$port/$dashboardFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

# Criar script Python seguro inline
$pythonScript = @"
import http.server
import socketserver
import os
from urllib.parse import unquote

class SecureHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    # Arquivos e diretorios bloqueados
    BLOCKED_PATHS = [
        '.env',
        '.git',
        '.github',
        'node_modules',
        'venv',
        '__pycache__',
        '.expo',
        'dist',
        'backend',
        'android',
        'k8s',
        '.issues',
        'scripts',
        'docs',
        'services',
        'components',
        'hooks',
        'app',
        'assets',
    ]
    
    # Extensoes bloqueadas
    BLOCKED_EXTENSIONS = [
        '.env',
        '.key',
        '.pem',
        '.p12',
        '.pfx',
        '.log',
        '.sql',
        '.db',
        '.sqlite',
        '.ps1',
        '.sh',
        '.md',
        '.txt',
    ]
    
    def do_GET(self):
        # Decodificar URL
        path = unquote(self.path)
        
        # Remover query string
        if '?' in path:
            path = path.split('?')[0]
        
        # Permitir apenas o dashboard HTML
        if path == '/' or path == '/$dashboardFile':
            path = '/$dashboardFile'
        elif path != '/$dashboardFile':
            self.send_error(403, "Acesso negado")
            return
        
        # Verificar se o arquivo existe
        file_path = os.path.join(os.getcwd(), '$dashboardFile')
        if not os.path.exists(file_path):
            self.send_error(404, "Arquivo nao encontrado")
            return
        
        # Verificar se nao esta em diretorio bloqueado
        abs_path = os.path.abspath(file_path)
        for blocked in self.BLOCKED_PATHS:
            if blocked in abs_path:
                self.send_error(403, "Acesso negado")
                return
        
        # Verificar extensao
        _, ext = os.path.splitext(file_path)
        if ext.lower() in self.BLOCKED_EXTENSIONS:
            self.send_error(403, "Acesso negado")
            return
        
        # Servir o arquivo
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Content-length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Erro ao ler arquivo: {str(e)}")
    
    def list_directory(self, path):
        # Bloquear listagem de diretorios
        self.send_error(403, "Listagem de diretorios desabilitada por seguranca")
    
    def log_message(self, format, *args):
        # Log simplificado
        print(f"[{self.address_string()}] {args[0]}")

if __name__ == '__main__':
    os.chdir(r'$projectRoot')
    
    with socketserver.TCPServer(("", $port), SecureHTTPRequestHandler) as httpd:
        print(f"Servidor seguro rodando em http://localhost:$port")
        print(f"Servindo apenas: $dashboardFile")
        print("Listagem de diretorios DESABILITADA")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor parado pelo usuario")
"@

# Salvar script Python temporario
$tempScript = Join-Path $env:TEMP "secure_dashboard_server.py"
$pythonScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # Executar servidor seguro
    python $tempScript
} finally {
    # Limpar script temporario
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
    }
}
