#!/bin/bash

# Economic Justice Platform - Compression and Deployment Preparation

echo "📦 Preparing Economic Justice Platform for deployment..."

# Create deployment directory
DEPLOY_DIR="economic-justice-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy frontend files
echo "📁 Copying frontend files..."
cp -r *.html assets/ "$DEPLOY_DIR/"

# Copy backend files
echo "🔧 Copying backend files..."
cp -r backend/ "$DEPLOY_DIR/"

# Copy documentation and configuration
echo "📚 Copying documentation..."
cp README.md deployment-guide.md GEMINI.md TASKS.md CLAUDE.md "$DEPLOY_DIR/"

# Remove development files from backend
echo "🧹 Cleaning development files..."
find "$DEPLOY_DIR/backend" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "$DEPLOY_DIR/backend" -name ".env" -type f -delete 2>/dev/null || true
find "$DEPLOY_DIR/backend" -name "*.log" -type f -delete 2>/dev/null || true

# Create deployment README
cat > "$DEPLOY_DIR/DEPLOYMENT-QUICKSTART.md" << 'EOF'
# Economic Justice Platform - Quick Deployment Guide

## 🚀 Frontend Deployment (Static)

### Option 1: GitHub Pages
```bash
# Upload the entire folder to GitHub repository
# Enable GitHub Pages in repository settings
```

### Option 2: Netlify/Vercel
```bash
# Drag and drop this folder to Netlify dashboard
# Or connect GitHub repository for automatic deployment
```

## 🔧 Backend Deployment

### Docker Deployment (Recommended)
```bash
cd backend/
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d
```

### Manual Deployment
```bash
cd backend/
npm install
npm start
```

## 📋 Environment Configuration

1. Copy `backend/.env.example` to `backend/.env`
2. Update with your database credentials and API keys
3. Set `FRONTEND_URL` to your frontend domain

## 🔗 Connecting Frontend to Backend

Update API endpoints in HTML files:
- Change fetch URLs from localhost to your backend domain
- Update Socket.io connection URL

## 📊 Health Checks

- Backend: `http://your-backend-domain:3000/api/health`
- Frontend: Load index.html in browser

## 🆘 Support

See `deployment-guide.md` for detailed instructions and troubleshooting.
EOF

# Create compressed archive
echo "🗜️ Creating compressed archive..."
tar -czf "$DEPLOY_DIR.tar.gz" "$DEPLOY_DIR"

# Cleanup temporary directory
echo "🧼 Cleaning up..."
rm -rf "$DEPLOY_DIR"

echo "✅ Deployment package created: $DEPLOY_DIR.tar.gz"
echo ""
echo "📋 Next steps:"
echo "1. Upload the .tar.gz file to your deployment environment"
echo "2. Extract: tar -xzf $DEPLOY_DIR.tar.gz"
echo "3. Follow instructions in DEPLOYMENT-QUICKSTART.md"
echo "4. Configure environment variables in backend/.env"
echo "5. Start backend services with docker-compose up -d"
echo "6. Deploy frontend files to static hosting"