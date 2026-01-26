# Instalação do Tesseract OCR

O backend precisa do Tesseract OCR instalado para processar exames médicos com OCR automático.

## Windows

### Opção 1: Usando winget (recomendado)
```powershell
winget install UB-Mannheim.TesseractOCR
```

### Opção 2: Download manual
1. Baixe o instalador de: https://github.com/UB-Mannheim/tesseract/wiki
2. Execute o instalador
3. **IMPORTANTE**: Durante a instalação, marque a opção "Add to PATH" ou adicione manualmente o diretório de instalação ao PATH do sistema
4. Reinicie o terminal/PowerShell após a instalação

### Verificar instalação
```powershell
tesseract --version
```

## Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-por
```

### Verificar instalação
```bash
tesseract --version
```

## macOS

```bash
brew install tesseract tesseract-lang
```

### Verificar instalação
```bash
tesseract --version
```

## Configurar PATH (se necessário)

Se o Tesseract não for encontrado automaticamente, você pode configurar o caminho manualmente no código Python:

```python
# Em ocr_service.py, adicione antes de usar pytesseract:
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows
# ou
pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'  # Linux/macOS
```

## Nota

Após instalar o Tesseract, **reinicie o servidor backend** para que as mudanças tenham efeito.
