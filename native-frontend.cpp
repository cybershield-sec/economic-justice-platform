#include <iostream>
#include <cstdlib>
#include <string>
#include <thread>
#include <chrono>

// Simple native frontend for Economic Justice Platform
// Uses system commands to provide GUI functionality

class NativeFrontend {
private:
    std::string serverUrl = "http://localhost:8000";

public:
    bool checkServer() {
        return system("curl -s http://localhost:8000 > /dev/null 2>&1") == 0;
    }

    void executeCommand(const std::string& cmd) {
        system(cmd.c_str());
    }

    void showMessage(const std::string& title, const std::string& message) {
        std::string cmd = "kdialog --title \"" + title + "\" --msgbox \"" + message + "\"";
        executeCommand(cmd);
    }

    void showError(const std::string& message) {
        showMessage("Error", message);
    }
    void startServer() {
        if (system("[ -f cpp-server ]") == 0) {
            executeCommand("./cpp-server --daemon &");
            std::this_thread::sleep_for(std::chrono::seconds(2));

            if (checkServer()) {
                showMessage("Server Started", "✅ C++ ASM Server started successfully!\\nAccess: " + serverUrl + "/edit");
            } else {
                showError("❌ Failed to start server");
            }
        } else {
            showError("❌ Server binary not found. Run 'make' first.");
        }
    }

    void stopServer() {
        executeCommand("pkill -f \"cpp-server\"");
        showMessage("Server Stopped", "🛑 Server stopped");
    }

    void openEditor() {
        if (checkServer()) {
            executeCommand("xdg-open " + serverUrl + "/edit");
        } else {
            showError("❌ Server not running. Please start it first.");
        }
    }

    void showStatus() {
        if (checkServer()) {
            showMessage("Server Status", "✅ Server is running\\n📊 Port: 8000\\n🌐 URL: " + serverUrl + "\\n📁 Editor: " + serverUrl + "/edit");
        } else {
            showMessage("Server Status", "❌ Server is not running");
        }
    }

    void runMenu() {
        while (true) {
            std::string choice = "./desktop-frontend.sh"; // Use the bash version for menu
            system(choice.c_str());
            break; // Exit after menu returns
        }
    }
};

int main() {
    NativeFrontend frontend;

    // Check if server is already running
    if (frontend.checkServer()) {
        frontend.showMessage("Welcome", "🌐 Economic Justice Platform\\n✅ Server is already running\\n📁 Access: http://localhost:8000/edit");
    } else {
        frontend.showMessage("Welcome", "🌐 Economic Justice Platform\\n🚀 Starting C++ ASM Server...");
        frontend.startServer();
    }

    // Open the full menu interface
    frontend.runMenu();

    return 0;
}