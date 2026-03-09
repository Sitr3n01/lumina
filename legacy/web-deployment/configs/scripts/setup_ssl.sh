#!/bin/bash
# setup_ssl.sh - Configura certificados SSL com Let's Encrypt
# Usage: ./setup_ssl.sh your-domain.com your-email@example.com

set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 sentinel.example.com admin@example.com"
    exit 1
fi

echo "=========================================="
echo "SENTINEL - SSL/TLS Setup with Let's Encrypt"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Criar diretório para ACME challenge
sudo mkdir -p /var/www/certbot

# Obter certificado
echo "Requesting SSL certificate from Let's Encrypt..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

# Copiar certificados para diretório nginx
echo "Copying certificates..."
sudo mkdir -p /etc/nginx/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/chain.pem /etc/nginx/ssl/

# Configurar permissões
sudo chmod 644 /etc/nginx/ssl/fullchain.pem
sudo chmod 600 /etc/nginx/ssl/privkey.pem
sudo chmod 644 /etc/nginx/ssl/chain.pem

# Configurar renovação automática
echo "Setting up automatic renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Testar configuração nginx
echo "Testing nginx configuration..."
sudo nginx -t

# Recarregar nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "=========================================="
echo "SSL/TLS setup completed successfully!"
echo "=========================================="
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo "Auto-renewal enabled via certbot.timer"
echo ""
echo "Next steps:"
echo "1. Update nginx.conf with your domain name"
echo "2. Restart nginx: sudo systemctl restart nginx"
echo "3. Test your site: https://$DOMAIN"
