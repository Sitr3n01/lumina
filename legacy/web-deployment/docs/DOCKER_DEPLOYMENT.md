# LUMINA - Docker Deployment Guide

## 📋 Visão Geral

Este guia explica como fazer deploy do LUMINA usando Docker e Docker Compose, oferecendo uma alternativa mais simples e portável ao deployment tradicional.

## 🎯 Vantagens do Docker

- ✅ **Isolamento**: Aplicação roda em container isolado
- ✅ **Portabilidade**: Funciona em qualquer sistema com Docker
- ✅ **Facilidade**: Setup simplificado
- ✅ **Consistência**: Ambiente idêntico em dev/staging/prod
- ✅ **Escalabilidade**: Fácil adicionar mais containers

---

## 🔧 Pré-requisitos

### Instalar Docker

**Ubuntu/Debian:**

```bash
# Atualizar sistema
sudo apt-get update

# Instalar dependências
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Adicionar repositório Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Adicionar usuário ao grupo docker (para rodar sem sudo)
sudo usermod -aG docker $USER

# Sair e logar novamente para aplicar mudanças
```

**Verificar instalação:**

```bash
docker --version
docker compose version
```

---

## 🚀 Quick Start

### 1. Clonar Repositório

```bash
git clone https://github.com/SEU_USUARIO/AP_Controller.git
cd AP_Controller
```

### 2. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
cp .env.example .env  # ou criar manualmente
nano .env
```

**Conteúdo mínimo do `.env`:**

```env
# Ambiente
APP_ENV=production

# Segurança - GERE UMA CHAVE FORTE!
SECRET_KEY=sua-chave-secreta-aqui-min-32-chars

# CORS (ajuste para seu domínio)
CORS_ORIGINS=https://seu-dominio.com,http://localhost:3000

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
```

**Gerar SECRET_KEY:**

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Build e Start

```bash
# Build da imagem
docker compose build

# Iniciar containers
docker compose up -d

# Verificar logs
docker compose logs -f
```

### 4. Inicializar Banco de Dados

```bash
# Criar tabelas
docker compose exec lumina-app python -c "from app.database.session import create_all_tables; create_all_tables()"

# Criar usuário admin
docker compose exec lumina-app python scripts/create_default_admin.py
```

### 5. Testar

```bash
# Verificar se está rodando
curl http://localhost:8000/api/v1/health/

# Acessar documentação
# Abra no navegador: http://localhost:8000/docs
```

---

## 📝 Comandos Úteis

### Gerenciamento de Containers

```bash
# Ver containers rodando
docker compose ps

# Parar containers
docker compose stop

# Iniciar containers
docker compose start

# Reiniciar containers
docker compose restart

# Parar e remover containers
docker compose down

# Parar e remover containers + volumes
docker compose down -v

# Ver logs
docker compose logs -f lumina-app

# Ver logs das últimas 100 linhas
docker compose logs --tail=100 lumina-app

# Executar comando dentro do container
docker compose exec lumina-app bash
docker compose exec lumina-app python -c "print('Hello')"
```

### Build e Atualização

```bash
# Rebuild completo (sem cache)
docker compose build --no-cache

# Atualizar código e reiniciar
git pull origin main
docker compose up -d --build

# Rebuild apenas se houve mudanças
docker compose up -d
```

### Inspeção e Debug

```bash
# Entrar no container
docker compose exec lumina-app bash

# Ver uso de recursos
docker stats lumina-api

# Inspecionar container
docker inspect lumina-api

# Ver networks
docker network ls
docker network inspect ap_controller_lumina-network
```

---

## 🔒 Deployment Produção com Nginx

### Estrutura Completa

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  lumina-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: lumina-api
    restart: unless-stopped
    environment:
      - APP_ENV=production
      - DATABASE_URL=sqlite:///./data/lumina.db
      - SECRET_KEY=${SECRET_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - ./data:/app/data
    networks:
      - lumina-network
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/api/v1/health/live')"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: lumina-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deployment/nginx/ssl:/etc/nginx/ssl:ro
      - ./data/logs/nginx:/var/log/nginx
    depends_on:
      - lumina-app
    networks:
      - lumina-network

networks:
  lumina-network:
    driver: bridge
```

