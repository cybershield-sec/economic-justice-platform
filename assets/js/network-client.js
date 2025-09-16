class NetworkClient extends APIClient {
  constructor(baseURL = 'http://localhost:3000/api') {
    super(baseURL);
    this.peers = new Map();
    this.connections = new Map();
    this.messageHandlers = new Map();
    this.connectionState = {
      status: 'disconnected',
      latency: 0,
      bandwidth: 0,
      peersConnected: 0
    };
  }

  // Enhanced secure connection establishment
  async connectToPeer(peerId, options = {}) {
    const {
      encryption = 'aes-256-gcm',
      timeout = 10000,
      retryAttempts = 3,
      enableCompression = true
    } = options;

    try {
      // Step 1: Get peer information
      const peerInfo = await this.getPeerInfo(peerId);

      // Step 2: Generate challenge for authentication
      const challenge = await this.generateChallenge(peerId);

      // Step 3: Establish secure connection
      const connection = await this.establishSecureConnection(peerId, {
        encryption,
        challenge_response: challenge.response,
        compression: enableCompression
      });

      // Store connection details
      this.connections.set(peerId, {
        ...connection,
        establishedAt: Date.now(),
        encryption,
        compression: enableCompression
      });

      // Set up message handlers
      this.setupMessageHandlers(peerId);

      return connection;
    } catch (error) {
      console.error(`Failed to connect to peer ${peerId}:`, error);
      throw error;
    }
  }

  // Secure messaging with encryption
  async sendEncryptedMessage(peerId, message, options = {}) {
    const {
      encryption = 'aes-256-gcm',
      priority = 'normal',
      timeout = 5000
    } = options;

    const connection = this.connections.get(peerId);
    if (!connection) {
      throw new Error(`No active connection to peer ${peerId}`);
    }

    try {
      // Encrypt message locally if needed, or rely on server encryption
      const encryptedMessage = await this.encryptMessage(message, connection.encryptionKey);

      const response = await this.sendSecureMessage(peerId, encryptedMessage, {
        priority,
        timeout
      });

      return response;
    } catch (error) {
      console.error(`Failed to send encrypted message to ${peerId}:`, error);
      throw error;
    }
  }

  // Real-time message subscription
  subscribeToMessages(peerId, messageType, handler) {
    if (!this.messageHandlers.has(peerId)) {
      this.messageHandlers.set(peerId, new Map());
    }

    const peerHandlers = this.messageHandlers.get(peerId);
    if (!peerHandlers.has(messageType)) {
      peerHandlers.set(messageType, new Set());
    }

    peerHandlers.get(messageType).add(handler);
  }

  unsubscribeFromMessages(peerId, messageType, handler) {
    const peerHandlers = this.messageHandlers.get(peerId);
    if (peerHandlers && peerHandlers.has(messageType)) {
      peerHandlers.get(messageType).delete(handler);
    }
  }

  // Network topology management
  async buildNetworkMap() {
    const peers = await this.getNetworkPeers();
    const topology = await this.getNetworkTopology();

    this.networkMap = {
      peers: peers.reduce((map, peer) => {
        map[peer.id] = peer;
        return map;
      }, {}),
      topology,
      lastUpdated: Date.now()
    };

    return this.networkMap;
  }

  // Quality of Service management
  async optimizeConnections() {
    const stats = await this.getPeerStatistics();
    const latencyMap = await this.getNetworkLatency();

    // Implement connection optimization logic
    const optimizedSettings = this.calculateOptimalSettings(stats, latencyMap);

    await this.setNetworkQoS(optimizedSettings.priority, optimizedSettings.bandwidthLimit);

    return optimizedSettings;
  }

  // Secure file transfer with progress tracking
  async transferFile(peerId, file, options = {}) {
    const {
      chunkSize = 1024 * 1024, // 1MB chunks
      encryption = true,
      onProgress = null,
      onChunk = null
    } = options;

    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      chunks: Math.ceil(file.size / chunkSize),
      transferred: 0
    };

    try {
      if (encryption) {
        return await this.sendSecureFile(peerId, file, (progress) => {
          fileInfo.transferred = progress;
          if (onProgress) onProgress(fileInfo);
        });
      } else {
        // Implement custom chunked transfer for large files
        return await this.transferFileChunked(peerId, file, chunkSize, onProgress, onChunk);
      }
    } catch (error) {
      console.error(`File transfer to ${peerId} failed:`, error);
      throw error;
    }
  }

  // Advanced network diagnostics
  async performNetworkDiagnostics() {
    const diagnostics = {
      timestamp: Date.now(),
      basic: await this.diagnoseNetworkIssues(),
      latency: await this.getNetworkLatency(),
      peers: await this.getNetworkPeers(),
      topology: await this.getNetworkTopology(),
      throughput: await this.measureThroughput()
    };

    // Analyze and provide recommendations
    diagnostics.recommendations = this.analyzeDiagnostics(diagnostics);

    return diagnostics;
  }

  // Connection pooling and management
  async manageConnections() {
    const activePeers = await this.getNetworkPeers();
    const currentConnections = Array.from(this.connections.keys());

    // Close idle connections
    for (const peerId of currentConnections) {
      if (!activePeers.find(p => p.id === peerId)) {
        await this.disconnectFromPeer(peerId);
      }
    }

    // Maintain optimal number of connections
    const optimalConnections = this.calculateOptimalConnections(activePeers.length);
    if (this.connections.size < optimalConnections) {
      await this.establishAdditionalConnections(activePeers, optimalConnections);
    }
  }

  // Security and key management
  async rotateEncryptionKeys() {
    const peers = Array.from(this.connections.keys());

    for (const peerId of peers) {
      try {
        await this.rekeyConnection(peerId);
      } catch (error) {
        console.warn(`Failed to rekey connection with ${peerId}:`, error);
      }
    }

    return { rotated: peers.length, timestamp: Date.now() };
  }

  // Utility methods
  setupMessageHandlers(peerId) {
    // Set up WebSocket or polling for real-time messages
    this.subscribeToNetworkEvents((event) => {
      if (event.type === 'message' && event.peerId === peerId) {
        this.handleIncomingMessage(peerId, event.message);
      }
    });
  }

  handleIncomingMessage(peerId, message) {
    const peerHandlers = this.messageHandlers.get(peerId);
    if (peerHandlers && peerHandlers.has(message.type)) {
      const handlers = peerHandlers.get(message.type);
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${peerId}:`, error);
        }
      }
    }
  }

  async encryptMessage(message, key) {
    // Implement client-side encryption if needed
    // For now, rely on server encryption
    return message;
  }

  calculateOptimalSettings(stats, latencyMap) {
    // Simple optimization logic
    const avgLatency = Object.values(latencyMap).reduce((sum, lat) => sum + lat, 0) /
                       Object.values(latencyMap).length;

    return {
      priority: avgLatency < 100 ? 'high' : 'normal',
      bandwidthLimit: null // No limit by default
    };
  }

  async transferFileChunked(peerId, file, chunkSize, onProgress, onChunk) {
    // Implement chunked file transfer
    const reader = new FileReader();
    let offset = 0;
    let chunkIndex = 0;

    return new Promise((resolve, reject) => {
      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = async (e) => {
        try {
          const chunk = e.target.result;

          if (onChunk) {
            onChunk(chunkIndex, chunk);
          }

          // Send chunk to peer
          await this.sendSecureMessage(peerId, {
            type: 'file_chunk',
            chunkIndex,
            totalChunks: Math.ceil(file.size / chunkSize),
            data: chunk
          });

          offset += chunkSize;
          chunkIndex++;

          if (onProgress) {
            onProgress((offset / file.size) * 100);
          }

          if (offset < file.size) {
            readNextChunk();
          } else {
            resolve({ success: true, chunks: chunkIndex });
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      readNextChunk();
    });
  }

  async measureThroughput() {
    const testSize = 1024 * 1024; // 1MB test data
    const testData = new ArrayBuffer(testSize);
    const startTime = Date.now();

    try {
      await this.sendSecureMessage('test', {
        type: 'throughput_test',
        data: testData
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (testSize * 8) / (duration / 1000); // bits per second

      return {
        throughput: Math.round(throughput),
        duration,
        timestamp: Date.now()
      };
    } catch (error) {
      return { error: 'Throughput test failed', timestamp: Date.now() };
    }
  }

  analyzeDiagnostics(diagnostics) {
    const recommendations = [];

    // Analyze latency
    const avgLatency = Object.values(diagnostics.latency).reduce((sum, lat) => sum + lat, 0) /
                       Object.values(diagnostics.latency).length;

    if (avgLatency > 200) {
      recommendations.push({
        type: 'latency',
        severity: 'warning',
        message: 'High network latency detected. Consider optimizing connection routes.',
        suggestion: 'Use optimizeNetwork() to improve performance.'
      });
    }

    // Analyze peer connectivity
    if (diagnostics.peers.length < 3) {
      recommendations.push({
        type: 'connectivity',
        severity: 'info',
        message: 'Low peer connectivity. Network resilience may be affected.',
        suggestion: 'Use discoverPeers() to find additional network nodes.'
      });
    }

    return recommendations;
  }

  calculateOptimalConnections(activePeers) {
    // Simple heuristic: maintain connections to 1/3 of available peers
    return Math.max(3, Math.min(10, Math.floor(activePeers / 3)));
  }

  async establishAdditionalConnections(activePeers, targetCount) {
    const currentCount = this.connections.size;
    const needed = targetCount - currentCount;

    if (needed <= 0) return;

    // Connect to peers with best latency
    const latencyMap = await this.getNetworkLatency();
    const sortedPeers = activePeers
      .filter(peer => !this.connections.has(peer.id))
      .sort((a, b) => (latencyMap[a.id] || Infinity) - (latencyMap[b.id] || Infinity))
      .slice(0, needed);

    for (const peer of sortedPeers) {
      try {
        await this.connectToPeer(peer.id);
      } catch (error) {
        console.warn(`Failed to connect to additional peer ${peer.id}:`, error);
      }
    }
  }

  async rekeyConnection(peerId) {
    // Implement connection rekeying logic
    const newChallenge = await this.generateChallenge(peerId);
    await this.establishSecureConnection(peerId, {
      challenge_response: newChallenge.response,
      rekey: true
    });
  }

  async disconnectFromPeer(peerId) {
    const connection = this.connections.get(peerId);
    if (connection) {
      // Clean up connection resources
      this.connections.delete(peerId);
      this.messageHandlers.delete(peerId);

      // Notify peer of disconnection
      try {
        await this.sendSecureMessage(peerId, { type: 'disconnect' });
      } catch (error) {
        // Ignore errors during disconnect
      }
    }
  }

  // Status monitoring
  getNetworkStatus() {
    return {
      connections: this.connections.size,
      peers: this.peers.size,
      messageHandlers: this.messageHandlers.size,
      connectionState: this.connectionState,
      timestamp: Date.now()
    };
  }

  // Cleanup
  async shutdown() {
    // Close all connections
    for (const peerId of this.connections.keys()) {
      await this.disconnectFromPeer(peerId);
    }

    // Unsubscribe from network events
    await this.unsubscribeFromNetworkEvents();

    // Clear all state
    this.peers.clear();
    this.connections.clear();
    this.messageHandlers.clear();

    this.connectionState = {
      status: 'disconnected',
      latency: 0,
      bandwidth: 0,
      peersConnected: 0
    };
  }
}

// Create global instance
window.NetworkClient = new NetworkClient();