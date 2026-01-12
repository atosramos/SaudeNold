"""
Serviço de extração de dados de exames médicos usando regex e padrões
"""
import re
import logging
from datetime import datetime
from dateutil import parser as date_parser
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def extract_exam_date(text: str) -> Optional[datetime]:
    """
    Tenta extrair a data do exame do texto
    """
    # Padrões de data comuns em exames médicos
    date_patterns = [
        r'\d{2}[/-]\d{2}[/-]\d{4}',  # DD/MM/YYYY ou DD-MM-YYYY
        r'\d{4}[/-]\d{2}[/-]\d{2}',  # YYYY/MM/DD ou YYYY-MM-DD
        r'\d{2}[/-]\d{2}[/-]\d{2,4}',  # DD/MM/YY ou DD/MM/YYYY
    ]
    
    # Palavras-chave que indicam data de exame
    date_keywords = ['data', 'data do exame', 'data de realização', 'realizado em', 'coleta']
    
    for keyword in date_keywords:
        # Buscar padrão próximo a palavras-chave
        pattern = re.compile(rf'{re.escape(keyword)}.*?(\d{{2}}[/-]\d{{2}}[/-]\d{{2,4}})', re.IGNORECASE)
        match = pattern.search(text)
        if match:
            date_str = match.group(1)
            try:
                return date_parser.parse(date_str, dayfirst=True)
            except:
                continue
    
    # Buscar qualquer data no texto
    for pattern_str in date_patterns:
        matches = re.findall(pattern_str, text)
        if matches:
            try:
                # Tentar usar a primeira data encontrada
                return date_parser.parse(matches[0], dayfirst=True)
            except:
                continue
    
    return None


def extract_exam_type(text: str) -> Optional[str]:
    """
    Tenta identificar o tipo de exame
    """
    exam_types = {
        'hemograma': ['hemograma', 'hemograma completo', 'cbc', 'complete blood count'],
        'glicemia': ['glicemia', 'glicose', 'glucose', 'glicemia de jejum'],
        'colesterol': ['colesterol', 'lipidograma', 'perfil lipídico'],
        'urina': ['urina', 'urina tipo i', 'eas', 'urina completa'],
        'fezes': ['fezes', 'coprocultura', 'parasitológico'],
        'tsh': ['tsh', 'hormônio tireoestimulante'],
        't4': ['t4', 'tiroxina'],
        'vitamina d': ['vitamina d', '25-oh vitamina d'],
        'creatinina': ['creatinina'],
        'ureia': ['ureia'],
    }
    
    text_lower = text.lower()
    
    for exam_type, keywords in exam_types.items():
        for keyword in keywords:
            if keyword in text_lower:
                return exam_type.capitalize()
    
    return None


def extract_numeric_value(text: str) -> Optional[float]:
    """
    Extrai valor numérico de uma string, lidando com vírgulas e pontos
    """
    # Remove espaços e caracteres não numéricos exceto vírgula e ponto
    cleaned = re.sub(r'[^\d,.]', '', text.replace(' ', ''))
    
    # Substitui vírgula por ponto se houver vírgula
    if ',' in cleaned:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    
    try:
        return float(cleaned)
    except:
        return None


def extract_parameter_with_value(line: str) -> Optional[Tuple[str, str, Optional[str], Optional[str], Optional[str]]]:
    """
    Extrai parâmetro e valor de uma linha do texto
    
    Returns:
        Tupla: (nome_parametro, valor, unidade, valor_min_referencia, valor_max_referencia)
    """
    # Padrão comum: "Nome do Parâmetro: Valor Unidade (Referência)"
    # Exemplo: "Hemoglobina: 14.5 g/dL (12.0-16.0)"
    
    # Remove espaços extras
    line = re.sub(r'\s+', ' ', line.strip())
    
    # Padrão 1: Nome: Valor Unidade (min-max)
    pattern1 = re.compile(
        r'([A-Za-zÀ-ÿ\s]+?)\s*[:]\s*([\d,\.]+)\s*([a-zA-Z/%]+)?\s*(?:\(([\d,\.]+)\s*[-]\s*([\d,\.]+)\))?',
        re.IGNORECASE
    )
    match = pattern1.search(line)
    if match:
        param_name = match.group(1).strip()
        value = match.group(2).strip()
        unit = match.group(3).strip() if match.group(3) else None
        ref_min = match.group(4).strip() if match.group(4) else None
        ref_max = match.group(5).strip() if match.group(5) else None
        return (param_name, value, unit, ref_min, ref_max)
    
    # Padrão 2: Nome Valor Unidade
    pattern2 = re.compile(
        r'([A-Za-zÀ-ÿ\s]+?)\s+([\d,\.]+)\s+([a-zA-Z/%]+)',
        re.IGNORECASE
    )
    match = pattern2.search(line)
    if match:
        param_name = match.group(1).strip()
        value = match.group(2).strip()
        unit = match.group(3).strip()
        return (param_name, value, unit, None, None)
    
    # Padrão 3: Nome: Valor (mais simples)
    pattern3 = re.compile(
        r'([A-Za-zÀ-ÿ\s]+?)\s*[:]\s*([\d,\.]+)',
        re.IGNORECASE
    )
    match = pattern3.search(line)
    if match:
        param_name = match.group(1).strip()
        value = match.group(2).strip()
        return (param_name, value, None, None, None)
    
    return None


def extract_data_from_ocr_text(text: str) -> Dict:
    """
    Extrai dados estruturados do texto OCR
    
    Returns:
        Dict com:
        - exam_date: datetime ou None
        - exam_type: str ou None
        - parameters: lista de dicts com {name, value, unit, ref_min, ref_max}
    """
    result = {
        'exam_date': None,
        'exam_type': None,
        'parameters': []
    }
    
    # Extrair data
    exam_date = extract_exam_date(text)
    if exam_date:
        result['exam_date'] = exam_date.isoformat()
    
    # Extrair tipo de exame
    exam_type = extract_exam_type(text)
    if exam_type:
        result['exam_type'] = exam_type
    
    # Dividir texto em linhas
    lines = text.split('\n')
    
    # Processar cada linha
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        # Tentar extrair parâmetro e valor
        extracted = extract_parameter_with_value(line)
        if extracted:
            param_name, value, unit, ref_min, ref_max = extracted
            
            # Filtrar falsos positivos (linhas muito curtas ou valores inválidos)
            if len(param_name) < 2 or len(param_name) > 100:
                continue
            
            # Tentar converter valor para número
            numeric_value = extract_numeric_value(value)
            
            parameter = {
                'name': param_name,
                'value': value,
                'numeric_value': str(numeric_value) if numeric_value is not None else None,
                'unit': unit,
                'reference_range_min': ref_min,
                'reference_range_max': ref_max
            }
            
            result['parameters'].append(parameter)
    
    logger.info(f"Extraídos {len(result['parameters'])} parâmetros do texto OCR")
    return result







