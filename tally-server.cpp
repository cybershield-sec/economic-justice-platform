#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <fstream>
#include <sstream>
#include <regex>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <filesystem>
#include <algorithm>
#include <unordered_map>
#include <openssl/sha.h>
#include <openssl/evp.h>
#include <signal.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <sys/types.h>
#include <pwd.h>
#include <sys/time.h>

// Socket includes for cross-platform compatibility
#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #pragma comment(lib, "ws2_32.lib")
    #define SOCKET_ERROR_CODE WSAGetLastError()
    #define CLOSE_SOCKET closesocket
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #include <netdb.h>
    #define SOCKET_ERROR_CODE errno
    #define CLOSE_SOCKET close
    #define INVALID_SOCKET -1
    #define SOCKET_ERROR -1
#endif

namespace fs = std::filesystem;

// Tally System Core Classes
class TallyLedger {
private:
    struct TallyTransaction {
        std::string hash;
        std::string from;
        std::string to;
        int amount;
        time_t timestamp;
        std::string narrative; // The King's Reckoning story segments
    };

    std::vector<TallyTransaction> ledger;
    std::unordered_map<std::string, int> balances;

public:
    TallyLedger() {
        // Initialize with genesis tallies
        balances["user"] = 1;
        balances["network"] = 1;

        // Add genesis transaction
        TallyTransaction genesis{
            "genesis_hash", "system", "user", 1, time(nullptr), "The King's first tally - sovereignty granted"
        };
        ledger.push_back(genesis);

        TallyTransaction networkGenesis{
            "network_genesis", "system", "network", 1, time(nullptr), "Network tally created - collective power"
        };
        ledger.push_back(networkGenesis);
    }

    bool transfer(const std::string& from, const std::string& to, int amount, const std::string& narrative = "") {
        if (balances[from] < amount) return false;

        std::string hash = generateHash(from + to + std::to_string(amount) + narrative + std::to_string(time(nullptr)));

        TallyTransaction tx{hash, from, to, amount, time(nullptr), narrative};
        ledger.push_back(tx);

        balances[from] -= amount;
        balances[to] += amount;

        return true;
    }

    int getBalance(const std::string& account) {
        return balances[account];
    }

    bool combineTallies() {
        if (balances["user"] == 1 && balances["network"] == 1) {
            // Create combined sovereignty state
            transfer("user", "collective", 1, "Individual sovereignty surrendered for collective power");
            transfer("network", "collective", 1, "Network power merged into collective decision-making");
            return true;
        }
        return false;
    }

    bool separateTallies() {
        if (balances["collective"] == 2) {
            transfer("collective", "user", 1, "Individual sovereignty restored");
            transfer("collective", "network", 1, "Network autonomy reestablished");
            return true;
        }
        return false;
    }

    std::string generateHash(const std::string& data) {
        unsigned char hash[SHA256_DIGEST_LENGTH];
        EVP_MD_CTX* context = EVP_MD_CTX_new();

        if (!context) return "hash_error";

        if (EVP_DigestInit_ex(context, EVP_sha256(), NULL) &&
            EVP_DigestUpdate(context, data.c_str(), data.size()) &&
            EVP_DigestFinal_ex(context, hash, NULL)) {

            std::stringstream ss;
            for(int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
                ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
            }
            EVP_MD_CTX_free(context);
            return ss.str();
        }

        EVP_MD_CTX_free(context);
        return "hash_error";
    }

    std::string getLedgerSummary() const {
        std::stringstream ss;
        ss << "Tally Ledger Summary:\n";
        ss << "User Balance: " << (balances.count("user") ? balances.at("user") : 0) << "\n";
        ss << "Network Balance: " << (balances.count("network") ? balances.at("network") : 0) << "\n";
        ss << "Collective Balance: " << (balances.count("collective") ? balances.at("collective") : 0) << "\n";
        ss << "Total Transactions: " << ledger.size() << "\n";
        return ss.str();
    }
};

class TallyServer {
private:
    int port;
    std::atomic<bool> running;
    std::string rootDir;
    TallyLedger tallyLedger;
    std::string pidFile;
    std::string logFile;
public:
    std::string currentUser;
    time_t startTime;
    std::atomic<int> activeConnections;
    std::unordered_map<std::string, time_t> userSessions;

private:

