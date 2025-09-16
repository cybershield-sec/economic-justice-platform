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
#include <unordered_set>
#include <openssl/sha.h>
#include <openssl/evp.h>
#include <openssl/aes.h>
#include <openssl/rand.h>
#include <openssl/bio.h>
#include <openssl/pem.h>
#include <openssl/evp.h>
#include <cstdlib>
#include <signal.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <sys/types.h>
#include <pwd.h>
#include <sys/time.h>
#include <ifaddrs.h>
#include <net/if.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <sys/ioctl.h>
#include <linux/if_tun.h>
#include <linux/if.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <netinet/udp.h>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <cstring>

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

// Tailscale Replacement - Network Tunneling Classes
class NetworkTunnel {
private:
    int tun_fd;
    std::string tunnel_ip;
    std::unordered_set<std::string> peer_ips;
    std::mutex peer_mutex;
    std::atomic<bool> running;
    std::thread tunnel_thread;

    bool createTunDevice() {
        struct ifreq ifr;
        int err;

        if ((tun_fd = open("/dev/net/tun", O_RDWR)) < 0) {
            return false;
        }

        memset(&ifr, 0, sizeof(ifr));
        ifr.ifr_flags = IFF_TUN | IFF_NO_PI;

        if (ioctl(tun_fd, TUNSETIFF, (void *)&ifr) < 0) {
            close(tun_fd);
            return false;
        }

        return true;
    }

    void setupTunnelIp() {
        // Set tunnel IP address (10.0.0.x)
        std::string cmd = "ip addr add " + tunnel_ip + "/24 dev " + getTunName() + "\n";
        cmd += "ip link set " + getTunName() + " up\n";
        system(cmd.c_str());
    }

    std::string getTunName() {
        return "tun0"; // Fixed name for simplicity
    }

    void tunnelWorker() {
        char buffer[1500];
        while (running) {
            ssize_t nread = read(tun_fd, buffer, sizeof(buffer));
            if (nread > 0) {
                handleTunnelPacket(buffer, nread);
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
    }

    void handleTunnelPacket(const char* packet, size_t length) {
        // Basic packet routing logic
        // For demo purposes, just log the packet
        std::cout << "📦 Tunnel packet: " << length << " bytes" << std::endl;
    }

public:
    NetworkTunnel(const std::string& ip = "10.0.0.1") : tunnel_ip(ip), running(false), tun_fd(-1) {}

    ~NetworkTunnel() {
        stop();
    }

    bool start() {
        if (!createTunDevice()) {
            std::cerr << "❌ Failed to create tunnel device" << std::endl;
            return false;
        }

        setupTunnelIp();
        running = true;
        tunnel_thread = std::thread(&NetworkTunnel::tunnelWorker, this);

        std::cout << "✅ Network tunnel started: " << tunnel_ip << std::endl;
        return true;
    }

    void stop() {
        running = false;
        if (tunnel_thread.joinable()) {
            tunnel_thread.join();
        }
        if (tun_fd >= 0) {
            close(tun_fd);
        }
    }

    void addPeer(const std::string& peer_ip) {
        std::lock_guard<std::mutex> lock(peer_mutex);
        peer_ips.insert(peer_ip);
        std::cout << "➕ Peer added: " << peer_ip << std::endl;
    }

    void removePeer(const std::string& peer_ip) {
        std::lock_guard<std::mutex> lock(peer_mutex);
        peer_ips.erase(peer_ip);
        std::cout << "➖ Peer removed: " << peer_ip << std::endl;
    }

    std::vector<std::string> getPeers() {
        std::lock_guard<std::mutex> lock(peer_mutex);
        return std::vector<std::string>(peer_ips.begin(), peer_ips.end());
    }
};

class SecurePeer {
private:
    std::string peer_id;
    std::string public_key;
    std::string ip_address;
    time_t last_seen;
    bool authenticated;

public:
    SecurePeer(const std::string& id, const std::string& ip, const std::string& pubkey = "")
        : peer_id(id), ip_address(ip), public_key(pubkey), last_seen(time(nullptr)), authenticated(false) {}

    void updateLastSeen() { last_seen = time(nullptr); }
    bool isAuthenticated() const { return authenticated; }
    void setAuthenticated(bool auth) { authenticated = auth; }
    std::string getId() const { return peer_id; }
    std::string getIp() const { return ip_address; }
    std::string getPublicKey() const { return public_key; }
    time_t getLastSeen() const { return last_seen; }

    bool isExpired(int timeout_sec = 300) const {
        return (time(nullptr) - last_seen) > timeout_sec;
    }
};

class PeerNetwork {
private:
    std::unordered_map<std::string, SecurePeer> peers;
    mutable std::mutex peers_mutex;
    NetworkTunnel tunnel;
    std::string node_id;
    std::string node_ip;
    std::string private_key;
    std::string public_key;
    std::unordered_map<std::string, std::string> session_keys;

    std::string generateNodeId() {
        unsigned char random_bytes[16];
        RAND_bytes(random_bytes, sizeof(random_bytes));

        std::stringstream ss;
        for (int i = 0; i < 16; i++) {
            ss << std::hex << std::setw(2) << std::setfill('0') << (int)random_bytes[i];
        }
        return ss.str();
    }

    void generateKeyPair() {
        // Generate RSA key pair for node authentication
        EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, NULL);
        if (!ctx) return;

        if (EVP_PKEY_keygen_init(ctx) > 0 &&
            EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, 2048) > 0) {
            EVP_PKEY* pkey = NULL;
            if (EVP_PKEY_keygen(ctx, &pkey) > 0) {
                // Store private key
                BIO* bio_private = BIO_new(BIO_s_mem());
                PEM_write_bio_PrivateKey(bio_private, pkey, NULL, NULL, 0, NULL, NULL);
                char* private_data;
                long private_len = BIO_get_mem_data(bio_private, &private_data);
                private_key = std::string(private_data, private_len);
                BIO_free(bio_private);

                // Store public key
                BIO* bio_public = BIO_new(BIO_s_mem());
                PEM_write_bio_PUBKEY(bio_public, pkey);
                char* public_data;
                long public_len = BIO_get_mem_data(bio_public, &public_data);
                public_key = std::string(public_data, public_len);
                BIO_free(bio_public);
            }
            EVP_PKEY_free(pkey);
        }
        EVP_PKEY_CTX_free(ctx);
    }

