#!/bin/bash

# Economic Justice Platform - Service Deployment Script
# For multi-VPS deployment across Tailscale network

echo "🚀 Deploying Economic Justice Platform Service"
echo "============================================"

# Configuration
SERVICE_NAME="economic-justice"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PROJECT_DIR="/home/cybersage/Revolution/economic-justice-platform"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# Check if service file exists in project
echo "📋 Checking service configuration..."
if [ ! -f "${PROJECT_DIR}/economic-justice.service" ]; then
    echo "❌ Service file not found in project directory"
    exit 1
fi

# Deploy service file
echo "📦 Installing systemd service..."
cp "${PROJECT_DIR}/economic-justice.service" "$SERVICE_FILE"
chmod 644 "$SERVICE_FILE"

# Reload systemd
echo "🔄 Reloading systemd configuration..."
systemctl daemon-reload

# Enable and start service
echo "🔧 Enabling service..."
systemctl enable "$SERVICE_NAME"

echo "🚀 Starting service..."
systemctl start "$SERVICE_NAME"

# Check status
echo "📊 Service status:"
systemctl status "$SERVICE_NAME" --no-pager -l

echo ""
echo "✅ Service deployed successfully!"
echo ""
echo "📋 Management commands:"
echo "   systemctl status $SERVICE_NAME"
echo "   systemctl restart $SERVICE_NAME"
echo "   journalctl -u $SERVICE_NAME -f"
echo ""
echo "🌐 The server will automatically:"
echo "   • Start on system boot"
echo "   • Restart on crashes"
echo "   • Run persistently across reboots"
echo ""
echo "💡 Ensure Tailscale is running on this VPS for network access"