### Usar Configuração de Produção

```bash
# Iniciar com config de produção
docker compose -f docker-compose.prod.yml up -d

# Ver logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 💾 Backup e Restore com Docker

### Backup do Volume de Dados

```bash
# Backup completo do volume
docker run --rm \
  -v ap_controller_lumina-data:/data \
  -v $(pwd):/backup \
  alpine tar -czf /backup/lumina-data-$(date +%Y%m%d).tar.gz -C /data .

# Backup apenas do banco de dados
docker compose exec lumina-app \
  python -c "from app.core.backup import create_manual_backup; create_manual_backup('manual')"

# Copiar backup para host
docker cp lumina-api:/app/data/backups ./backups-local/
```

### Restore do Volume

```bash
# Parar aplicação
docker compose stop lumina-app

# Restaurar dados
docker run --rm \
  -v ap_controller_lumina-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar -xzf /backup/lumina-data-20240101.tar.gz"

# Reiniciar aplicação
docker compose start lumina-app
```

---

## 🔍 Monitoramento

### Health Checks

```bash
# Health check básico
curl http://localhost:8000/api/v1/health/

# Readiness check
curl http://localhost:8000/api/v1/health/ready

# Métricas do sistema
curl http://localhost:8000/api/v1/health/metrics | jq
```

### Logs e Debugging

```bash
# Logs em tempo real
docker compose logs -f

# Logs apenas da aplicação
docker compose logs -f lumina-app

# Logs do nginx
docker compose logs -f nginx

# Buscar erro específico
docker compose logs lumina-app | grep ERROR

# Exportar logs para arquivo
docker compose logs --no-color > logs-export.txt
```

### Recursos do Sistema

```bash
# Uso de CPU e memória
docker stats

# Uso de disco dos containers
docker system df

# Uso de disco detalhado
docker system df -v

# Limpar recursos não usados
docker system prune -a
```

---

## 🔄 Atualizações e Manutenção

### Atualizar Aplicação

```bash
# 1. Backup antes de atualizar
docker compose exec lumina-app \
  python -c "from app.core.backup import create_manual_backup; create_manual_backup('pre-update')"

# 2. Baixar novo código
git pull origin main

# 3. Rebuild e reiniciar
docker compose up -d --build

# 4. Verificar logs
docker compose logs -f lumina-app
```

### Rollback em Caso de Problema

```bash
# 1. Parar container atual
docker compose stop lumina-app

# 2. Reverter código
git checkout HEAD~1  # Voltar 1 commit

# 3. Rebuild
docker compose up -d --build

# 4. Restaurar banco se necessário
docker compose exec lumina-app bash
# Dentro do container:
python -c "
from app.core.backup import BackupManager
from pathlib import Path
bm = BackupManager()
backups = bm.list_backups()
if backups:
    bm.restore_backup(Path(backups[0]['path']))
"
```

### Limpar Containers e Imagens Antigas

```bash
# Remover containers parados
docker container prune

# Remover imagens não utilizadas
docker image prune -a

# Remover volumes não utilizados
docker volume prune

# Limpar tudo (CUIDADO!)
docker system prune -a --volumes
```

---

## 🌐 SSL/HTTPS com Let's Encrypt

### Usando Certbot com Docker

```bash
# 1. Obter certificado (primeira vez)
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d seu-dominio.com \
  --email seu-email@example.com \
  --agree-tos

# 2. Copiar certificados para nginx
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem deployment/nginx/ssl/
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem deployment/nginx/ssl/
sudo cp /etc/letsencrypt/live/seu-dominio.com/chain.pem deployment/nginx/ssl/

