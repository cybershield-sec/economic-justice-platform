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

class CPPHTTPServer {
private:
    int port;
    std::atomic<bool> running;
    std::string rootDir;

    #ifdef _WIN32
    SOCKET serverSocket;
    #else
    int serverSocket;
    #endif

    // Caesar cipher encryption/decryption methods
    std::string caesarEncrypt(const std::string& text, int shift = 6) {
        std::string result;
        for (char c : text) {
            if (isalpha(c)) {
                char base = islower(c) ? 'a' : 'A';
                c = (c - base + shift) % 26 + base;
            } else if (isdigit(c)) {
                // Handle negative modulo for digits
                int digit = c - '0';
                digit = (digit + shift) % 10;
                if (digit < 0) digit += 10;
                c = '0' + digit;
            }
            // Leave other characters unchanged
            result += c;
        }
        return result;
    }

    std::string caesarDecrypt(const std::string& text, int shift = 6) {
        std::string result;
        for (char c : text) {
            if (isalpha(c)) {
                char base = islower(c) ? 'a' : 'A';
                c = (c - base - shift + 26) % 26 + base;
            } else if (isdigit(c)) {
                // Handle negative modulo for digits
                int digit = c - '0';
                digit = (digit - shift) % 10;
                if (digit < 0) digit += 10;
                c = '0' + digit;
            }
            // Leave other characters unchanged
            result += c;
        }
        return result;
    }

    // File operations with encryption
    std::string readEncryptedFile(const std::string& filename) {
        std::ifstream file(filename, std::ios::binary);
        if (!file) return "";

        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());

        // Auto-detect if content is encrypted (look for common patterns)
        if (content.size() > 10 && content.find(' ') == std::string::npos) {
            // Likely encrypted, decrypt it
            return caesarDecrypt(content);
        }
        return content;
    }

    bool writeEncryptedFile(const std::string& filename, const std::string& content) {
        std::ofstream file(filename, std::ios::binary);
        if (!file) return false;

        std::string encrypted = caesarEncrypt(content);
        file.write(encrypted.c_str(), encrypted.size());
        return true;
    }

public:
    CPPHTTPServer(int port = 8000, const std::string& rootDir = ".")
        : port(port), running(false), rootDir(rootDir), serverSocket(INVALID_SOCKET) {}

    ~CPPHTTPServer() {
        stop();
    }

    bool start() {
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
        std::cout << "🚀 C++ ASM Server started on port " << port << std::endl;
        std::cout << "📁 Serving from: " << fs::absolute(rootDir) << std::endl;
        std::cout << "🌐 Access: http://localhost:" << port << std::endl;
        std::cout << "⏹️  Press Ctrl+C to stop" << std::endl;

        return true;
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
        running = false;
        if (serverSocket != INVALID_SOCKET) {
            CLOSE_SOCKET(serverSocket);
            serverSocket = INVALID_SOCKET;
        }
        #ifdef _WIN32
        WSACleanup();
        #endif
    }

