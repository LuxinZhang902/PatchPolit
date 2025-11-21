#!/bin/bash

echo "🐳 Starting PatchPilot with Docker..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo ""
  echo "⚠️  Please edit .env and add your API keys:"
  echo "   - EXA_API_KEY"
  echo "   - GROQ_API_KEY"
  echo "   - GITHUB_TOKEN (optional)"
  echo ""
  echo "Then run this script again."
  exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running!"
  echo "Please start Docker and try again."
  exit 1
fi

# Build and start
echo "🔨 Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for application to start..."
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
  echo ""
  echo "✅ PatchPilot is running!"
  echo ""
  echo "📍 Access the application at: http://localhost:3000"
  echo ""
  echo "📊 View logs:"
  echo "   docker-compose logs -f"
  echo ""
  echo "🛑 Stop the application:"
  echo "   docker-compose down"
else
  echo ""
  echo "❌ Failed to start PatchPilot"
  echo "📋 Check logs:"
  echo "   docker-compose logs"
fi