# 3. Reiniciar nginx
docker compose restart nginx
```

### Renovação Automática

```bash
# Criar script de renovação
cat > renew-cert.sh << 'EOF'
#!/bin/bash
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot renew \
  --webroot \
  --webroot-path=/var/www/certbot

# Copiar certificados atualizados
cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem deployment/nginx/ssl/
cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem deployment/nginx/ssl/

# Recarregar nginx
docker compose exec nginx nginx -s reload
EOF

chmod +x renew-cert.sh

# Adicionar ao crontab (executar todo dia)
(crontab -l 2>/dev/null; echo "0 3 * * * /path/to/renew-cert.sh") | crontab -
```

---

## 🛠️ Troubleshooting

### Container Não Inicia

```bash
# Ver logs de erro
docker compose logs lumina-app

# Verificar se porta está em uso
sudo lsof -i :8000
sudo netstat -tulpn | grep 8000

# Testar build manual
docker build -t lumina-test .
docker run -it --rm lumina-test bash
```

### Problemas de Permissão

```bash
# Corrigir permissões do volume
sudo chown -R 1000:1000 ./data

# Verificar permissões dentro do container
docker compose exec lumina-app ls -la /app/data
```

### Banco de Dados Travado

```bash
# Parar container
docker compose stop lumina-app

# Remover lock do SQLite
rm -f ./data/lumina.db-shm ./data/lumina.db-wal

# Reiniciar
docker compose start lumina-app
```

### Container Consumindo Muita Memória

```bash
# Ver uso de memória
docker stats lumina-api

# Limitar memória no docker-compose.yml
# Adicionar em services.lumina-app:
#   deploy:
#     resources:
#       limits:
#         memory: 1G

# Aplicar mudanças
docker compose up -d
```

---

## 📊 Comparação: Docker vs Traditional

| Aspecto | Docker | Traditional |
|---------|--------|-------------|
| **Setup** | Simples (3 comandos) | Complexo (muitos passos) |
| **Portabilidade** | Alta (funciona em qualquer OS) | Baixa (específico do OS) |
| **Isolamento** | Total | Parcial |
| **Performance** | 95-98% nativo | 100% nativo |
| **Uso de Recursos** | Overhead mínimo (~100MB) | Zero overhead |
| **Atualização** | Rebuild container | Atualizar pacotes |
| **Rollback** | Fácil (trocar tag) | Manual |
| **Escalabilidade** | Excelente | Limitada |

---

## ✅ Checklist de Deployment

- [ ] Docker e Docker Compose instalados
- [ ] `.env` configurado com SECRET_KEY segura
- [ ] Containers iniciados (`docker compose up -d`)
- [ ] Health checks respondendo
- [ ] Banco de dados inicializado
- [ ] Usuário admin criado
- [ ] Senha do admin alterada
- [ ] SSL/HTTPS configurado (produção)
- [ ] Backups automáticos funcionando
- [ ] Logs sendo gravados
- [ ] Firewall configurado (se aplicável)
- [ ] Monitoramento configurado

---

## 🎓 Próximos Passos

### 1. Orquestração com Kubernetes

Para ambientes enterprise:

```bash
# Converter docker-compose para kubernetes
kompose convert

# Deploy no cluster
kubectl apply -f .
```

### 2. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push Docker image
        run: |
          docker build -t lumina:latest .
          docker push lumina:latest
```

### 3. Multi-Stage Deployment

```bash
# Dev
docker compose -f docker-compose.dev.yml up

# Staging
docker compose -f docker-compose.staging.yml up

# Production
docker compose -f docker-compose.prod.yml up
```

---

**Seu LUMINA esta rodando em Docker!**

Para mais informações, consulte:
- [Documentação Docker](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [DEPLOYMENT_VPS.md](./DEPLOYMENT_VPS.md) para deployment tradicional
