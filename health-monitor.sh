#!/bin/bash

# Economic Justice Platform - Health Monitoring and Failover Script
# Monitors service health and automatically restarts if needed

echo "🏥 Health Monitoring for Economic Justice Platform"
echo "================================================"

# Configuration
SERVICE_NAME="economic-justice"
HEALTH_URL="http://localhost:8000"
CHECK_INTERVAL=30  # seconds
MAX_RESTARTS=3
RESTART_COOLDOWN=60  # seconds

# State tracking
restart_count=0
last_restart_time=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check service health
check_health() {
    # Check if service is running
    if ! systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "${RED}❌ Service $SERVICE_NAME is not running${NC}"
        return 1
    fi

    # Check HTTP accessibility
    if curl -s --connect-timeout 5 --max-time 10 "$HEALTH_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Service healthy - responding on $HEALTH_URL${NC}"
        return 0
    else
        echo -e "${RED}❌ Service running but not responding on $HEALTH_URL${NC}"
        return 1
    fi
}

# Function to restart service
restart_service() {
    local current_time=$(date +%s)

    # Check cooldown period
    if [ $((current_time - last_restart_time)) -lt $RESTART_COOLDOWN ]; then
        echo -e "${YELLOW}⚠️  In cooldown period, skipping restart${NC}"
        return 1
    fi

    # Check max restarts
    if [ $restart_count -ge $MAX_RESTARTS ]; then
        echo -e "${RED}🚨 Maximum restart attempts ($MAX_RESTARTS) reached!${NC}"
        echo -e "${RED}   Manual intervention required${NC}"
        return 1
    fi

    echo -e "${BLUE}🔄 Restarting service $SERVICE_NAME...${NC}"

    if systemctl restart "$SERVICE_NAME"; then
        ((restart_count++))
        last_restart_time=$current_time
        echo -e "${GREEN}✅ Service restarted successfully (attempt $restart_count/$MAX_RESTARTS)${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to restart service${NC}"
        return 1
    fi
}

# Function to reset restart counter after successful period
reset_restart_counter() {
    local current_time=$(date +%s)

    # Reset counter if we've been healthy for 5 minutes
    if [ $((current_time - last_restart_time)) -gt 300 ] && [ $restart_count -gt 0 ]; then
        echo -e "${GREEN}♻️  Resetting restart counter after sustained health${NC}"
        restart_count=0
    fi
}

# Main monitoring loop
echo -e "${BLUE}Starting health monitoring (check every ${CHECK_INTERVAL}s)...${NC}"
echo -e "${BLUE}Press Ctrl+C to stop${NC}"
echo ""

while true; do
    # Get current timestamp for logging
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo -e "${BLUE}[$timestamp] Checking service health...${NC}"

    if ! check_health; then
        echo -e "${RED}[$timestamp] Service unhealthy - attempting recovery...${NC}"

        if restart_service; then
            # Wait a bit after restart before next check
            sleep 10
        else
            echo -e "${RED}[$timestamp] Recovery failed${NC}"
        fi
    else
        reset_restart_counter
    fi

    echo -e "${BLUE}[$timestamp] Next check in ${CHECK_INTERVAL}s${NC}"
    echo ""

    sleep $CHECK_INTERVAL
done