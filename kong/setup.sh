#!/bin/sh
set -e

KONG_ADMIN="${KONG_ADMIN_URL:-http://localhost:8001}"

# Carrega JWT_SECRET do .env raiz se não estiver no ambiente
if [ -z "$JWT_SECRET" ] && [ -f "$(dirname "$0")/../.env" ]; then
  JWT_SECRET=$(grep -E '^JWT_SECRET=' "$(dirname "$0")/../.env" | cut -d '=' -f2-)
fi

if [ -z "$JWT_SECRET" ]; then
  echo "Erro: JWT_SECRET não definido."
  exit 1
fi

# ─── Aguarda Kong Admin estar pronto ────────────────────────────────────────
echo "Aguardando Kong Admin API..."
until curl -sf "$KONG_ADMIN/status" > /dev/null 2>&1; do
  sleep 2
done
echo "Kong pronto.\n"

# ─── Helper ─────────────────────────────────────────────────────────────────
put() {
  curl -sf -X PUT "$KONG_ADMIN$1" \
    -H "Content-Type: application/json" \
    -d "$2" > /dev/null
}

post() {
  curl -sf -X POST "$KONG_ADMIN$1" \
    -H "Content-Type: application/json" \
    -d "$2" > /dev/null
}

# ─── Serviços ────────────────────────────────────────────────────────────────
echo "Criando serviços..."

put /services/auth-api-service '{
  "url": "http://auth-api:3001",
  "connect_timeout": 5000,
  "read_timeout": 10000,
  "write_timeout": 10000
}'

put /services/wallet-api-service '{
  "url": "http://wallet-api:3002",
  "connect_timeout": 5000,
  "read_timeout": 10000,
  "write_timeout": 10000
}'

echo "Serviços criados.\n"

# ─── Rotas ───────────────────────────────────────────────────────────────────
echo "Criando rotas..."

put /services/auth-api-service/routes/auth-route '{
  "paths": ["/auth"],
  "strip_path": false,
  "preserve_host": false
}'

put /services/wallet-api-service/routes/wallet-route '{
  "paths": ["/wallet"],
  "strip_path": false,
  "preserve_host": false
}'

echo "Rotas criadas.\n"

# ─── Plugins no wallet-api-service ──────────────────────────────────────────
echo "Configurando plugins..."

# JWT — valida o token antes de chegar no serviço
put /services/wallet-api-service/plugins/wallet-jwt '{
  "name": "jwt",
  "config": {
    "claims_to_verify": ["exp"],
    "key_claim_name": "iss"
  }
}'

# inject-user-id — lê o sub do JWT e injeta X-User-Id
put /services/wallet-api-service/plugins/wallet-inject-user-id '{
  "name": "inject-user-id"
}'

# rate-limiting — 60 req/min por IP
put /services/wallet-api-service/plugins/wallet-rate-limit '{
  "name": "rate-limiting",
  "config": {
    "minute": 60,
    "policy": "local"
  }
}'

echo "Plugins configurados.\n"

# ─── Consumer + credencial JWT ───────────────────────────────────────────────
echo "Criando consumer..."

put /consumers/app-client '{
  "username": "app-client"
}'

# Verifica se já existe credencial JWT para evitar duplicata
EXISTING=$(curl -sf "$KONG_ADMIN/consumers/app-client/jwt" | grep -c '"key":"auth-api"' || true)

if [ "$EXISTING" = "0" ]; then
  post /consumers/app-client/jwt "{
    \"algorithm\": \"HS256\",
    \"key\": \"auth-api\",
    \"secret\": \"$JWT_SECRET\"
  }"
  echo "Credencial JWT criada."
else
  echo "Credencial JWT já existe, pulando."
fi

echo "\nSetup do Kong concluído."
