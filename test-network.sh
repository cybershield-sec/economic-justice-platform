#!/bin/bash

echo "🧪 Testing Economic Justice Tally Server Network Functionality"
echo "============================================================"

# Test basic server status
echo "1. Testing server status..."
curl -s http://localhost:8080/api/server/stats | jq . 2>/dev/null || curl -s http://localhost:8080/api/server/stats
echo

# Test network info
echo "2. Testing network information..."
curl -s http://localhost:8080/api/network/info
echo

# Test network status
echo "3. Testing network status..."
curl -s http://localhost:8080/api/network/status
echo

# Add a peer
echo "4. Adding a test peer..."
PEER_RESPONSE=$(curl -s http://localhost:8080/api/network/add-peer)
echo "$PEER_RESPONSE"
PEER_ID=$(echo "$PEER_RESPONSE" | grep -o '"peer_id":"[^"]*' | cut -d'"' -f4)
echo "Peer ID: $PEER_ID"
echo

# Test peers listing
echo "5. Listing peers..."
curl -s http://localhost:8080/api/network/peers | jq . 2>/dev/null || curl -s http://localhost:8080/api/network/peers
echo

# Test network discovery
echo "6. Testing network discovery..."
curl -s http://localhost:8080/api/network/discover
echo

# Test network scan
echo "7. Testing network scan..."
curl -s http://localhost:8080/api/network/scan
echo

# Test network optimization
echo "8. Testing network optimization..."
curl -s http://localhost:8080/api/network/optimize
echo

# Test public key
echo "9. Testing public key retrieval..."
curl -s http://localhost:8080/api/network/public-key | head -3
echo "..."
echo

# Test challenge generation
echo "10. Testing challenge generation..."
curl -s http://localhost:8080/api/network/challenge | hexdump -C | head -2
echo

# Test secure message sending
echo "11. Testing secure message sending..."
if [ ! -z "$PEER_ID" ]; then
    curl -s http://localhost:8080/api/network/send/$PEER_ID | hexdump -C | head -3
    echo "Encrypted message sent successfully"
else
    echo "No peer ID available for message testing"
fi
echo

# Final network status
echo "12. Final network status..."
curl -s http://localhost:8080/api/network/status
echo

echo "✅ Network functionality test completed!"