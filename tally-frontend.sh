#!/bin/bash

# Tally Frontend for Economic Justice Platform
# Simple interface for the tally server on port 8080

SERVER_URL="http://localhost:8080"
TALLY_SERVER="./tally-server"

check_server() {
    # Check if server process is running
    if pgrep -f "tally-server" > /dev/null 2>&1; then
        # Check if server is responding
        if curl -s --connect-timeout 2 "$SERVER_URL/api/tally/status" > /dev/null 2>&1; then
            return 0
        else
            # Server process exists but not responding - might be stuck
            echo "⚠️  Server process found but not responding - cleaning up..."
            stop_server
            return 1
        fi
    else
        return 1
    fi
}

start_server() {
    if [ -f "$TALLY_SERVER" ]; then
        echo "🚀 Starting Tally Server in background..."

        # Start server in daemon mode
        $TALLY_SERVER --daemon --port 8080 > server.log 2>&1 &
        SERVER_PID=$!

        # Wait a moment for server to start
        sleep 3

        # Check if server started successfully
        if check_server; then
            echo "✅ Tally Server started successfully! (PID: $SERVER_PID)"
            echo "🌐 Access: $SERVER_URL"
            echo "⚡ Tally API: $SERVER_URL/api/tally/status"
            echo "📝 Logs: server.log"
            return 0
        else
            echo "❌ Server failed to start. Check server.log for details."
            return 1
        fi
    else
        echo "❌ Tally server binary not found. Run 'make' first."
        return 1
    fi
}

stop_server() {
    echo "🛑 Stopping Tally Server..."
    pkill -f "tally-server"
    echo "✅ Server stopped"
    echo "💡 Note: If running in another terminal, use Ctrl+C to stop it"
}

show_status() {
    echo "📊 Current Tally Status:"
    tally_status=$(curl -s "$SERVER_URL/api/tally/status")
    echo "$tally_status" | python3 -m json.tool

    # Show server stats too
    echo ""
    echo "🌐 Server Statistics:"
    server_stats=$(curl -s "$SERVER_URL/api/server/stats")
    echo "$server_stats" | python3 -m json.tool

    # Explain what the tallies mean
    echo ""
    echo "💡 Tally Algorithm - The King's Reckoning:"
    echo "   User Tally (1): Your individual sovereignty and decision-making power"
    echo "   Network Tally (1): Collective network power and shared resources"
    echo "   Collective Tally (2): Combined sovereignty for unified action"
    echo ""
    echo "🎯 Algorithm Purpose:"
    echo "   • Balance individual autonomy with collective power"
    echo "   • Enable democratic resource allocation decisions"
    echo "   • Create verifiable economic justice transactions"
    echo ""
    echo "🔁 Available Sovereignty Actions:"
    echo "   • Combine: Merge power for collective economic justice action"
    echo "   • Separate: Restore individual control and network autonomy"
}

combine_tallies() {
    echo "⚡ Combining tallies..."
    response=$(curl -s "$SERVER_URL/api/tally/combine")
    echo "$response" | python3 -m json.tool
}

separate_tallies() {
    echo "🔓 Separating tallies..."
    response=$(curl -s "$SERVER_URL/api/tally/separate")
    echo "$response" | python3 -m json.tool
}

show_server_stats() {
    echo "⚙️  Detailed Server Statistics:"
    server_info=$(curl -s "$SERVER_URL/api/server/info")
    echo "$server_info"
}

show_help() {
    echo ""
    echo "❓ TALLY NETWORK HELP & EXPLANATION"
    echo "========================================"
    echo "🎯 The King's Reckoning Algorithm:"
    echo "   This system reimagines economic justice through verifiable tally technology"
    echo "   Each participant starts with 1 User Tally representing individual sovereignty"
    echo "   The network maintains 1 Network Tally representing collective resources"
    echo ""
    echo "⚡ Sovereignty Actions:"
    echo "   • Combine: Merge your tally with the network for collective decision-making"
    echo "   • Separate: Restore individual control while maintaining network integrity"
    echo ""
    echo "🔐 Cryptographic Integrity:"
    echo "   • All transactions are cryptographically signed and verified"
    echo "   • Tally movements create immutable ledger entries"
    echo "   • Network state is transparent and auditable by all participants"
    echo ""
    echo "🌐 Economic Justice Goals:"
    echo "   • Democratize resource allocation decisions"
    echo "   • Balance individual autonomy with collective needs"
    echo "   • Create transparent economic relationships"
    echo "   • Enable community-driven economic justice initiatives"
    echo "========================================"
}

