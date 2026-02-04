#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"

echo "🔄 Running Prisma migrations..."
npx prisma db push --skip-generate

echo "🗓️  Updating session dates..."
node dist/scripts/updateSessionDates.js

# Check if database is empty (no sessions)
SESSION_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.session.count()
  .then(count => { console.log(count); process.exit(0); })
  .catch(() => { console.log(0); process.exit(0); });
")

if [ "$SESSION_COUNT" = "0" ]; then
  echo "📥 Database is empty, importing CSV data..."
  node dist/scripts/importFlat.js
else
  echo "✅ Database already contains data, skipping import"
fi

echo "🚀 Starting application..."
exec node dist/index.js
