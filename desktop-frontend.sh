#!/bin/bash
# Economic Justice Platform Desktop Frontend
# Native GUI interface for the C++ ASM Server

SERVER_URL="http://localhost:8000"
SERVER_PID=""

# Function to check if server is running
check_server() {
    if curl -s "$SERVER_URL" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start server
start_server() {
    if [ -f "cpp-server" ]; then
        ./cpp-server --daemon &
        SERVER_PID=$!
        sleep 2
        if check_server; then
            kdialog --title "Server Started" --msgbox "✅ C++ ASM Server started successfully!\nAccess: $SERVER_URL/edit"
        else
            kdialog --title "Error" --error "❌ Failed to start server"
        fi
    else
        kdialog --title "Error" --error "❌ Server binary not found. Run 'make' first."
    fi
}

# Function to stop server
stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    pkill -f "cpp-server"
    kdialog --title "Server Stopped" --msgbox "🛑 Server stopped"
}

# Function to open editor in default browser
open_editor() {
    if check_server; then
        xdg-open "$SERVER_URL/edit"
    else
        kdialog --title "Error" --error "❌ Server not running. Please start it first."
    fi
}

# Function to view server status
view_status() {
    if check_server; then
        kdialog --title "Server Status" --msgbox "✅ Server is running\n📊 Port: 8000\n🌐 URL: $SERVER_URL\n📁 Editor: $SERVER_URL/edit"
    else
        kdialog --title "Server Status" --msgbox "❌ Server is not running"
    fi
}

# Function to edit file directly
edit_file() {
    local files=$(find . -name "*.html" -o -name "*.css" -o -name "*.js" -o -name "*.txt" | head -10)
    local file=$(kdialog --title "Select File" --menu "Choose file to edit:" \
        "index.html" "Main Story" \
        "economic-justice-resources.html" "Resources" \
        "story-platform.html" "Story Platform" \
        "multi-agent-chat.html" "AI Chat" \
        "other" "Other file...")

    if [ "$file" = "other" ]; then
        file=$(kdialog --title "Select File" --getopenfilename . "*.html *.css *.js *.txt")
    fi

    if [ -n "$file" ] && [ -f "$file" ]; then
        kdialog --title "Edit File" --textbox "$file" --geometry 800x600
    fi
}

# Main menu
while true; do
    choice=$(kdialog --title "Economic Justice Platform" --menu "Choose an option:" \
        "status" "📊 Check Server Status" \
        "start" "🚀 Start Server" \
        "stop" "🛑 Stop Server" \
        "editor" "📝 Open Web Editor" \
        "edit" "✏️ Edit File Directly" \
        "exit" "🚪 Exit")

    case $choice in
        "status")
            view_status
            ;;
        "start")
            start_server
            ;;
        "stop")
            stop_server
            ;;
        "editor")
            open_editor
            ;;
        "edit")
            edit_file
            ;;
        "exit")
            kdialog --title "Goodbye" --msgbox "Thank you for using Economic Justice Platform!"
            exit 0
            ;;
        *)
            exit 0
            ;;
    esac
done