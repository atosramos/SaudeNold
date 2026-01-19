#!/usr/bin/env python3
"""
Servidor HTTP seguro para servir apenas o dashboard HTML
Nao lista diretorios e bloqueia acesso a arquivos sensiveis
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import unquote

# Configuracao
PORT = 8080
DASHBOARD_FILE = "analytics-dashboard.html"

# Obter diretorio do projeto
if len(sys.argv) > 1:
    PROJECT_ROOT = sys.argv[1]
else:
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class SecureHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler HTTP que bloqueia listagem de diretorios e acesso a arquivos sensiveis"""
    
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
        """Processa requisicoes GET - permite apenas o dashboard HTML"""
        # Decodificar URL
        path = unquote(self.path)
        
        # Remover query string
        if '?' in path:
            path = path.split('?')[0]
        
        # Permitir apenas o dashboard HTML
        if path == '/' or path == f'/{DASHBOARD_FILE}':
            path = f'/{DASHBOARD_FILE}'
        elif path != f'/{DASHBOARD_FILE}':
            self.send_error(403, "Acesso negado - apenas o dashboard e permitido")
            return
        
        # Verificar se o arquivo existe
        file_path = os.path.join(PROJECT_ROOT, DASHBOARD_FILE)
        if not os.path.exists(file_path):
            self.send_error(404, "Dashboard nao encontrado")
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
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.send_header('Content-length', str(len(content)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('X-Frame-Options', 'DENY')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Erro ao ler arquivo: {str(e)}")
    
    def list_directory(self, path):
        """Bloqueia listagem de diretorios"""
        self.send_error(403, "Listagem de diretorios desabilitada por seguranca")
    
    def log_message(self, format, *args):
        """Log simplificado"""
        print(f"[{self.address_string()}] {args[0] if args else ''}")

if __name__ == '__main__':
    # Mudar para diretorio do projeto
    os.chdir(PROJECT_ROOT)
    
    print("=" * 60)
    print("  Servidor Seguro - Dashboard Analytics")
    print("=" * 60)
    print(f"Porta: {PORT}")
    print(f"Arquivo: {DASHBOARD_FILE}")
    print(f"Diretorio: {PROJECT_ROOT}")
    print("")
    print("SEGURANCA:")
    print("  - Listagem de diretorios DESABILITADA")
    print("  - Apenas o dashboard HTML e servido")
    print("  - Arquivos sensiveis BLOQUEADOS")
    print("")
    print(f"URL: http://localhost:{PORT}/{DASHBOARD_FILE}")
    print("")
    print("Pressione Ctrl+C para parar")
    print("=" * 60)
    print("")
    
    try:
        with socketserver.TCPServer(("", PORT), SecureHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado pelo usuario")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\nERRO: Porta {PORT} ja esta em uso!")
            print("Pare o servidor anterior ou use outra porta.")
        else:
            print(f"\nERRO: {e}")
