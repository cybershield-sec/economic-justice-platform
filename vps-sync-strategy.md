# Multi-VPS Deployment Synchronization Strategy

## 🎯 Deployment Philosophy: Single Source of Truth

**Centralized Development → Synchronized Deployment**
- One primary development VPS (VPS-1)
- Two production VPS nodes in different countries
- All changes originate from primary, sync to others
- Prevents divergent evolution and configuration drift

## 🔄 Synchronization Architecture

### 1. Primary Node (VPS-1 - Development/Staging)
- **Role**: Source of truth, development, testing
- **Location**: Primary development environment
- **Sync Direction**: Primary → Secondaries

### 2. Secondary Nodes (VPS-2, VPS-3 - Production)
- **Role**: Redundant production deployment
- **Location**: Different geographic regions
- **Sync Direction**: Receive updates from primary

## 🛠️ Synchronization Methods

### Method A: Git-based Synchronization (Recommended)
```bash
# On each VPS
cd /home/cybersage/Revolution/economic-justice-platform
git pull origin main
npm run deploy-service  # Redeploy updated service
```

### Method B: RSync for Direct File Sync
```bash
# From primary to secondaries
rsync -avz --delete \
  /home/cybersage/Revolution/economic-justice-platform/ \
  user@vps2:/home/cybersage/Revolution/economic-justice-platform/
```

### Method C: Deployment Script Automation
```bash
# deploy-to-all.sh
#!/bin/bash
VPS_NODES=("vps2" "vps3")

for vps in "${VPS_NODES[@]}"; do
  rsync -avz --delete ./ "cybersage@$vps:Revolution/economic-justice-platform/"
  ssh "cybersage@$vps" "cd Revolution/economic-justice-platform && ./deploy-service.sh"
done
```

## 📋 Deployment Checklist

### Pre-Deployment (All VPS)
- [ ] Tailscale installed and connected
- [ ] Python 3.8+ installed
- [ ] Systemd available
- [ ] Firewall configured (allow port 8000)
- [ ] User 'cybersage' created with appropriate permissions

### Initial Setup (Each VPS)
```bash
# 1. Clone repository (or copy files)
git clone <repository> /home/cybersage/Revolution/economic-justice-platform

# 2. Deploy service
cd /home/cybersage/Revolution/economic-justice-platform
sudo ./deploy-service.sh

# 3. Verify service
systemctl status economic-justice
journalctl -u economic-justice -f
```

### Ongoing Synchronization
```bash
# On primary VPS (after changes)
./deploy-to-all.sh

# Or manually on each secondary
cd /home/cybersage/Revolution/economic-justice-platform
git pull
sudo systemctl restart economic-justice
```

## 🚨 Risk Mitigation

### Preventing Divergence
1. **Single Source**: All changes must go through primary VPS
2. **Automated Sync**: Regular synchronization scripts
3. **Configuration Management**: Identical environment setup
4. **Monitoring**: Health checks across all nodes

### Rollback Strategy
1. **Git Tags**: Versioned deployments
2. **Backup Snapshots**: Regular VPS snapshots
3. **Quick Rollback**: Script to revert to previous version

## 📊 Health Monitoring

### Service Health Check
```bash
# Check if service is running
curl -s http://localhost:8000/api/health > /dev/null && echo "Healthy" || echo "Down"

# Check Tailscale connectivity
tailscale status | grep -q "100." && echo "Tailscale OK" || echo "Tailscale Issue"
```

### Automated Monitoring Script
```bash
#!/bin/bash
# health-check.sh

SERVICE="economic-justice"
HEALTH_URL="http://localhost:8000/api/health"

# Check service status
if ! systemctl is-active --quiet "$SERVICE"; then
    echo "❌ Service $SERVICE is not running"
    systemctl restart "$SERVICE"
    exit 1
fi

# Check health endpoint
if ! curl -s --connect-timeout 5 "$HEALTH_URL" > /dev/null; then
    echo "❌ Health check failed for $SERVICE"
    systemctl restart "$SERVICE"
    exit 1
fi

echo "✅ $SERVICE is healthy"
exit 0
```

## 🔒 Security Considerations

- **Tailscale ACLs**: Restrict access to VPN only
- **Service User**: Run as non-root user
- **Firewall Rules**: Only allow necessary ports
- **Regular Updates**: Keep system and dependencies updated

## 🚀 Quick Start for New VPS

1. **Install Tailscale** and join network
2. **Clone repository** to standard location
3. **Run deploy-service.sh** as root
4. **Verify service** is running and accessible
5. **Add to sync rotation** in deployment scripts

This strategy ensures all VPS nodes remain synchronized with identical configurations, preventing the risky parallel evolution you mentioned.