#!/bin/bash
# Sauvegarde la base de données dans un fichier .sql daté.
# Nécessite mysqldump (installé avec le client MySQL/MariaDB).
#
# Utilisation :
#   ./scripts/sauvegarderBase.sh
#
# Lit les identifiants depuis DATABASE_URL dans .env (format
# mysql://user:motdepasse@hote:port/base). Le fichier est écrit dans
# sauvegardes/ à la racine du projet.

set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL introuvable dans .env"
  exit 1
fi

# Extrait user, mot de passe, hôte, port et base depuis l'URL mysql://...
REGEX="mysql://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/(.+)"
if [[ $DATABASE_URL =~ $REGEX ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]:-3306}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "Format de DATABASE_URL non reconnu"
  exit 1
fi

mkdir -p sauvegardes
FICHIER="sauvegardes/sauvegarde-$(date +%Y-%m-%d-%H%M).sql"

mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" > "$FICHIER"

echo "Sauvegarde écrite dans $FICHIER"