private:
    void handleClient(int clientSocket) {
        char buffer[4096];
        int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);

        if (bytesReceived <= 0) {
            return;
        }

        buffer[bytesReceived] = '\0';
        std::string request(buffer);

        // Parse HTTP request
        std::string method, path, httpVersion;
        std::istringstream requestStream(request);
        requestStream >> method >> path >> httpVersion;

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

        // Serve file or handle special routes
        if (method == "GET") {
            if (path == "/edit") {
                serveEditor(clientSocket);
            } else if (path == "/api/files") {
                listFiles(clientSocket);
            } else {
                serveFile(clientSocket, path);
            }
        } else if (method == "POST" && path == "/api/save") {
            handleSave(clientSocket, request);
        } else {
            sendError(clientSocket, 405, "Method Not Allowed");
        }
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

        // Read file content with encryption support
        std::string content = readEncryptedFile(fullPath);
        if (content.empty()) {
            sendError(clientSocket, 500, "Internal Server Error");
            return;
        }

        // Send HTTP response
        std::string response = "HTTP/1.1 200 OK\r\n"
                             "Content-Type: " + contentType + "; charset=utf-8\r\n"
                             "Content-Length: " + std::to_string(content.size()) + "\r\n"
                             "Connection: close\r\n"
                             "\r\n" + content;

        send(clientSocket, response.c_str(), response.size(), 0);
    }

    void serveEditor(int clientSocket) {
        std::string editorHtml =
            "<!DOCTYPE html>\n"
            "<html>\n"
            "<head>\n"
            "    <title>C++ ASM Editor</title>\n"
            "    <style>\n"
            "        body { font-family: monospace; margin: 0; padding: 20px; background: #f0f0f0; }\n"
            "        .editor {\n"
            "            width: 100%;\n"
            "            height: 400px;\n"
            "            border: 1px solid #ccc;\n"
            "            padding: 10px;\n"
            "            font-family: monospace;\n"
            "            font-size: 14px;\n"
            "            background: white;\n"
            "        }\n"
            "        .toolbar { margin-bottom: 10px; }\n"
            "        button {\n"
            "            padding: 8px 16px;\n"
            "            margin-right: 10px;\n"
            "            background: #007acc;\n"
            "            color: white;\n"
            "            border: none;\n"
            "            cursor: pointer;\n"
            "        }\n"
            "        button:hover { background: #005a9e; }\n"
            "        .file-list {\n"
            "            margin-top: 20px;\n"
            "            border: 1px solid #ccc;\n"
            "            padding: 10px;\n"
            "            background: white;\n"
            "        }\n"
            "    </style>\n"
            "</head>\n"
            "<body>\n"
            "    <h1>C++ ASM Browser/Editor</h1>\n"
            "\n"
            "    <div class=\"toolbar\">\n"
            "        <button onclick=\"loadFile()\">Load File</button>\n"
            "        <button onclick=\"saveFile()\">Save File</button>\n"
            "        <select id=\"fileSelector\" onchange=\"loadSelectedFile()\">\n"
            "            <option value=\"\">Select a file...</option>\n"
            "        </select>\n"
            "    </div>\n"
            "\n"
            "    <textarea id=\"editor\" class=\"editor\" placeholder=\"Select a file to edit...\"></textarea>\n"
            "\n"
            "    <div class=\"file-list\">\n"
            "        <h3>Project Files:</h3>\n"
            "        <div id=\"fileList\"></div>\n"
            "    </div>\n"
            "\n"
            "    <script>\n"
            "        async function loadFileList() {\n"
            "            try {\n"
            "                const response = await fetch('/api/files');\n"
            "                const files = await response.json();\n"
            "\n"
            "                const fileList = document.getElementById('fileList');\n"
            "                const selector = document.getElementById('fileSelector');\n"
            "\n"
            "                fileList.innerHTML = '';\n"
            "                selector.innerHTML = '<option value=\"\">Select a file...</option>';\n"
            "\n"
            "                files.forEach(file => {\n"
            "                    // Add to file list display\n"
            "                    const fileItem = document.createElement('div');\n"
            "                    fileItem.textContent = file;\n"
            "                    fileItem.style.cursor = 'pointer';\n"
            "                    fileItem.style.padding = '5px';\n"
            "                    fileItem.onclick = () => loadFile(file);\n"
            "                    fileItem.onmouseover = () => fileItem.style.background = '#eee';\n"
            "                    fileItem.onmouseout = () => fileItem.style.background = 'transparent';\n"
            "                    fileList.appendChild(fileItem);\n"
            "\n"
            "                    // Add to dropdown\n"
            "                    const option = document.createElement('option');\n"
            "                    option.value = file;\n"
            "                    option.textContent = file;\n"
            "                    selector.appendChild(option);\n"
            "                });\n"
            "            } catch (error) {\n"
            "                console.error('Error loading file list:', error);\n"
            "            }\n"
            "        }\n"
            "\n"
            "        async function loadFile(filename) {\n"
            "            if (!filename) {\n"
            "                filename = document.getElementById('fileSelector').value;\n"
            "            }\n"
            "\n"
            "            if (!filename) return;\n"
            "\n"
            "            try {\n"
            "                const response = await fetch(filename);\n"
            "                const content = await response.text();\n"
            "                document.getElementById('editor').value = content;\n"
            "            } catch (error) {\n"
            "                console.error('Error loading file:', error);\n"
            "                alert('Error loading file: ' + error);\n"
            "            }\n"
            "        }\n"
            "\n"
            "        async function saveFile() {\n"
            "            const filename = document.getElementById('fileSelector').value;\n"
            "            const content = document.getElementById('editor').value;\n"
            "\n"
            "            if (!filename) {\n"
            "                alert('Please select a file first');\n"
            "                return;\n"
            "            }\n"
            "\n"
            "            try {\n"
            "                const response = await fetch('/api/save', {\n"
            "                    method: 'POST',\n"
            "                    headers: { 'Content-Type': 'application/json' },\n"
            "                    body: JSON.stringify({ filename, content })\n"
            "                });\n"
            "\n"
            "                if (response.ok) {\n"
            "                    alert('File saved successfully');\n"
            "                } else {\n"
            "                    alert('Error saving file');\n"
            "                }\n"
            "            } catch (error) {\n"
            "                console.error('Error saving file:', error);\n"
            "                alert('Error saving file: ' + error);\n"
            "            }\n"
            "        }\n"
            "\n"
            "        function loadSelectedFile() {\n"
            "            loadFile();\n"
            "        }\n"
            "\n"
            "        // Load file list on page load\n"
            "        loadFileList();\n"
            "    </script>\n"
            "</body>\n"
            "</html>";

        std::string response = "HTTP/1.1 200 OK\r\n"
                             "Content-Type: text/html; charset=utf-8\r\n"
                             "Content-Length: " + std::to_string(editorHtml.size()) + "\r\n"
                             "Connection: close\r\n"
                             "\r\n" + editorHtml;

        send(clientSocket, response.c_str(), response.size(), 0);
    }

    void listFiles(int clientSocket) {
        std::vector<std::string> files;

        try {
            for (const auto& entry : fs::recursive_directory_iterator(rootDir)) {
                if (entry.is_regular_file()) {
                    std::string path = entry.path().string();
                    // Convert to web path
                    if (path.find(rootDir) == 0) {
                        path = path.substr(rootDir.size());
                        // Convert backslashes to forward slashes on Windows
                        std::replace(path.begin(), path.end(), '\\', '/');
                        files.push_back(path);
                    }
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "Error listing files: " << e.what() << std::endl;
        }

        // Create JSON response
        std::string json = "[";
        for (size_t i = 0; i < files.size(); ++i) {
            if (i > 0) json += ",";
            json += "\"" + files[i] + "\"";
        }
        json += "]";

        std::string response = "HTTP/1.1 200 OK\r\n"
                             "Content-Type: application/json; charset=utf-8\r\n"
                             "Content-Length: " + std::to_string(json.size()) + "\r\n"
                             "Connection: close\r\n"
                             "\r\n" + json;

        send(clientSocket, response.c_str(), response.size(), 0);
    }

    void handleSave(int clientSocket, const std::string& request) {
        // Extract JSON body
        size_t bodyPos = request.find("\r\n\r\n");
        if (bodyPos == std::string::npos) {
            sendError(clientSocket, 400, "Bad Request");
            return;
        }

        std::string body = request.substr(bodyPos + 4);

        // Simple JSON parsing (for demonstration)
        size_t filenamePos = body.find("\"filename\":\"");
        size_t contentPos = body.find("\"content\":\"");

        if (filenamePos == std::string::npos || contentPos == std::string::npos) {
            sendError(clientSocket, 400, "Invalid JSON");
            return;
        }

        filenamePos += 11; // Skip "filename":"
        size_t filenameEnd = body.find('"', filenamePos);
        std::string filename = body.substr(filenamePos, filenameEnd - filenamePos);

        contentPos += 9; // Skip "content":"
        size_t contentEnd = body.find('"', contentPos);
        std::string content = body.substr(contentPos, contentEnd - contentPos);

        // Security check
        if (filename.find("..") != std::string::npos) {
            sendError(clientSocket, 403, "Forbidden");
            return;
        }

        std::string fullPath = rootDir + "/" + filename;

        try {
            // Create directory if needed
            fs::path filePath(fullPath);
            fs::create_directories(filePath.parent_path());

            if (writeEncryptedFile(fullPath, content)) {
                std::string response = "HTTP/1.1 200 OK\r\n"
                                     "Content-Type: application/json; charset=utf-8\r\n"
                                     "Content-Length: 17\r\n"
                                     "Connection: close\r\n"
                                     "\r\n{\"status\":\"success\"}";

                send(clientSocket, response.c_str(), response.size(), 0);
            } else {
                sendError(clientSocket, 500, "Failed to save file");
            }
        } catch (const std::exception& e) {
            std::cerr << "Save error: " << e.what() << std::endl;
            sendError(clientSocket, 500, "Internal Server Error");
        }
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

    // Check for daemon mode flag
    for (int i = 1; i < argc; i++) {
        if (std::string(argv[i]) == "--daemon") {
            daemonMode = true;
        }
    }

    if (!daemonMode) {
        std::cout << "🔧 Building C++ ASM Browser/Editor/Server..." << std::endl;
    }

    CPPHTTPServer server(8000, ".");

    if (!server.start()) {
        std::cerr << "❌ Failed to start server" << std::endl;
        return 1;
    }

    // Run server in background thread
    std::thread serverThread([&server]() {
        server.run();
    });

    if (!daemonMode) {
        std::cout << "✅ Server ready!" << std::endl;
        std::cout << "📋 Open http://localhost:8000/edit to access the editor" << std::endl;
        std::cout << "Press Enter to stop the server..." << std::endl;
        std::cin.get();

        server.stop();
        if (serverThread.joinable()) {
            serverThread.join();
        }

        std::cout << "🛑 Server stopped" << std::endl;
    } else {
        // Daemon mode - just wait indefinitely
        std::cout << "✅ Server running in daemon mode on port 8000" << std::endl;
        serverThread.join(); // Wait forever
    }

    return 0;
}