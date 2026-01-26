"""
Testes TDD para utilitários de validação e sanitização.
"""
import pytest
from utils.validation import (
    sanitize_input,
    sanitize_html,
    validate_payload_size,
    validate_email,
    validate_url,
    sanitize_sql_input,
    validate_text_field,
    sanitize_dict,
    MAX_PAYLOAD_SIZE_KB,
    MAX_TEXT_FIELD_LENGTH,
    MAX_EMAIL_LENGTH,
    MAX_URL_LENGTH
)


class TestSanitizeInput:
    """Testes para sanitização de entrada."""
    
    def test_sanitize_input_removes_control_chars(self):
        """Testa remoção de caracteres de controle."""
        text = "Hello\x00World\x01Test"
        result = sanitize_input(text)
        
        assert "\x00" not in result
        assert "\x01" not in result
        assert "Hello" in result
        assert "World" in result
    
    def test_sanitize_input_preserves_newlines(self):
        """Testa que newlines são preservados."""
        text = "Line 1\nLine 2\nLine 3\tTabbed"
        result = sanitize_input(text)
        
        assert "\n" in result
        assert "\t" in result
        # \r pode ser normalizado, mas \n deve estar presente
        assert "Line 1" in result
        assert "Line 2" in result
    
    def test_sanitize_input_limits_length(self):
        """Testa limitação de tamanho."""
        text = "A" * 1000
        result = sanitize_input(text, max_length=100)
        
        assert len(result) == 100
    
    def test_sanitize_input_removes_excess_whitespace(self):
        """Testa remoção de espaços em branco excessivos."""
        text = "Hello    World   Test"
        result = sanitize_input(text)
        
        assert "  " not in result  # Não deve ter espaços duplos
        assert result == "Hello World Test"
    
    def test_sanitize_input_strips_whitespace(self):
        """Testa remoção de espaços nas extremidades."""
        text = "   Hello World   "
        result = sanitize_input(text)
        
        assert result == "Hello World"
    
    def test_sanitize_input_converts_to_string(self):
        """Testa conversão de tipos não-string."""
        result = sanitize_input(12345)
        
        assert isinstance(result, str)
        assert result == "12345"


class TestSanitizeHTML:
    """Testes para sanitização HTML."""
    
    def test_sanitize_html_removes_script_tags(self):
        """Testa remoção de tags script."""
        html = "<script>alert('XSS')</script><p>Safe content</p>"
        result = sanitize_html(html)
        
        assert "<script>" not in result
        assert "</script>" not in result
        # O conteúdo dentro de script pode ser removido ou escapado, mas a tag deve sumir
        assert "Safe content" in result
    
    def test_sanitize_html_removes_iframe_tags(self):
        """Testa remoção de tags iframe."""
        html = "<iframe src='evil.com'></iframe><p>Safe</p>"
        result = sanitize_html(html)
        
        assert "<iframe>" not in result
        assert "Safe" in result
    
    def test_sanitize_html_preserves_safe_tags(self):
        """Testa preservação de tags seguras."""
        html = "<p>Paragraph</p><strong>Bold</strong><em>Italic</em>"
        result = sanitize_html(html)
        
        assert "<p>" in result or "Paragraph" in result
        assert "Bold" in result
        assert "Italic" in result
    
    def test_sanitize_html_removes_dangerous_attributes(self):
        """Testa remoção de atributos perigosos."""
        html = "<a href='#' onclick='evil()'>Link</a>"
        result = sanitize_html(html)
        
        assert "onclick" not in result
    
    def test_sanitize_html_empty_string(self):
        """Testa com string vazia."""
        result = sanitize_html("")
        
        assert result == ""
    
    def test_sanitize_html_fallback_on_error(self):
        """Testa fallback em caso de erro."""
        # HTML malformado pode causar erro, mas função deve retornar algo
        html = "<unclosed<tag>"
        result = sanitize_html(html)
        
        assert isinstance(result, str)


class TestValidatePayloadSize:
    """Testes para validação de tamanho de payload."""
    
    def test_validate_payload_size_within_limit(self):
        """Testa payload dentro do limite."""
        payload = {"data": "x" * 1000}  # Pequeno
        
        result = validate_payload_size(payload, max_size_kb=10)
        
        assert result is True
    
    def test_validate_payload_size_exceeds_limit(self):
        """Testa payload que excede limite."""
        # Criar payload grande (mais de 1MB)
        payload = {"data": "x" * (2 * 1024 * 1024)}  # 2MB
        
        result = validate_payload_size(payload, max_size_kb=1024)  # 1MB limite
        
        assert result is False
    
    def test_validate_payload_size_default_limit(self):
        """Testa com limite padrão."""
        payload = {"data": "x" * 100}
        
        result = validate_payload_size(payload)
        
        assert result is True


