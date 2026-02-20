#!/bin/bash
# deploy_vps.sh - Script completo de deployment em VPS Ubuntu/Debian
# Usage: ./deploy_vps.sh

set -e

echo "=========================================="
echo "SENTINEL - VPS Deployment Script"
echo "=========================================="
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Atualizar sistema
echo "[1/10] Updating system..."
apt-get update
apt-get upgrade -y

# Instalar dependências
echo "[2/10] Installing dependencies..."
apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    nginx \
    git \
    fail2ban \
    ufw \
    certbot \
    python3-certbot-nginx \
    supervisor

# Criar usuário sentinel
echo "[3/10] Creating sentinel user..."
if ! id -u sentinel &>/dev/null; then
    useradd -m -s /bin/bash sentinel
fi

# Criar diretórios
echo "[4/10] Creating directories..."
mkdir -p /opt/sentinel
mkdir -p /opt/sentinel/data/{logs,backups,generated_docs}
mkdir -p /var/log/sentinel

# Clonar repositório (ajuste o URL)
echo "[5/10] Cloning repository..."
if [ ! -d "/opt/sentinel/.git" ]; then
    git clone https://github.com/YOUR_USERNAME/AP_Controller.git /opt/sentinel
else
    cd /opt/sentinel
    git pull origin main
fi

# Configurar Python virtual environment
echo "[6/10] Setting up Python environment..."
cd /opt/sentinel
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Configurar .env
echo "[7/10] Configuring environment..."
if [ ! -f "/opt/sentinel/.env" ]; then
    cat > /opt/sentinel/.env << EOF
# SENTINEL Production Configuration
APP_ENV=production
SECRET_KEY=$(openssl rand -base64 32)
DATABASE_URL=sqlite:///./data/sentinel.db
LOG_LEVEL=INFO

# CORS - ajuste para seu domínio
CORS_ORIGINS=https://your-domain.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# Tokens (configure se necessário)
# TELEGRAM_BOT_TOKEN=
# AIRBNB_ICAL_URL=
# BOOKING_ICAL_URL=
EOF
    echo "IMPORTANT: Edit /opt/sentinel/.env with your configuration!"
fi

# Inicializar banco de dados
echo "[8/10] Initializing database..."
python -c "from app.database.session import create_all_tables; create_all_tables()"
python scripts/create_default_admin.py

# Configurar permissões
echo "[9/10] Setting permissions..."
chown -R sentinel:sentinel /opt/sentinel
chown -R sentinel:sentinel /var/log/sentinel
chmod 600 /opt/sentinel/.env

# Configurar firewall
echo "[10/10] Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# Instalar systemd service
cp /opt/sentinel/deployment/systemd/sentinel.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable sentinel
systemctl start sentinel

# Configurar nginx
cp /opt/sentinel/deployment/nginx/nginx.conf /etc/nginx/nginx.conf
nginx -t
systemctl enable nginx
systemctl restart nginx

# Configurar fail2ban
cp /opt/sentinel/deployment/fail2ban/sentinel.conf /etc/fail2ban/filter.d/
cp /opt/sentinel/deployment/fail2ban/jail.local /etc/fail2ban/jail.d/sentinel.local
systemctl enable fail2ban
systemctl restart fail2ban

echo ""
echo "=========================================="
echo "Deployment completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit /opt/sentinel/.env with your configuration"
echo "2. Update nginx.conf with your domain name"
echo "3. Run: ./setup_ssl.sh your-domain.com your-email@example.com"
echo "4. Check status: sudo systemctl status sentinel"
echo "5. View logs: sudo journalctl -u sentinel -f"
echo ""
echo "Default admin credentials:"
echo "Username: admin"
echo "Password: Admin123!"
echo ""
echo "IMPORTANT: Change the admin password after first login!"
