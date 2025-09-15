#!/bin/bash

# Economic Justice Platform Deployment Script

echo "🚀 Starting Economic Justice Platform Deployment"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create production .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your production values before deployment"
fi

# Build and start containers
echo "🏗️  Building Docker containers..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Run database migrations (if needed)
echo "🗄️  Setting up database..."
# Add database migration commands here when available

echo "✅ Deployment completed!"
echo "🌐 API Server: http://localhost:3000"
echo "📊 Health Check: http://localhost:3000/api/health"
echo "📚 API Docs: http://localhost:3000/api-docs"

echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your production values"
echo "2. Run database migrations when available"
echo "3. Configure your reverse proxy (nginx, traefik, etc.)"
echo "4. Set up SSL certificates"
echo "5. Configure monitoring and logging"