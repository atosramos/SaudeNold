#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Busca e Indexação de Contexto

Permite buscar informações nos arquivos de contexto de forma eficiente.
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import argparse

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

CONTEXT_DIR = Path(__file__).parent.parent / ".cursor" / "context"


def index_context_files() -> Dict[str, Dict]:
    """Indexa todos os arquivos de contexto."""
    index = {}
    
    if not CONTEXT_DIR.exists():
        return index
    
    for filepath in CONTEXT_DIR.glob("*.md"):
        content = filepath.read_text(encoding='utf-8')
        
        # Extrair seções principais
        sections = re.findall(r'^##+\s+(.+)$', content, re.MULTILINE)
        
        # Extrair código blocks
        code_blocks = re.findall(r'```(\w+)?\n(.*?)```', content, re.DOTALL)
        
        # Extrair links
        links = re.findall(r'\[([^\]]+)\]\(([^\)]+)\)', content)
        
        index[filepath.name] = {
            "path": str(filepath),
            "sections": sections,
            "code_blocks": len(code_blocks),
            "links": links,
            "size": len(content),
            "content": content  # Para busca full-text
        }
    
    return index


def search_in_context(query: str, index: Dict[str, Dict]) -> List[Tuple[str, str, int]]:
    """Busca query nos arquivos de contexto."""
    results = []
    query_lower = query.lower()
    
    for filename, data in index.items():
        content_lower = data["content"].lower()
        
        # Buscar ocorrências
        matches = []
        for match in re.finditer(re.escape(query_lower), content_lower):
            # Pegar contexto ao redor (50 chars antes e depois)
            start = max(0, match.start() - 50)
            end = min(len(data["content"]), match.end() + 50)
            context = data["content"][start:end].strip()
            matches.append((match.start(), context))
        
        if matches:
            results.append((filename, data["path"], len(matches)))
    
    # Ordenar por número de matches
    results.sort(key=lambda x: x[2], reverse=True)
    return results


def list_all_contexts(index: Dict[str, Dict]):
    """Lista todos os arquivos de contexto com informações."""
    print("[*] Arquivos de Contexto Disponíveis:\n")
    
    for filename, data in sorted(index.items()):
        print(f"[*] {filename}")
        print(f"   Seções: {len(data['sections'])}")
        print(f"   Código: {data['code_blocks']} blocos")
        print(f"   Links: {len(data['links'])}")
        print(f"   Tamanho: {data['size']:,} caracteres")
        if data['sections']:
            print(f"   Principais seções: {', '.join(data['sections'][:3])}")
        print()


def show_context_file(filename: str, index: Dict[str, Dict]):
    """Mostra conteúdo de um arquivo de contexto."""
    if filename not in index:
        print(f"[X] Arquivo {filename} não encontrado")
        return
    
    data = index[filename]
    print(f"[*] {filename}\n")
    print("=" * 80)
    print(data["content"])
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="Busca e indexação de contexto")
    parser.add_argument("command", choices=["list", "search", "show"], help="Comando a executar")
    parser.add_argument("query", nargs="?", help="Query de busca ou nome de arquivo")
    parser.add_argument("--file", help="Nome do arquivo para mostrar")
    
    args = parser.parse_args()
    
    print("[*] Indexando arquivos de contexto...\n")
    index = index_context_files()
    
    if args.command == "list":
        list_all_contexts(index)
    
    elif args.command == "search":
        if not args.query:
            print("[X] Forneça uma query de busca")
            return
        
        print(f"[*] Buscando: '{args.query}'\n")
        results = search_in_context(args.query, index)
        
        if not results:
            print("Nenhum resultado encontrado")
        else:
            print(f"Encontrado em {len(results)} arquivo(s):\n")
            for filename, path, count in results:
                print(f"[*] {filename} ({count} ocorrências)")
                print(f"   {path}\n")
    
    elif args.command == "show":
        filename = args.file or args.query
        if not filename:
            print("[X] Forneça o nome do arquivo")
            return
        
        # Tentar encontrar arquivo mesmo sem extensão
        if not filename.endswith('.md'):
            filename += '.md'
        
        show_context_file(filename, index)


if __name__ == "__main__":
    main()
