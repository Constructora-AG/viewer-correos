#!/usr/bin/env bash
# Monta en el VPS (con Coolify/Traefik) un servicio privado que entrega los correos
# solo a quien envíe "Authorization: Bearer <token>". Se ejecuta EN el VPS:
#   ssh correos-ag 'bash -s' < scripts/servidor-archivos.sh
set -euo pipefail

HOST="${HOST:-correos-ag.46.202.178.33.sslip.io}"
DIR=/data/correos-ag

mkdir -p "$DIR/eml" "$DIR/index" "$DIR/nginx"
if [ ! -s "$DIR/.token" ]; then (umask 077; openssl rand -hex 32 | tr -d '\n' > "$DIR/.token"); fi
T=$(cat "$DIR/.token")

cat > "$DIR/nginx/default.conf" <<EOF
server {
  listen 80;
  server_tokens off;
  autoindex off;
  root /srv;
  location ~ ^/(eml|index)/ {
    if (\$http_authorization != "Bearer $T") { return 401; }
    add_header Cache-Control "private, no-store";
    try_files \$uri =404;
  }
  location / { return 404; }
}
EOF
chmod 644 "$DIR/nginx/default.conf"

docker rm -f correos-ag-files >/dev/null 2>&1 || true
docker run -d --name correos-ag-files --restart unless-stopped --network coolify \
  -v "$DIR/eml:/srv/eml:ro" -v "$DIR/index:/srv/index:ro" \
  -v "$DIR/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.27-alpine >/dev/null

cat > /data/coolify/proxy/dynamic/correos-ag.yaml <<EOF
http:
  routers:
    correos-ag:
      rule: Host(\`$HOST\`)
      entryPoints: [https]
      service: correos-ag
      tls:
        certResolver: letsencrypt
    correos-ag-http:
      rule: Host(\`$HOST\`)
      entryPoints: [http]
      service: correos-ag
  services:
    correos-ag:
      loadBalancer:
        servers:
          - url: "http://correos-ag-files:80"
EOF

echo "Servicio listo en https://$HOST"
echo "Token guardado en $DIR/.token (solo root)"
