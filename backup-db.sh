#!/bin/bash

# Database Backup Script for TOR Online System
# This script creates a backup of the PostgreSQL database

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="tor_backup_${DATE}.sql"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🗄️  TOR Database Backup Script"
echo "================================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Extract database connection info from .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Read DATABASE_URL from .env
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Parse PostgreSQL connection string
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 Database: $DB_NAME"
echo "🖥️  Host: $DB_HOST:$DB_PORT"
echo "📁 Backup to: $BACKUP_DIR/$BACKUP_FILE"
echo ""

# Set password for pg_dump
export PGPASSWORD=$DB_PASS

# Create backup
echo "⏳ Creating backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "📦 File: $BACKUP_FILE"
    echo "💾 Size: $BACKUP_SIZE"
    echo ""
    echo "Recent backups:"
    ls -lh "$BACKUP_DIR" | tail -5
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Clean up old backups (keep last 7 backups)
echo ""
echo "🧹 Cleaning up old backups (keeping last 7)..."
cd "$BACKUP_DIR"
ls -t tor_backup_*.sql | tail -n +8 | xargs -r rm
echo "✅ Cleanup complete"

# Unset password
unset PGPASSWORD