open_browser() {
    echo "🌐 Opening browser..."
    xdg-open "$SERVER_URL" 2>/dev/null || \
    open "$SERVER_URL" 2>/dev/null || \
    echo "Please open: $SERVER_URL"
}

show_menu() {
    echo ""
    echo "========================================"
    echo "        SOVEREIGNTY CONTROL PANEL"
    echo "========================================"
    echo "1. 🚀  Start Tally Network"
    echo "2. 🛑  Stop Tally Network"
    echo "3. 📊  Live Network Status"
    echo "4. ⚡  Combine Sovereignty"
    echo "5. 🔓  Separate Sovereignty"
    echo "6. 🌐  Open Network Portal"
    echo "7. 📖  Read The King's Reckoning"
    echo "8. 🎯  Economic Justice Resources"
    echo "9. 📖  Community Story Platform"
    echo "s. ⚙️  Server Statistics"
    echo "h. ❓ Help & Algorithm Explanation"
    echo "0. ❌ Exit Network"
    echo "========================================"
    echo -n "Choose your action: "
}

main() {
    echo "🌟 ECONOMIC JUSTICE TALLY NETWORK"
    echo "========================================"
    echo "🔧 Interactive Portal for The King's Reckoning"
    echo "📖 Reimagining economic sovereignty through secure tally technology"
    echo ""
    echo "🎯 Mission: Balance individual autonomy with collective power"
    echo "💡 Each user holds 1 tally - representing sovereign decision-making"
    echo "🌐 The network holds 1 tally - representing shared resources"
    echo "⚡ Combine for collective action, Separate for individual control"
    echo "========================================"

    # Auto-start server if not running
    if ! check_server; then
        echo "⚡ Server not detected - attempting to start..."
        if start_server; then
            echo "✅ Server auto-started successfully!"
        else
            echo "❌ Failed to auto-start server. Please build it first with 'make'"
            echo "   Then run './tally-server' manually or use option 1 to start"
        fi
    else
        echo "✅ Server is already running!"
    fi

    while true; do
        show_menu
        # Read input - handle both interactive and piped input
        if [ -t 0 ]; then
            # Interactive mode - read from terminal
            read -r choice
        else
            # Piped input mode
            if ! read -r choice; then
                # If no more piped input, exit gracefully
                echo "No more input - exiting"
                exit 0
            fi
        fi

        # Handle empty input or just Enter key
        if [ -z "$choice" ]; then
            echo "❌ Please enter a valid option"
            sleep 1
            continue
        fi

        case $choice in
            1)
                start_server
                ;;
            2)
                stop_server
                ;;
            3)
                if check_server; then
                    show_status
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            4)
                if check_server; then
                    combine_tallies
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            5)
                if check_server; then
                    separate_tallies
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            6)
                if check_server; then
                    open_browser
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            7)
                if check_server; then
                    xdg-open "$SERVER_URL" 2>/dev/null || open "$SERVER_URL" 2>/dev/null
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            8)
                if check_server; then
                    xdg-open "$SERVER_URL/economic-justice-resources.html" 2>/dev/null || open "$SERVER_URL/economic-justice-resources.html" 2>/dev/null
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            9)
                if check_server; then
                    xdg-open "$SERVER_URL/story-platform.html" 2>/dev/null || open "$SERVER_URL/story-platform.html" 2>/dev/null
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            0)
                echo "👋 Goodbye!"
                exit 0
                ;;
            s|S)
                if check_server; then
                    show_server_stats
                else
                    echo "❌ Server not running. Start it first."
                fi
                ;;
            h|H)
                show_help
                ;;
            *)
                echo "❌ Invalid option"
                ;;
        esac

        echo ""
        echo "Press Enter to continue..."
        if [ -t 0 ]; then
            read -r
        else
            # In piped mode, just continue without waiting
            sleep 1
        fi
    done
}

# Run main function
main