    #ifdef _WIN32
    SOCKET serverSocket;
    #else
    int serverSocket;
    #endif

    std::string fingerprintContent(const std::string& content, const std::string& path) {
        // Create cryptographic fingerprint of content with tally integration
        std::string fingerprintData = content + path + std::to_string(time(nullptr));
        std::string fingerprint = tallyLedger.generateHash(fingerprintData);

        // Inject fingerprint as HTML comment
        std::string fingerprintedContent = content;
        size_t bodyPos = fingerprintedContent.find("<body");
        if (bodyPos != std::string::npos) {
            size_t bodyEnd = fingerprintedContent.find(">", bodyPos);
            if (bodyEnd != std::string::npos) {
                fingerprintedContent.insert(bodyEnd + 1,
                    "\n<!-- TALLY FINGERPRINT: " + fingerprint + " -->\n"
                    "<!-- SERVED BY: Economic Justice Tally Network -->\n");
            }
        }

        return fingerprintedContent;
    }

    std::string readFile(const std::string& filename) {
        std::ifstream file(filename, std::ios::binary);
        if (!file) return "";

        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());
        return content;
    }

public:
    TallyServer(int port = 8080, const std::string& rootDir = ".")
        : port(port), running(false), rootDir(rootDir), pidFile("/tmp/tally-server.pid"),
          logFile("tally-server.log"), startTime(time(nullptr)), activeConnections(0),
          serverSocket(INVALID_SOCKET) {
        // Get current user
        struct passwd *pw = getpwuid(getuid());
        if (pw) {
            currentUser = pw->pw_name;
        } else {
            currentUser = "unknown";
        }
    }

    ~TallyServer() {
        stop();
    }

    bool writePidFile() {
        std::ofstream pidStream(pidFile);
        if (!pidStream) {
            std::cerr << "Failed to create PID file: " << pidFile << std::endl;
            return false;
        }
        pidStream << getpid() << std::endl;
        return true;
    }

    bool removePidFile() {
        if (fs::exists(pidFile)) {
            return fs::remove(pidFile);
        }
        return true;
    }

    void logMessage(const std::string& message) {
        std::ofstream logStream(logFile, std::ios::app);
        if (logStream) {
            auto now = std::chrono::system_clock::now();
            auto now_time = std::chrono::system_clock::to_time_t(now);
            logStream << std::put_time(std::localtime(&now_time), "%Y-%m-%d %H:%M:%S")
                     << " [" << currentUser << "] " << message << std::endl;
        }
    }

    std::string getUptime() const {
        time_t now = time(nullptr);
        time_t uptime = now - startTime;

        int days = uptime / 86400;
        int hours = (uptime % 86400) / 3600;
        int minutes = (uptime % 3600) / 60;
        int seconds = uptime % 60;

        std::stringstream ss;
        if (days > 0) ss << days << "d ";
        if (hours > 0) ss << hours << "h ";
        if (minutes > 0) ss << minutes << "m ";
        ss << seconds << "s";

        return ss.str();
    }

    std::string getServerStats() const {
        std::stringstream ss;
        ss << "👤 User: " << currentUser << "\n"
           << "⏰ Uptime: " << getUptime() << "\n"
           << "🔌 Active Connections: " << activeConnections << "\n"
           << "👥 Active Sessions: " << userSessions.size() << "\n"
           << "📊 " << tallyLedger.getLedgerSummary();
        return ss.str();
    }

    bool start(bool daemonMode = false) {
        if (daemonMode) {
            // Simple daemon mode - just run in background without forking complexities
            // Proper daemonization would require more complex handling
            logMessage("Tally Server started in background mode");
        }

        #ifdef _WIN32
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
            std::cerr << "WSAStartup failed" << std::endl;
            return false;
        }
        #endif

        serverSocket = socket(AF_INET, SOCK_STREAM, 0);
        if (serverSocket == INVALID_SOCKET) {
            std::cerr << "Socket creation failed: " << SOCKET_ERROR_CODE << std::endl;
            return false;
        }

        // Set socket options
        int opt = 1;
        #ifdef _WIN32
        setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));
        #else
        setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
        #endif

        sockaddr_in serverAddr;
        serverAddr.sin_family = AF_INET;
        serverAddr.sin_addr.s_addr = INADDR_ANY;
        serverAddr.sin_port = htons(port);

        if (bind(serverSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
            std::cerr << "Bind failed: " << SOCKET_ERROR_CODE << std::endl;
            CLOSE_SOCKET(serverSocket);
            return false;
        }

        if (listen(serverSocket, 10) == SOCKET_ERROR) {
            std::cerr << "Listen failed: " << SOCKET_ERROR_CODE << std::endl;
            CLOSE_SOCKET(serverSocket);
            return false;
        }

        running = true;

        if (!daemonMode) {
            std::cout << "🚀 Tally Server started on port " << port << std::endl;
            std::cout << "📁 Serving from: " << fs::absolute(rootDir) << std::endl;
            std::cout << "🌐 Access: http://localhost:" << port << std::endl;
            std::cout << "👤 Running as: " << currentUser << std::endl;
            std::cout << tallyLedger.getLedgerSummary() << std::endl;
            std::cout << "⏹️  Press Ctrl+C to stop" << std::endl;
        }

        // Setup signal handlers
        setupSignalHandlers();

        logMessage("Server started on port " + std::to_string(port));

        return true;
    }

    void setupSignalHandlers() {
        signal(SIGINT, [](int sig) {
            std::cout << "\n🛑 Received shutdown signal..." << std::endl;
            // Clean shutdown will be handled in main()
            exit(0);
        });

        signal(SIGTERM, [](int sig) {
            // Log will be written by the destructor
            exit(0);
        });

        signal(SIGHUP, [](int sig) {
            // Could implement config reload here
        });
    }

    void run() {
        while (running) {
            sockaddr_in clientAddr;
            #ifdef _WIN32
            int clientAddrLen = sizeof(clientAddr);
            #else
            socklen_t clientAddrLen = sizeof(clientAddr);
            #endif

            #ifdef _WIN32
            SOCKET clientSocket = accept(serverSocket, (sockaddr*)&clientAddr, &clientAddrLen);
            #else
            int clientSocket = accept(serverSocket, (sockaddr*)&clientAddr, &clientAddrLen);
            #endif

            if (clientSocket == INVALID_SOCKET) {
                if (running) {
                    std::cerr << "Accept failed: " << SOCKET_ERROR_CODE << std::endl;
                }
                continue;
            }

            // Handle client in a separate thread
            std::thread([this, clientSocket]() {
                handleClient(clientSocket);
                CLOSE_SOCKET(clientSocket);
            }).detach();
        }
    }

    void stop() {
        if (!running) return;

        running = false;
        logMessage("Server shutting down");

        if (serverSocket != INVALID_SOCKET) {
            CLOSE_SOCKET(serverSocket);
            serverSocket = INVALID_SOCKET;
        }

        // Cleanup PID file
        removePidFile();

        #ifdef _WIN32
        WSACleanup();
        #endif

        logMessage("Server stopped successfully");
    }