class TestValidateEmail:
    """Testes para validação de email."""
    
    def test_validate_email_valid(self):
        """Testa emails válidos."""
        valid_emails = [
            "user@example.com",
            "test.user@domain.co.uk",
            "user+tag@example.com",
            "user_name@example-domain.com"
        ]
        
        for email in valid_emails:
            assert validate_email(email) is True
    
    def test_validate_email_invalid(self):
        """Testa emails inválidos."""
        invalid_emails = [
            "notanemail",
            "@example.com",
            "user@",
            "user@.com",
            "user space@example.com",
            "a" * (MAX_EMAIL_LENGTH + 1) + "@example.com"
        ]
        
        for email in invalid_emails:
            assert validate_email(email) is False
    
    def test_validate_email_empty(self):
        """Testa email vazio."""
        assert validate_email("") is False
        assert validate_email(None) is False


class TestValidateURL:
    """Testes para validação de URL."""
    
    def test_validate_url_valid(self):
        """Testa URLs válidas."""
        valid_urls = [
            "http://example.com",
            "https://example.com/path",
            "https://subdomain.example.com",
            "http://example.com:8080/path?query=value"
        ]
        
        for url in valid_urls:
            assert validate_url(url) is True
    
    def test_validate_url_invalid(self):
        """Testa URLs inválidas."""
        invalid_urls = [
            "not a url",
            "ftp://example.com",  # Apenas http/https
            "javascript:alert('xss')",
            "http://",
            "a" * (MAX_URL_LENGTH + 1)
        ]
        
        for url in invalid_urls:
            assert validate_url(url) is False


class TestSanitizeSQLInput:
    """Testes para sanitização de entrada SQL."""
    
    def test_sanitize_sql_input_removes_dangerous_chars(self):
        """Testa remoção de caracteres perigosos para SQL."""
        text = "'; DROP TABLE users; --"
        result = sanitize_sql_input(text)
        
        assert "';" not in result
        assert "DROP" not in result
        assert "--" not in result
    
    def test_sanitize_sql_input_removes_sql_comments(self):
        """Testa remoção de comentários SQL."""
        text = "SELECT * FROM users /* comment */"
        result = sanitize_sql_input(text)
        
        assert "/*" not in result
        assert "*/" not in result
    
    def test_sanitize_sql_input_converts_to_string(self):
        """Testa conversão para string."""
        result = sanitize_sql_input(123)
        
        assert isinstance(result, str)


class TestValidateTextField:
    """Testes para validação de campos de texto."""
    
    def test_validate_text_field_valid(self):
        """Testa campo de texto válido."""
        is_valid, error = validate_text_field("Valid text", "campo")
        
        assert is_valid is True
        assert error is None
    
    def test_validate_text_field_too_long(self):
        """Testa campo muito longo."""
        long_text = "x" * (MAX_TEXT_FIELD_LENGTH + 1)
        is_valid, error = validate_text_field(long_text, "campo")
        
        assert is_valid is False
        assert "excede" in error.lower() or "tamanho" in error.lower()
    
    def test_validate_text_field_empty(self):
        """Testa campo vazio."""
        is_valid, error = validate_text_field("   ", "campo")
        
        assert is_valid is False
        assert "vazio" in error.lower()
    
    def test_validate_text_field_not_string(self):
        """Testa campo que não é string."""
        is_valid, error = validate_text_field(123, "campo")
        
        assert is_valid is False
        assert "string" in error.lower()


class TestSanitizeDict:
    """Testes para sanitização de dicionários."""
    
    def test_sanitize_dict_simple(self):
        """Testa sanitização de dicionário simples."""
        data = {
            "name": "  Test  ",
            "email": "user@example.com",
            "age": 25
        }
        
        result = sanitize_dict(data)
        
        assert result["name"] == "Test"  # Espaços removidos
        assert result["email"] == "user@example.com"
        assert result["age"] == 25  # Números preservados
    
    def test_sanitize_dict_nested(self):
        """Testa sanitização de dicionário aninhado."""
        data = {
            "user": {
                "name": "  John  ",
                "profile": {
                    "bio": "  Bio text  "
                }
            }
        }
        
        result = sanitize_dict(data)
        
        assert result["user"]["name"] == "John"
        assert result["user"]["profile"]["bio"] == "Bio text"
    
    def test_sanitize_dict_with_html(self):
        """Testa sanitização de campos HTML."""
        data = {
            "content": "<script>alert('xss')</script><p>Safe</p>",
            "title": "Normal Title"
        }
        
        result = sanitize_dict(data, sanitize_html_fields=["content"])
        
        assert "<script>" not in result["content"]
        assert "Safe" in result["content"]
        assert result["title"] == "Normal Title"  # Não sanitizado como HTML
    
    def test_sanitize_dict_with_list(self):
        """Testa sanitização de lista."""
        data = {
            "items": [
                {"name": "  Item 1  "},
                {"name": "  Item 2  "},
                "  String Item  "
            ]
        }
        
        result = sanitize_dict(data)
        
        assert result["items"][0]["name"] == "Item 1"
        assert result["items"][1]["name"] == "Item 2"
        assert result["items"][2] == "String Item"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
