# Dockerfile para SENTINEL - Apartment Controller
# Multi-stage build para imagem otimizada

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

# Instalar dependências de sistema necessárias para build
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar apenas requirements para aproveitar cache do Docker
COPY requirements.txt .

# Criar virtual environment e instalar dependências
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

# Criar usuário não-root para segurança
RUN useradd -m -u 1000 sentinel && \
    mkdir -p /app /app/data /app/data/logs /app/data/backups && \
    chown -R sentinel:sentinel /app

WORKDIR /app

# Copiar virtual environment do builder
COPY --from=builder /opt/venv /opt/venv

# Copiar código da aplicação
COPY --chown=sentinel:sentinel . .

# Configurar variáveis de ambiente
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production

# Mudar para usuário não-root
USER sentinel

# Expor porta da aplicação
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/v1/health/live', timeout=5)"

# Comando para iniciar a aplicação
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