private:
    void handleClient(int clientSocket) {
        activeConnections++;

        char buffer[4096];
        int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);

        // Track user session based on IP
        sockaddr_in clientAddr;
        socklen_t clientAddrLen = sizeof(clientAddr);
        getpeername(clientSocket, (sockaddr*)&clientAddr, &clientAddrLen);
        std::string clientIP = inet_ntoa(clientAddr.sin_addr);
        userSessions[clientIP] = time(nullptr);

        if (bytesReceived <= 0) {
            return;
        }

        buffer[bytesReceived] = '\0';
        std::string request(buffer);

        // Parse HTTP request
        std::string method, path, httpVersion;
        std::istringstream requestStream(request);
        requestStream >> method >> path >> httpVersion;

        // Handle API endpoints
        if (path == "/api/tally/combine") {
            if (tallyLedger.combineTallies()) {
                sendResponse(clientSocket, "200 OK", "application/json",
                    "{\"status\":\"success\",\"message\":\"Tallies combined - collective sovereignty activated\"}");
            } else {
                sendResponse(clientSocket, "400 Bad Request", "application/json",
                    "{\"status\":\"error\",\"message\":\"Cannot combine tallies\"}");
            }
            return;
        }
        else if (path == "/api/tally/separate") {
            if (tallyLedger.separateTallies()) {
                sendResponse(clientSocket, "200 OK", "application/json",
                    "{\"status\":\"success\",\"message\":\"Tallies separated - individual sovereignty restored\"}");
            } else {
                sendResponse(clientSocket, "400 Bad Request", "application/json",
                    "{\"status\":\"error\",\"message\":\"Cannot separate tallies\"}");
            }
            return;
        }
        else if (path == "/api/tally/status") {
            sendResponse(clientSocket, "200 OK", "application/json",
                "{\"user\":" + std::to_string(tallyLedger.getBalance("user")) +
                ",\"network\":" + std::to_string(tallyLedger.getBalance("network")) +
                ",\"collective\":" + std::to_string(tallyLedger.getBalance("collective")) + "}");
            return;
        }
        else if (path == "/api/server/stats") {
            sendResponse(clientSocket, "200 OK", "application/json",
                "{\"user\":\"" + currentUser + "\"" +
                ",\"uptime\":\"" + getUptime() + "\"" +
                ",\"active_connections\":" + std::to_string(activeConnections) +
                ",\"active_sessions\":" + std::to_string(userSessions.size()) + "}");
            return;
        }
        else if (path == "/api/server/info") {
            std::string stats = getServerStats();
            sendResponse(clientSocket, "200 OK", "text/plain", stats);
            return;
        }

        // Default to index.html if root path
        if (path == "/") {
            path = "/index.html";
        }

        // Remove query parameters
        size_t queryPos = path.find('?');
        if (queryPos != std::string::npos) {
            path = path.substr(0, queryPos);
        }

        // Security: Prevent directory traversal
        if (path.find("..") != std::string::npos) {
            sendError(clientSocket, 403, "Forbidden");
            return;
        }

        // Serve file with tally fingerprinting
        if (method == "GET") {
            serveFile(clientSocket, path);
        } else {
            sendError(clientSocket, 405, "Method Not Allowed");
        }

        // Cleanup connection tracking
        activeConnections--;
    }

    void serveFile(int clientSocket, const std::string& path) {
        std::string fullPath = rootDir + path;

        if (!fs::exists(fullPath)) {
            sendError(clientSocket, 404, "Not Found");
            return;
        }

        // Determine content type
        std::string contentType = "text/plain";
        std::string extension = fs::path(fullPath).extension().string();

        if (extension == ".html") contentType = "text/html";
        else if (extension == ".css") contentType = "text/css";
        else if (extension == ".js") contentType = "application/javascript";
        else if (extension == ".json") contentType = "application/json";
        else if (extension == ".png") contentType = "image/png";
        else if (extension == ".jpg" || extension == ".jpeg") contentType = "image/jpeg";
        else if (extension == ".gif") contentType = "image/gif";
        else if (extension == ".svg") contentType = "image/svg+xml";

        // Read file content
        std::string content = readFile(fullPath);
        if (content.empty()) {
            sendError(clientSocket, 500, "Internal Server Error");
            return;
        }

        // Apply tally fingerprint to HTML content
        if (extension == ".html") {
            content = fingerprintContent(content, path);
        }

        // Send HTTP response
        sendResponse(clientSocket, "200 OK", contentType, content);
    }

    void sendResponse(int clientSocket, const std::string& status, const std::string& contentType, const std::string& content) {
        std::string response = "HTTP/1.1 " + status + "\r\n"
                             "Content-Type: " + contentType + "; charset=utf-8\r\n"
                             "Content-Length: " + std::to_string(content.size()) + "\r\n"
                             "Connection: close\r\n"
                             "\r\n" + content;

        send(clientSocket, response.c_str(), response.size(), 0);
    }

    void sendError(int clientSocket, int code, const std::string& message) {
        std::string response = "HTTP/1.1 " + std::to_string(code) + " " + message + "\r\n"
                             "Content-Type: text/plain; charset=utf-8\r\n"
                             "Connection: close\r\n"
                             "\r\n" + message;

        send(clientSocket, response.c_str(), response.size(), 0);
    }
};

