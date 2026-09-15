#!/bin/bash

# Database Restore Script for TOR Online System
# This script restores a PostgreSQL database from backup

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔄 TOR Database Restore Script"
echo "================================"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./restore-db.sh <backup_file>${NC}"
    echo ""
    echo "Available backups:"
    ls -lh backups/*.sql 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Read DATABASE_URL from .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Parse PostgreSQL connection string
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 Database: $DB_NAME"
echo "📁 Restore from: $BACKUP_FILE"
echo ""

# Warning
echo -e "${YELLOW}⚠️  WARNING: This will replace all current data in the database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Set password for pg_restore
export PGPASSWORD=$DB_PASS

# Drop and recreate database (optional - be careful!)
echo ""
echo "⏳ Restoring database..."
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c -v "$BACKUP_FILE"

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Database restored successfully!${NC}"
else
    echo -e "${RED}❌ Restore failed!${NC}"
    exit 1
fi

# Unset password
unset PGPASSWORD

echo ""
echo "💡 Tip: Run 'npx prisma migrate deploy' if schema changes are needed"
