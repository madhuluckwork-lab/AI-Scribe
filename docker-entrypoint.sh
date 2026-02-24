#!/bin/sh
set -e

if [ "$SERVICE_TYPE" = "worker" ]; then
  echo "Starting worker process..."
  exec node --import tsx src/workers/index.ts
else
  echo "Running database migrations..."
  npx prisma migrate deploy
  echo "Starting web server..."
  exec npm run start
fi