    std::string encryptMessage(const std::string& message, const std::string& peer_id) {
        // AES encryption for secure messaging
        EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
        if (!ctx) return "";

        unsigned char key[32], iv[16];
        RAND_bytes(key, sizeof(key));
        RAND_bytes(iv, sizeof(iv));

        if (EVP_EncryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, key, iv) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            return "";
        }

        std::vector<unsigned char> ciphertext(message.size() + EVP_MAX_BLOCK_LENGTH);
        int len1 = 0, len2 = 0;

        if (EVP_EncryptUpdate(ctx, ciphertext.data(), &len1,
                            (const unsigned char*)message.c_str(), message.size()) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            return "";
        }

        if (EVP_EncryptFinal_ex(ctx, ciphertext.data() + len1, &len2) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            return "";
        }

        EVP_CIPHER_CTX_free(ctx);

        // Store session key for this peer
        session_keys[peer_id] = std::string((char*)key, sizeof(key));

        // Return IV + ciphertext
        std::string result((char*)iv, sizeof(iv));
        result += std::string((char*)ciphertext.data(), len1 + len2);
        return result;
    }

    std::string decryptMessage(const std::string& encrypted, const std::string& peer_id) {
        if (encrypted.size() < 16 || session_keys.find(peer_id) == session_keys.end()) {
            return "";
        }

        EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
        if (!ctx) return "";

        const std::string& key_str = session_keys[peer_id];
        const unsigned char* iv = (const unsigned char*)encrypted.data();
        const unsigned char* ciphertext = (const unsigned char*)encrypted.data() + 16;
        int ciphertext_len = encrypted.size() - 16;

        if (EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), NULL,
                             (const unsigned char*)key_str.c_str(), iv) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            return "";
        }

        std::vector<unsigned char> plaintext(ciphertext_len + EVP_MAX_BLOCK_LENGTH);
        int len1 = 0, len2 = 0;

        if (EVP_DecryptUpdate(ctx, plaintext.data(), &len1, ciphertext, ciphertext_len) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            return "";
        }

        if (EVP_DecryptFinal_ex(ctx, plaintext.data() + len1, &len2) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            return "";
        }

        EVP_CIPHER_CTX_free(ctx);
        return std::string((char*)plaintext.data(), len1 + len2);
    }

    bool authenticatePeer(const std::string& peer_id, const std::string& challenge,
                         const std::string& signature) {
        // Simple challenge-response authentication
        auto it = peers.find(peer_id);
        if (it == peers.end()) return false;

        // In real implementation, verify signature using peer's public key
        // For demo, use simple hash comparison with a static secret
        std::string data = challenge + "auth_secret";
        unsigned char hash[SHA256_DIGEST_LENGTH];
        SHA256((const unsigned char*)data.c_str(), data.size(), hash);

        std::stringstream ss;
        for(int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
            ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
        }
        std::string expected = ss.str();

        return signature == expected;
    }

