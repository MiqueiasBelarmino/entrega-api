#!/bin/bash
set -e  # Para imediatamente se qualquer comando falhar

echo "--- Iniciando Deploy API: $(date) ---"
cd /root/apps/entrega-certa/api

# Carrega variáveis de ambiente da API (inclui DATABASE_URL)
set -a
source /root/apps/entrega-certa/api/.env
set +a

# Nome do container do PostgreSQL no Docker
POSTGRES_CONTAINER="postgres_geral"

# Extrai usuário e nome do banco do DATABASE_URL
# Formato: postgresql://USER:SENHA@HOST:PORTA/BANCO
DB_USER=$(echo $DATABASE_URL | sed 's|.*://\([^:]*\):.*|\1|')
DB_NAME=$(echo $DATABASE_URL | sed 's|.*/\([^?]*\).*|\1|')

# Backup do banco antes de qualquer migration
mkdir -p /root/backups
echo "Fazendo backup do banco..."
BACKUP_FILE="/root/backups/pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
docker exec $POSTGRES_CONTAINER pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"
echo "Backup concluído: $BACKUP_FILE"

git pull origin master
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build

# reload (sem downtime) ao invés de restart
pm2 reload entrega-certa-api --update-env

# Health check: verifica se a API respondeu corretamente
sleep 3
curl -sf http://localhost:3000/health > /dev/null || {
  echo "ERRO: health check falhou após deploy!"
  exit 1
}

echo "--- API atualizada com sucesso: $(date) ---"

# Remove backups com mais de 7 dias para não lotar o disco
find /root/backups -name "pre_deploy_*.sql" -mtime +7 -delete
