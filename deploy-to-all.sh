#!/bin/bash

# Economic Justice Platform - Multi-VPS Deployment Script
# Synchronizes and deploys to all Tailscale VPS nodes

echo "🌐 Multi-VPS Deployment Synchronization"
echo "======================================"

# Configuration - UPDATE THESE WITH YOUR ACTUAL VPS HOSTNAMES/IPs
VPS_NODES=(
    "vps2"          # Replace with your second VPS Tailscale IP/hostname
    "vps3"          # Replace with your third VPS Tailscale IP/hostname
)

LOCAL_USER="cybersage"
REMOTE_USER="cybersage"  # Assuming same username on all VPS
PROJECT_DIR="Revolution/economic-justice-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Target VPS nodes: ${VPS_NODES[*]}${NC}"
echo ""

# Function to check if host is reachable
check_host() {
    local host=$1
    if ping -c 1 -W 2 "$host" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to deploy to a single VPS
deploy_to_vps() {
    local vps=$1
    local full_host="$REMOTE_USER@$vps"

    echo -e "${YELLOW}🚀 Deploying to $vps...${NC}"

    # Check if host is reachable
    if ! check_host "$vps"; then
        echo -e "${RED}❌ $vps is not reachable${NC}"
        return 1
    fi

    # RSync files to remote VPS
    echo "📦 Synchronizing files..."
    if rsync -avz --delete \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        ./ "$full_host:$PROJECT_DIR/"; then
        echo -e "${GREEN}✅ Files synchronized${NC}"
    else
        echo -e "${RED}❌ File sync failed${NC}"
        return 1
    fi

    # Deploy service on remote VPS
    echo "🔧 Deploying service..."
    if ssh "$full_host" "cd $PROJECT_DIR && sudo ./deploy-service.sh"; then
        echo -e "${GREEN}✅ Service deployed successfully${NC}"
    else
        echo -e "${RED}❌ Service deployment failed${NC}"
        return 1
    fi

    # Verify service status
    echo "📊 Verifying service status..."
    ssh "$full_host" "systemctl status economic-justice --no-pager -l | head -10"

    return 0
}

# Main deployment loop
successful_deployments=0
total_nodes=${#VPS_NODES[@]}

for vps in "${VPS_NODES[@]}"; do
    echo ""
    echo "=" . 50
    if deploy_to_vps "$vps"; then
        ((successful_deployments++))
    fi
    echo "=" . 50
    echo ""
done

# Summary
echo ""
echo "📊 Deployment Summary:"
echo "===================="
echo -e "Total VPS nodes: $total_nodes"
echo -e "Successful deployments: $successful_deployments"

if [ "$successful_deployments" -eq "$total_nodes" ]; then
    echo -e "${GREEN}🎉 All deployments completed successfully!${NC}"
elif [ "$successful_deployments" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Partial success: $successful_deployments/$total_nodes deployed${NC}"
else
    echo -e "${RED}❌ All deployments failed${NC}"
fi

echo ""
echo "🌐 Access URLs (after Tailscale connection):"
for vps in "${VPS_NODES[@]}"; do
    echo "   http://$vps:8000"
done

echo ""
echo "💡 Remember to update VPS_NODES array with your actual VPS hostnames/IPs"