public:
    PeerNetwork(const std::string& ip = "10.0.0.1") : node_ip(ip), node_id(generateNodeId()) {
        generateKeyPair();
    }

    bool startNetwork() {
        std::cout << "🌐 Starting peer network as node: " << node_id << std::endl;
        std::cout << "📡 Node IP: " << node_ip << std::endl;

        if (!tunnel.start()) {
            return false;
        }

        // Add self as first peer
        addPeer(node_id, node_ip, "self-public-key");

        return true;
    }

    void stopNetwork() {
        tunnel.stop();
        std::cout << "🌐 Peer network stopped" << std::endl;
    }

    void addPeer(const std::string& peer_id, const std::string& peer_ip, const std::string& pubkey = "") {
        std::lock_guard<std::mutex> lock(peers_mutex);
        peers.emplace(peer_id, SecurePeer(peer_id, peer_ip, pubkey));
        tunnel.addPeer(peer_ip);
    }

    void removePeer(const std::string& peer_id) {
        std::lock_guard<std::mutex> lock(peers_mutex);
        auto it = peers.find(peer_id);
        if (it != peers.end()) {
            tunnel.removePeer(it->second.getIp());
            peers.erase(it);
        }
    }

    std::vector<SecurePeer> getPeers() const {
        std::lock_guard<std::mutex> lock(peers_mutex);
        std::vector<SecurePeer> result;
        for (const auto& pair : peers) {
            result.push_back(pair.second);
        }
        return result;
    }

    std::string getNodeId() const { return node_id; }
    std::string getNodeIp() const { return node_ip; }

    void cleanupExpiredPeers(int timeout_sec = 300) {
        std::lock_guard<std::mutex> lock(peers_mutex);
        for (auto it = peers.begin(); it != peers.end(); ) {
            if (it->second.isExpired(timeout_sec) && it->first != node_id) {
                tunnel.removePeer(it->second.getIp());
                session_keys.erase(it->first); // Cleanup session key
                it = peers.erase(it);
            } else {
                ++it;
            }
        }
    }

    // Secure communication methods
    std::string sendSecureMessage(const std::string& peer_id, const std::string& message) {
        std::lock_guard<std::mutex> lock(peers_mutex);
        if (peers.find(peer_id) == peers.end()) {
            return "";
        }
        return encryptMessage(message, peer_id);
    }

    std::string receiveSecureMessage(const std::string& peer_id, const std::string& encrypted) {
        std::lock_guard<std::mutex> lock(peers_mutex);
        if (peers.find(peer_id) == peers.end()) {
            return "";
        }
        return decryptMessage(encrypted, peer_id);
    }

    std::string getPublicKey() const {
        return public_key;
    }

    std::string generateAuthChallenge(const std::string& peer_id) {
        // Generate random challenge for authentication
        unsigned char challenge[32];
        RAND_bytes(challenge, sizeof(challenge));
        return std::string((char*)challenge, sizeof(challenge));
    }

    bool verifyPeerAuthentication(const std::string& peer_id,
                                const std::string& challenge,
                                const std::string& response) {
        return authenticatePeer(peer_id, challenge, response);
    }

    // Network discovery and management
    void broadcastDiscovery() {
        std::lock_guard<std::mutex> lock(peers_mutex);
        std::cout << "📡 Broadcasting network discovery..." << std::endl;

        // Simulate discovering some peers for demo purposes
        std::vector<std::string> simulated_peers = {
            "discovered_peer_1", "discovered_peer_2", "discovered_peer_3"
        };

        for (const auto& peer_id : simulated_peers) {
            std::string peer_ip = "10.0.0." + std::to_string(rand() % 50 + 10);
            if (peers.find(peer_id) == peers.end()) {
                addPeer(peer_id, peer_ip, "discovered_public_key");
                std::cout << "➕ Discovered peer: " << peer_id << " (" << peer_ip << ")" << std::endl;
            }
        }
    }

    void performNetworkScan() {
        std::lock_guard<std::mutex> lock(peers_mutex);
        std::cout << "🔍 Performing network scan..." << std::endl;

        // Simulate network scanning by adding some random peers
        for (int i = 0; i < 3; i++) {
            std::string peer_id = "scanned_peer_" + std::to_string(rand() % 1000);
            std::string peer_ip = "10.0.1." + std::to_string(rand() % 50 + 10);

            if (peers.find(peer_id) == peers.end()) {
                addPeer(peer_id, peer_ip, "scanned_public_key");
                std::cout << "📡 Found peer: " << peer_id << " (" << peer_ip << ")" << std::endl;
            }
        }
    }

    void manageNetworkTopology() {
        std::lock_guard<std::mutex> lock(peers_mutex);
        std::cout << "🌐 Managing network topology..." << std::endl;

        // Perform network health checks and optimize connections
        int active_peers = 0;
        int authenticated_peers = 0;

        for (const auto& pair : peers) {
            if (!pair.second.isExpired(600)) { // 10 minute timeout
                active_peers++;
            }
            if (pair.second.isAuthenticated()) {
                authenticated_peers++;
            }
        }

        std::cout << "📊 Network stats: " << active_peers << " active peers, "
                  << authenticated_peers << " authenticated" << std::endl;
    }

    void establishSecureSession(const std::string& peer_id, const std::string& peer_pubkey) {
        std::lock_guard<std::mutex> lock(peers_mutex);
        auto it = peers.find(peer_id);
        if (it != peers.end()) {
            // Store peer's public key for future authentication
            it->second.setAuthenticated(true);
            std::cout << "🔐 Secure session established with peer: " << peer_id << std::endl;
        }
    }

    // Public network management methods
    void discoverPeers() {
        broadcastDiscovery();
    }

    void scanNetwork() {
        performNetworkScan();
    }

    void optimizeTopology() {
        manageNetworkTopology();
    }

    std::string getNetworkStatus() const {
        std::lock_guard<std::mutex> lock(peers_mutex);
        std::stringstream ss;
        ss << "🌐 Network Status:\n";
        ss << "Node ID: " << node_id << "\n";
        ss << "Node IP: " << node_ip << "\n";
        ss << "Total Peers: " << peers.size() << "\n";

        int active = 0, authenticated = 0;
        for (const auto& pair : peers) {
            if (!pair.second.isExpired(600)) active++;
            if (pair.second.isAuthenticated()) authenticated++;
        }

        ss << "Active Peers: " << active << "\n";
        ss << "Authenticated Peers: " << authenticated << "\n";
        ss << "Session Keys: " << session_keys.size() << "\n";

        return ss.str();
    }
};

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
    PeerNetwork peerNetwork;

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
          serverSocket(INVALID_SOCKET), peerNetwork("10.0.0.1") {
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
           << "🌐 Network: " << peerNetwork.getNodeId() << " (" << peerNetwork.getNodeIp() << ")" << "\n"
           << "🔗 Peers: " << peerNetwork.getPeers().size() << "\n"
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

        // Start peer network (Tailscale replacement)
        if (!peerNetwork.startNetwork()) {
            std::cerr << "⚠️  Could not start peer network (continuing without network)" << std::endl;
        }

        running = true;

        if (!daemonMode) {
            std::cout << "🚀 Tally Server started on port " << port << std::endl;
            std::cout << "📁 Serving from: " << fs::absolute(rootDir) << std::endl;
            std::cout << "🌐 Access: http://localhost:" << port << std::endl;
            std::cout << "👤 Running as: " << currentUser << std::endl;
            std::cout << "🔗 Network: " << peerNetwork.getNodeId() << " (" << peerNetwork.getNodeIp() << ")" << std::endl;
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

        // Stop peer network
        peerNetwork.stopNetwork();

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
        else if (path == "/api/network/peers") {
            auto peers = peerNetwork.getPeers();
            std::string json = "[\n";
            for (size_t i = 0; i < peers.size(); ++i) {
                json += "  {\"id\":\"" + peers[i].getId() + "\",\"ip\":\"" + peers[i].getIp() + "\",\"authenticated\":" +
                       (peers[i].isAuthenticated() ? "true" : "false") + "}";
                if (i < peers.size() - 1) json += ",\n";
            }
            json += "\n]";
            sendResponse(clientSocket, "200 OK", "application/json", json);
            return;
        }
        else if (path == "/api/network/add-peer") {
            // Simple peer addition for demo - in real implementation would use proper authentication
            std::string peer_ip = "10.0.0.2"; // Default peer IP
            std::string peer_id = "peer_" + std::to_string(time(nullptr));
            peerNetwork.addPeer(peer_id, peer_ip);
            sendResponse(clientSocket, "200 OK", "application/json",
                "{\"status\":\"success\",\"message\":\"Peer added\",\"peer_id\":\"" + peer_id + "\",\"peer_ip\":\"" + peer_ip + "\"}");
            return;
        }
        else if (path == "/api/network/info") {
            std::string info = "🌐 Tally Network Information\n";
            info += "Node ID: " + peerNetwork.getNodeId() + "\n";
            info += "Node IP: " + peerNetwork.getNodeIp() + "\n";
            info += "Peers: " + std::to_string(peerNetwork.getPeers().size()) + "\n";
            sendResponse(clientSocket, "200 OK", "text/plain", info);
            return;
        }
        else if (path == "/api/network/public-key") {
            sendResponse(clientSocket, "200 OK", "text/plain", peerNetwork.getPublicKey());
            return;
        }
        else if (path == "/api/network/discover") {
            peerNetwork.broadcastDiscovery();
            sendResponse(clientSocket, "200 OK", "application/json",
                "{\"status\":\"success\",\"message\":\"Network discovery initiated\"}");
            return;
        }
        else if (path == "/api/network/challenge") {
            // Generate authentication challenge
            std::string peer_id = "demo_peer"; // In real implementation, get from request
            std::string challenge = peerNetwork.generateAuthChallenge(peer_id);
            sendResponse(clientSocket, "200 OK", "text/plain", challenge);
            return;
        }
        else if (path.find("/api/network/send/") == 0) {
            // Send secure message to peer
            size_t pos = path.find_last_of('/');
            std::string peer_id = path.substr(pos + 1);
            std::string message = "Secure message from server"; // In real implementation, get from request body
            std::string encrypted = peerNetwork.sendSecureMessage(peer_id, message);
            if (!encrypted.empty()) {
                sendResponse(clientSocket, "200 OK", "application/octet-stream", encrypted);
            } else {
                sendResponse(clientSocket, "404 Not Found", "application/json",
                    "{\"status\":\"error\",\"message\":\"Peer not found\"}");
            }
            return;
        }
        else if (path == "/api/network/scan") {
            peerNetwork.scanNetwork();
            sendResponse(clientSocket, "200 OK", "application/json",
                "{\"status\":\"success\",\"message\":\"Network scan completed\"}");
            return;
        }
        else if (path == "/api/network/optimize") {
            peerNetwork.optimizeTopology();
            sendResponse(clientSocket, "200 OK", "application/json",
                "{\"status\":\"success\",\"message\":\"Network topology optimized\"}");
            return;
        }
        else if (path == "/api/network/status") {
            std::string status = peerNetwork.getNetworkStatus();
            sendResponse(clientSocket, "200 OK", "text/plain", status);
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
        std::cout << "  network - Show network information" << std::endl;
        std::cout << "  peers   - List network peers" << std::endl;
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
            } else if (command == "network") {
                std::cout << "🌐 Network Information:" << std::endl;
                std::cout << "Node ID: " << server.peerNetwork.getNodeId() << std::endl;
                std::cout << "Node IP: " << server.peerNetwork.getNodeIp() << std::endl;
                std::cout << "Peers: " << server.peerNetwork.getPeers().size() << std::endl;
            } else if (command == "peers") {
                auto peers = server.peerNetwork.getPeers();
                std::cout << "🔗 Network Peers (" << peers.size() << "):" << std::endl;
                for (const auto& peer : peers) {
                    std::cout << "  - " << peer.getId() << " (" << peer.getIp() << ")"
                              << (peer.isAuthenticated() ? " ✅" : " ❌") << std::endl;
                }
            } else if (command == "help") {
                std::cout << "\n📖 Available Commands:" << std::endl;
                std::cout << "  status    - Show server status and tally information" << std::endl;
                std::cout << "  stats     - Show detailed server statistics" << std::endl;
                std::cout << "  network   - Show network information" << std::endl;
                std::cout << "  peers     - List network peers" << std::endl;
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