int main(int argc, char* argv[]) {
    bool daemonMode = false;
    int port = 8080;
    std::string rootDir = ".";

    // Parse command line arguments
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--daemon" || arg == "-d") {
            daemonMode = true;
        } else if (arg == "--port" || arg == "-p") {
            if (i + 1 < argc) {
                port = std::stoi(argv[++i]);
            }
        } else if (arg == "--root" || arg == "-r") {
            if (i + 1 < argc) {
                rootDir = argv[++i];
            }
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "Economic Justice Tally Server Usage:" << std::endl;
            std::cout << "  --daemon, -d    Run as daemon" << std::endl;
            std::cout << "  --port, -p PORT Set server port (default: 8080)" << std::endl;
            std::cout << "  --root, -r DIR  Set root directory (default: .)" << std::endl;
            std::cout << "  --help, -h      Show this help" << std::endl;
            return 0;
        }
    }

    if (!daemonMode) {
        std::cout << "🔧 Building Economic Justice Tally Server..." << std::endl;
        std::cout << "📖 Reimagining The King's Reckoning as secure tally network\n" << std::endl;
    }

    TallyServer server(port, rootDir);

    if (!server.start(daemonMode)) {
        std::cerr << "❌ Failed to start tally server" << std::endl;
        return 1;
    }

    // Run server in background thread
    std::thread serverThread([&server]() {
        server.run();
    });

    if (!daemonMode) {
        std::cout << "✅ Tally Server ready!" << std::endl;
        std::cout << "🌐 Access: http://localhost:" << port << std::endl;
        std::cout << "⚡ Tally API: http://localhost:" << port << "/api/tally/status" << std::endl;
        std::cout << "📊 Server Info: http://localhost:" << port << "/api/server/info" << std::endl;
        std::cout << "\n💡 Interactive Commands:" << std::endl;
        std::cout << "  status  - Show server status" << std::endl;
        std::cout << "  stats   - Show detailed statistics" << std::endl;
        std::cout << "  stop    - Stop the server" << std::endl;
        std::cout << "  help    - Show this help" << std::endl;
        std::cout << "\nType 'help' for more commands or press Enter to stop..." << std::endl;

        // Interactive command loop
        std::string command;
        while (true) {
            std::cout << "\n🤖 tally> ";
            std::getline(std::cin, command);

            if (command.empty() || command == "exit" || command == "quit" || command == "stop") {
                break;
            } else if (command == "status") {
                std::cout << server.getServerStats() << std::endl;
            } else if (command == "stats") {
                std::cout << "📈 Server Statistics:" << std::endl;
                std::cout << "👤 User: " << server.currentUser << std::endl;
                std::cout << "⏰ Uptime: " << server.getUptime() << std::endl;
                std::cout << "🔌 Active Connections: " << server.activeConnections << std::endl;
                std::cout << "👥 Active Sessions: " << server.userSessions.size() << std::endl;
            } else if (command == "help") {
                std::cout << "\n📖 Available Commands:" << std::endl;
                std::cout << "  status    - Show server status and tally information" << std::endl;
                std::cout << "  stats     - Show detailed server statistics" << std::endl;
                std::cout << "  stop/exit - Stop the server gracefully" << std::endl;
                std::cout << "  help      - Show this help message" << std::endl;
            } else {
                std::cout << "❌ Unknown command: " << command << std::endl;
                std::cout << "💡 Type 'help' for available commands" << std::endl;
            }
        }

        server.stop();
        if (serverThread.joinable()) {
            serverThread.join();
        }

        std::cout << "🛑 Tally Server stopped" << std::endl;
    } else {
        // Daemon mode - run the server directly in this thread
        std::cout << "✅ Tally Server running in background mode on port " << port << std::endl;
        std::cout << "📝 Logs: tally-server.log" << std::endl;
        server.run(); // Run server in foreground for daemon mode
    }

    return 0;
}