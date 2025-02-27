if [ "$ENV" = "production" ]; then
  echo "Using Production Nginx Config"
  cp /etc/nginx/templates/prod.conf /etc/nginx/conf.d/default.conf

  echo "Starting Certbot for Let's Encrypt SSL..."
  certbot certonly --webroot --webroot-path=/var/www/certbot --email gokdenizk.be@gmail.com --agree-tos --no-eff-email --staging -d api.quizabble.com
  
  nginx -g "daemon off;"
else
  echo "Using Local SSL (mkcert)..."
  cp /etc/nginx/templates/local.conf /etc/nginx/conf.d/default.conf
  nginx -g "daemon off;"
fi
