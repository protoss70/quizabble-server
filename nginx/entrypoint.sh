#!/bin/bash

echo "Using Production Nginx Config"
cp /etc/nginx/templates/prod.conf /etc/nginx/conf.d/default.conf

# Ensure Let's Encrypt directory exists
mkdir -p /var/www/certbot

# Check if the certificate already exists
if [ ! -f "/etc/letsencrypt/live/api.quizabble.com/fullchain.pem" ]; then
  echo "Generating SSL certificate with Certbot..."
  
  certbot certonly --webroot --webroot-path=/var/www/certbot --email gokdenizk.be@gmail.com --agree-tos --no-eff-email --staging -d api.quizabble.com
  
  if [ $? -ne 0 ]; then
    echo "Certbot failed! Exiting..."
    exit 1
  fi
else
  echo "SSL certificate already exists. Skipping Certbot generation."
fi

# Start Nginx only after Certbot is successful
echo "Starting Nginx..."
nginx -g "daemon off;"

# ============================
# 🔹 Local Testing Configuration (Commented Out)
# ============================
# Uncomment the following block when testing locally instead of production
# echo "Using Local SSL (mkcert)..."
# cp /etc/nginx/templates/local.conf /etc/nginx/conf.d/default.conf
# nginx -g "daemon off;"
