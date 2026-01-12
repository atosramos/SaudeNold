#!/bin/bash

# Script para rebuildar e atualizar o backend no Docker

echo "🏗️  Rebuilding backend image..."
cd backend
docker build -t saudenold-backend:latest .
cd ..

echo "🔄 Restarting containers..."
docker-compose down
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "✅ Backend updated!"
echo "Check status with: docker-compose ps"
echo "View logs with: docker-compose logs -f backend"





















