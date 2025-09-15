#!/bin/bash

# Tally Server Startup Wrapper
# Handles background execution of the tally server

TALLY_SERVER="./tally-server"
LOG_FILE="server.log"

if [ ! -f "$TALLY_SERVER" ]; then
    echo "❌ Tally server binary not found. Run 'make' first."
    exit 1
fi

# Check if server is already running by testing the port
if curl -s http://localhost:8080/api/tally/status > /dev/null 2>&1; then
    echo "✅ Tally Server is already running"
    exit 0
fi

echo "🚀 Starting Tally Server in background..."

# Use daemon mode with proper background execution
$TALLY_SERVER --daemon < /dev/null > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "📊 Server started with PID: $SERVER_PID"
echo "📝 Logs: $LOG_FILE"

# Wait a moment for server to initialize
sleep 3

# Check if server is running by testing the port
if curl -s http://localhost:8080/api/tally/status > /dev/null 2>&1; then
    echo "✅ Tally Server started successfully!"
    echo "🌐 Access: http://localhost:8080"
    echo "⚡ Tally API: http://localhost:8080/api/tally/status"
else
    echo "❌ Server failed to start. Check $LOG_FILE for details."
    exit 1
fi

exit 0