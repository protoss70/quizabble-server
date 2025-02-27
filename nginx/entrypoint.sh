#!/bin/bash

echo "Using Production Nginx Config"
cp /etc/nginx/templates/prod.conf /etc/nginx/conf.d/default.conf


# Comment out Certbot generation completely:
# if [ ! -f "/etc/letsencrypt/live/api.quizabble.com/fullchain.pem" ]; then
#   certbot certonly --webroot ...
#   if [ $? -ne 0 ]; then
#     echo "Certbot failed! Exiting..."
#     exit 1
#   fi
# else
#   echo "SSL certificate already exists. Skipping Certbot generation."
# fi

# Just start Nginx now
echo "Starting Nginx..."
nginx -g "daemon off;"

# ============================
# 🔹 Local Testing Configuration (Commented Out)
# ============================
# Uncomment the following block when testing locally instead of production
# echo "Using Local SSL (mkcert)..."
# cp /etc/nginx/templates/local.conf /etc/nginx/conf.d/default.conf
# nginx -g "daemon off;"
