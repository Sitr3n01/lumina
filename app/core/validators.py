# app/core/validators.py
"""
Input Validators para prevenção de XSS, SQL Injection e outros ataques.
"""

import html
import re

# Padrões perigosos comuns
DANGEROUS_PATTERNS = [
    r"<script[^>]*>.*?</script>",  # Script tags
    r"javascript:",  # JavaScript protocol
    r"on\w+\s*=",  # Event handlers (onclick, onload, etc)
    r"<iframe",  # IFrames
    r"<object",  # Objects
    r"<embed",  # Embeds
]


def sanitize_html(text: str) -> str:
    """
    Remove/escapa HTML perigoso do texto.

    Args:
        text: Texto com possível HTML malicioso

    Returns:
        Texto sanitizado (HTML escapado)

    Example:
        >>> sanitize_html("<script>alert('xss')</script>Hello")
        "&lt;script&gt;alert('xss')&lt;/script&gt;Hello"
    """
    if not text:
        return text

    # Escapar HTML (converte < para &lt; etc)
    return html.escape(text)


def contains_dangerous_patterns(text: str) -> bool:
    """
    Verifica se texto contém padrões perigosos (XSS, injection).

    Args:
        text: Texto a ser verificado

    Returns:
        True se contém padrões perigosos
    """
    if not text:
        return False

    text_lower = text.lower()

    return any(re.search(pattern, text_lower, re.IGNORECASE | re.DOTALL) for pattern in DANGEROUS_PATTERNS)


def validate_email_safe(email: str) -> bool:
    """
    Valida se email é seguro (sem caracteres perigosos).

    Args:
        email: Email a ser validado

    Returns:
        True se email é seguro
    """
    if not email:
        return False

    # Padrão básico de email
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    return bool(re.match(email_pattern, email))


def validate_username_safe(username: str) -> bool:
    """
    Valida se username é seguro (apenas alfanuméricos, underscores, hífens).

    Args:
        username: Username a ser validado

    Returns:
        True se username é seguro
    """
    if not username:
        return False

    # Apenas letras, números, underscores e hífens
    # Min 3, max 30 caracteres
    username_pattern = r"^[a-zA-Z0-9_-]{3,30}$"

    return bool(re.match(username_pattern, username))


def sanitize_filename(filename: str) -> str:
    """
    Sanitiza nome de arquivo removendo caracteres perigosos.

    SECURITY: Remove path traversal, caracteres especiais e normaliza pontos.

    Args:
        filename: Nome do arquivo original

    Returns:
        Nome de arquivo seguro

    Example:
        >>> sanitize_filename("../../etc/passwd")
        "etcpasswd"
        >>> sanitize_filename("file<script>.txt")
        "filescript.txt"
        >>> sanitize_filename("file..name.docx")
        "file.name.docx"
    """
    if not filename:
        return "unnamed"

    # Remover path traversal (múltiplas passagens para pegar casos recursivos)
    for _ in range(5):  # Múltiplas passagens
        filename = filename.replace("../", "").replace("..\\", "")

    # Remover paths absolutos e relativos
    filename = filename.replace("/", "").replace("\\", "")

    # Remover caracteres perigosos, manter apenas alfanuméricos, pontos, hífens, underscores
    filename = re.sub(r"[^a-zA-Z0-9._-]", "", filename)

    # Remover pontos duplicados (.. -> .)
    while ".." in filename:
        filename = filename.replace("..", ".")

    # Remover pontos no início (arquivos ocultos Unix)
    filename = filename.lstrip(".")

    # Garantir que não está vazio após sanitização
    if not filename:
        return "unnamed"

    # Limitar tamanho
    return filename[:255]


def validate_url_safe(url: str, allowed_schemes: list | None = None) -> bool:
    """
    Valida se URL é segura (sem javascript:, data:, etc).

    Args:
        url: URL a ser validada
        allowed_schemes: Lista de esquemas permitidos (default: http, https)

    Returns:
        True se URL é segura
    """
    if not url:
        return False

    if allowed_schemes is None:
        allowed_schemes = ["http", "https"]

    # Converter para lowercase
    url_lower = url.lower().strip()

    # Verificar esquemas perigosos
    dangerous_schemes = ["javascript:", "data:", "vbscript:", "file:"]
    for scheme in dangerous_schemes:
        if url_lower.startswith(scheme):
            return False

    # Verificar se começa com esquema permitido
    for scheme in allowed_schemes:
        if url_lower.startswith(f"{scheme}://"):
            return True

    # URLs relativas são permitidas
    return bool(not url_lower.startswith(("http://", "https://", "//", ":")))


def strip_tags(text: str) -> str:
    """
    Remove TODAS as tags HTML do texto.

    Args:
        text: Texto com HTML

    Returns:
        Texto sem tags HTML

    Example:
        >>> strip_tags("<p>Hello <b>World</b></p>")
        "Hello World"
    """
    if not text:
        return text

    # Remove todas as tags HTML
    clean = re.sub(r"<[^>]+>", "", text)

    # Remove espaços extras
    clean = re.sub(r"\s+", " ", clean).strip()

    return clean


def validate_json_safe(json_str: str, max_depth: int = 10) -> bool:
    """
    Valida se JSON é seguro (sem aninhamento excessivo).

    Args:
        json_str: String JSON
        max_depth: Profundidade máxima permitida

    Returns:
        True se JSON é seguro
    """
    if not json_str:
        return False

    # Contar profundidade máxima (simplificado)
    max_nesting = 0
    current_nesting = 0

    for char in json_str:
        if char in ["{", "["]:
            current_nesting += 1
            max_nesting = max(max_nesting, current_nesting)
        elif char in ["}", "]"]:
            current_nesting -= 1

    return max_nesting <= max_depth


# Aliases para facilitar uso
escape_html = sanitize_html
clean_html = strip_tags
