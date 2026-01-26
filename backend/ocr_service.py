"""
Serviço de OCR usando Tesseract
"""
import pytesseract
from PIL import Image
import io
import base64
import logging
import shutil
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Verificar se Tesseract está disponível
TESSERACT_AVAILABLE = False
TESSERACT_PATH = None

def _find_tesseract():
    """Tenta encontrar o executável do Tesseract em várias localizações"""
    # 1. Verificar variável de ambiente
    env_path = os.getenv('TESSERACT_CMD')
    if env_path and Path(env_path).exists():
        return env_path
    
    # 2. Verificar no PATH do sistema
    tesseract_path = shutil.which('tesseract')
    if tesseract_path:
        return tesseract_path
    
    # 3. Tentar localizações comuns no Windows
    common_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        r'C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe'.format(os.getenv('USERNAME', '')),
    ]
    
    for path in common_paths:
        if Path(path).exists():
            return path
    
    return None

try:
    # Tentar encontrar o executável do Tesseract
    tesseract_path = _find_tesseract()
    if tesseract_path:
        # Configurar o caminho do Tesseract se não estiver no PATH
        if not shutil.which('tesseract'):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            logger.info(f"Tesseract configurado manualmente: {tesseract_path}")
        
        # Tentar executar para verificar se funciona
        pytesseract.get_tesseract_version()
        TESSERACT_AVAILABLE = True
        TESSERACT_PATH = tesseract_path
        logger.info(f"Tesseract encontrado e funcionando: {tesseract_path}")
    else:
        logger.warning("Tesseract não encontrado. Instale o Tesseract OCR ou configure TESSERACT_CMD no .env")
        logger.warning("Para instalar no Windows: winget install UB-Mannheim.TesseractOCR")
        logger.warning("Ou baixe de: https://github.com/UB-Mannheim/tesseract/wiki")
except Exception as e:
    logger.warning(f"Tesseract não disponível: {str(e)}")
    TESSERACT_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("PyMuPDF não instalado. Suporte a PDFs desabilitado.")


def pdf_to_images(pdf_base64: str) -> list:
    """
    Converte PDF em base64 para lista de imagens PIL (todas as páginas)
    
    Args:
        pdf_base64: String base64 do PDF
    
    Returns:
        Lista de imagens PIL, uma para cada página do PDF
    """
    if not PDF_SUPPORT:
        raise Exception("Suporte a PDF não disponível. Instale PyMuPDF.")
    
    try:
        # Decodificar base64 para bytes
        pdf_data = base64.b64decode(pdf_base64)
        
        # Abrir PDF com PyMuPDF
        pdf_document = fitz.open(stream=pdf_data, filetype="pdf")
        
        images = []
        total_pages = len(pdf_document)
        
        # Processar cada página
        for page_num in range(total_pages):
            page = pdf_document[page_num]
            
            # Converter página para imagem (matriz de pixels)
            # zoom=2.0 aumenta a resolução para melhor qualidade do OCR
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            
            # Converter para PIL Image
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data))
            images.append(image)
        
        pdf_document.close()
        
        logger.info(f"PDF convertido para {total_pages} imagem(ns). Total de páginas: {total_pages}")
        return images
    
    except Exception as e:
        logger.error(f"Erro ao converter PDF para imagens: {str(e)}")
        raise Exception(f"Erro ao processar PDF: {str(e)}")


def perform_ocr(image_base64: str, file_type: str = 'image', language: str = 'por') -> str:
    """
    Realiza OCR em uma imagem ou PDF codificados em base64
    
    Args:
        image_base64: String base64 da imagem ou PDF
        file_type: Tipo de arquivo ('image' ou 'pdf')
        language: Idioma para OCR (padrão: 'por' para português)
    
    Returns:
        Texto extraído do OCR (todas as páginas se for PDF)
    
    Raises:
        Exception: Se Tesseract não estiver disponível ou ocorrer erro no processamento
    """
    # Verificar se Tesseract está disponível
    if not TESSERACT_AVAILABLE:
        # OCR não disponível - retornar erro mais amigável
        # Não usar Tesseract se não estiver instalado - usar OCR online ou Gemini
        logger.warning("Tesseract OCR não está disponível. O sistema deve usar OCR online ou Gemini AI.")
        raise Exception("OCR Tesseract não está instalado. Use OCR online ou Gemini AI para processar exames. Para instalar Tesseract, veja: https://github.com/UB-Mannheim/tesseract/wiki")
    
    try:
        all_text = []
        
        # Se for PDF, converter todas as páginas para imagens
        if file_type == 'pdf':
            images = pdf_to_images(image_base64)
            total_pages = len(images)
            
            # Processar cada página
            for page_num, image in enumerate(images, 1):
                logger.info(f"Processando página {page_num}/{total_pages} do PDF...")
                
                # Converter para RGB se necessário (Tesseract requer RGB)
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Melhorar qualidade da imagem para OCR
                # Redimensionar se muito pequena (melhora OCR)
                width, height = image.size
                if width < 800 or height < 600:
                    # Redimensionar mantendo proporção
                    scale = max(800 / width, 600 / height)
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    image = image.resize((new_width, new_height), Image.LANCZOS)
                
                # Converter para escala de cinza (melhora OCR)
                image_gray = image.convert('L')
                
                # Realizar OCR na página
                # Configuração para melhorar resultados: --psm 6 (assume um único bloco de texto uniforme)
                custom_config = r'--oem 3 --psm 6 -l ' + language
                page_text = pytesseract.image_to_string(image_gray, config=custom_config)
                
                # Adicionar texto da página com numeração
                if page_text.strip():
                    # Adicionar cabeçalho da página (exceto na primeira)
                    if page_num > 1:
                        all_text.append(f"\n\n--- Página {page_num} ---\n\n")
                    all_text.append(page_text.strip())
        else:
            # Decodificar base64 para bytes
            image_data = base64.b64decode(image_base64)
            
            # Converter bytes para imagem PIL
            image = Image.open(io.BytesIO(image_data))
            
            # Converter para RGB se necessário (Tesseract requer RGB)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Melhorar qualidade da imagem para OCR
            # Redimensionar se muito pequena (melhora OCR)
            width, height = image.size
            if width < 800 or height < 600:
                # Redimensionar mantendo proporção
                scale = max(800 / width, 600 / height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                image = image.resize((new_width, new_height), Image.LANCZOS)
            
            # Converter para escala de cinza (melhora OCR)
            image_gray = image.convert('L')
            
            # Realizar OCR
            # Configuração para melhorar resultados: --psm 6 (assume um único bloco de texto uniforme)
            custom_config = r'--oem 3 --psm 6 -l ' + language
            text = pytesseract.image_to_string(image_gray, config=custom_config)
            all_text.append(text.strip())
        
        # Concatenar todo o texto
        final_text = '\n'.join(all_text)
        
        logger.info(f"OCR realizado com sucesso. Texto extraído: {len(final_text)} caracteres")
        return final_text.strip()
    
    except Exception as e:
        logger.error(f"Erro ao realizar OCR: {str(e)}")
        raise Exception(f"Erro ao processar arquivo com OCR: {str(e)}")

