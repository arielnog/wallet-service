# Wallet Project

Aplicação de carteira digital (wallet) composta por dois microsserviços NestJS, um API Gateway Kong e um frontend Next.js.

## Arquitetura

```
                     ┌──────────────┐
   navegador ──────► │   Frontend   │  Next.js — :3000
                     │  (front/)    │
                     └──────┬───────┘
                            │ HTTP
                            ▼
                     ┌──────────────┐
                     │  Kong Proxy  │  :8000 (proxy) / :8001 (admin)
                     └──────┬───────┘
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌─────────────────┐        ┌───────────────────┐
     │  auth-api        │        │  wallet-api        │
     │  (ms-auth-api)    │        │  (ms-wallet-api)    │
     │  NestJS — :3001   │        │  NestJS — :3002     │
     └────────┬─────────┘        └─────────┬──────────┘
              │                             │
              └─────────────┬───────────────┘
                             ▼
                        ┌─────────┐
                        │  Redis  │  filas (BullMQ), rate limiting
                        └─────────┘
```

- **kong/**: API Gateway. Roteia `/auth/*` para o `auth-api` (rotas públicas) e `/wallet/*` para o `wallet-api` (protegido por JWT, rate limiting e um plugin customizado `inject-user-id` que extrai o `sub` do token e injeta o header `X-User-Id`).
- **ms-auth-api/**: cadastro, login, refresh/logout de sessão, recuperação de senha e envio de e-mails (NestJS + TypeORM + SQLite + BullMQ).
- **ms-wallet-api/**: criação de carteira, consulta de saldo, depósito, transferência e estorno (NestJS + TypeORM + SQLite + BullMQ).
- **front/**: interface web (Next.js/React) com telas de login, registro, recuperação de senha e carteira.
- **Redis**: usado pelas filas do BullMQ e pelo rate limiting do Kong.
- Cada microsserviço persiste dados em um arquivo **SQLite** próprio (volumes `auth_data` e `wallet_data` no Docker).

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/)
- [Node.js 20+](https://nodejs.org/) e [Yarn](https://yarnpkg.com/) (para rodar `ms-auth-api`/`ms-wallet-api` fora do Docker)
- [npm](https://www.npmjs.com/) (para rodar o `front` fora do Docker)

## Subindo tudo com Docker (recomendado)

Este é o modo mais simples: sobe Kong, Postgres do Kong, Konga (UI admin do Kong), Redis, `auth-api` e `wallet-api`. O frontend **não** está no `docker-compose.yaml` e deve ser rodado à parte (veja [Frontend](#frontend)).

1. Crie o `.env` da raiz a partir do exemplo e preencha os segredos:

   ```bash
   cp .env.example .env
   ```

   | Variável | Descrição |
   |---|---|
   | `JWT_SECRET` | segredo usado para assinar/validar os JWTs (compartilhado entre Kong, auth-api e wallet-api) |
   | `KONG_PG_PASSWORD` | senha do Postgres usado pelo Kong |
   | `KONGA_TOKEN_SECRET` | segredo do token da UI admin (Konga) |

2. Crie os `.env` de cada microsserviço:

   ```bash
   cp ms-auth-api/.env.example ms-auth-api/.env
   cp ms-wallet-api/.env.example ms-wallet-api/.env
   ```

   Ajuste `JWT_SECRET` em ambos para o **mesmo valor** usado no `.env` da raiz (é assim que o Kong e os microsserviços validam o mesmo token). Se for usar recuperação de senha por e-mail, configure também as variáveis `MAIL_*` do `ms-auth-api/.env`.

3. Suba os serviços:

   ```bash
   docker compose up -d --build
   ```

4. Configure as rotas, plugins e credencial JWT do Kong (o `kong.yaml` documenta a configuração desejada, mas quem efetivamente a aplica é o script `setup.sh`):

   ```bash
   ./kong/setup.sh
   ```

   O script lê `JWT_SECRET` do `.env` da raiz automaticamente e é idempotente (pode ser executado novamente sem duplicar recursos).

5. Verifique se subiu tudo:

   ```bash
   docker compose ps
   curl http://localhost:8000/auth/health
   curl http://localhost:8000/wallet/health
   ```

### Serviços e portas expostas

| Serviço | Porta | Descrição |
|---|---|---|
| Kong (proxy) | `8000` | ponto de entrada da API (`/auth/*`, `/wallet/*`) |
| Kong (admin) | `8001` | API administrativa do Kong |
| Konga | `1337` | UI web para administrar o Kong |
| auth-api | interno (`3001`) | não exposta ao host, apenas acessível via Kong |
| wallet-api | interno (`3002`) | não exposta ao host, apenas acessível via Kong |
| redis | interno (`6379`) | não exposta ao host |

### Comandos úteis do Docker Compose

```bash
docker compose logs -f auth-api wallet-api   # acompanhar logs das APIs
docker compose restart auth-api               # reiniciar um serviço
docker compose down                           # parar tudo
docker compose down -v                        # parar e apagar volumes (bancos e dados do Kong)
```

## Frontend

O frontend não faz parte do `docker-compose.yaml`; rode-o localmente apontando para o Kong:

```bash
cd front
cp env.example .env.local   # ajuste API_URL se necessário (default: http://localhost:8000)
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Rodando os microsserviços sem Docker

Necessário ter Redis disponível localmente (ex.: `docker run -p 6379:6379 redis:7-alpine`).

```bash
cd ms-auth-api
cp .env.example .env   # ajuste REDIS_HOST=localhost e demais variáveis
yarn install
yarn start:dev          # http://localhost:3001
```

```bash
cd ms-wallet-api
cp .env.example .env   # ajuste REDIS_HOST=localhost e demais variáveis
yarn install
yarn start:dev          # http://localhost:3002
```

Sem o Kong à frente, os endpoints ficam disponíveis diretamente em `:3001` e `:3002` (sem os prefixos `/auth` e `/wallet`, e sem validação de JWT/rate limiting/`X-User-Id`, que são responsabilidade do gateway).

## Testes

```bash
cd ms-auth-api    # ou ms-wallet-api
yarn test          # testes unitários
yarn test:e2e       # testes e2e
yarn test:cov       # cobertura
```

## Endpoints principais (via Kong, `http://localhost:8000`)

Uma collection completa está em [wallet-project.postman_collection.json](wallet-project.postman_collection.json) (importe no Postman/Insomnia).

**Auth** (`/auth`, público):
- `GET /auth/health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

**Wallet** (`/wallet`, requer JWT — envie `Authorization: Bearer <accessToken>` obtido no login):
- `GET /wallet/health`
- `POST /wallet`
- `GET /wallet/balance`
- `POST /wallet/deposit`
- `POST /wallet/transfer`
- `POST /wallet/reversal/:transactionId`

## Solução de problemas

- **Kong retorna 401 nas rotas `/wallet/*`**: confirme que `JWT_SECRET` é idêntico em `.env` (raiz), `ms-wallet-api/.env` e na credencial JWT do consumer `app-client` (recriada por `kong/setup.sh`).
- **`kong/setup.sh` trava em "Aguardando Kong Admin API..."**: verifique se os containers `kong-db`, `kong-migration` e `kong` subiram (`docker compose logs kong`).
- **auth-api/wallet-api não sobem**: verifique se o `redis` está saudável (`docker compose ps`) — ambos dependem do healthcheck do Redis.
