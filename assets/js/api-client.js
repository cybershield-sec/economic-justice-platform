class APIClient {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Authentication endpoints
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  async getProfile() {
    return await this.request('/auth/profile');
  }

  // Stories endpoints
  async getStories(page = 1, limit = 20, category = null, search = null) {
    const params = new URLSearchParams({ page, limit });
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    return await this.request(`/stories?${params}`);
  }

  async getStory(id) {
    return await this.request(`/stories/${id}`);
  }

  async createStory(storyData) {
    return await this.request('/stories', {
      method: 'POST',
      body: JSON.stringify(storyData)
    });
  }

  async updateStory(id, storyData) {
    return await this.request(`/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(storyData)
    });
  }

  async deleteStory(id) {
    return await this.request(`/stories/${id}`, {
      method: 'DELETE'
    });
  }

  async likeStory(id) {
    return await this.request(`/stories/${id}/like`, {
      method: 'POST'
    });
  }

  async shareStory(id) {
    return await this.request(`/stories/${id}/share`, {
      method: 'POST'
    });
  }

  // Comments endpoints
  async getComments(storyId, page = 1, limit = 50) {
    const params = new URLSearchParams({ page, limit });
    return await this.request(`/comments/story/${storyId}?${params}`);
  }

  async createComment(storyId, content, parentId = null) {
    return await this.request('/comments', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId, content, parent_id: parentId })
    });
  }

  async updateComment(id, content) {
    return await this.request(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  }

  async deleteComment(id) {
    return await this.request(`/comments/${id}`, {
      method: 'DELETE'
    });
  }

  // File upload endpoints
  async uploadFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.open('POST', `${this.baseURL}/upload`);

      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  }

  // AI integration endpoints
  async analyzeStory(content) {
    return await this.request('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async getAIReply(message, context = null) {
    return await this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }

  // Analytics endpoints
  async trackEngagement(action, data = {}) {
    return await this.request('/analytics/engagement', {
      method: 'POST',
      body: JSON.stringify({ action, ...data })
    });
  }

  async getAnalytics(timeframe = '7d') {
    return await this.request(`/analytics?timeframe=${timeframe}`);
  }

  // Network endpoints (for secure peer-to-peer communication)
  async getNetworkPeers() {
    return await this.request('/network/peers');
  }

  async addPeer(peerAddress, publicKey) {
    return await this.request('/network/add-peer', {
      method: 'POST',
      body: JSON.stringify({ address: peerAddress, public_key: publicKey })
    });
  }

  async getNetworkInfo() {
    return await this.request('/network/info');
  }

  async getNetworkStatus() {
    return await this.request('/network/status');
  }

  async getPublicKey() {
    return await this.request('/network/public-key');
  }

  async discoverPeers() {
    return await this.request('/network/discover', {
      method: 'POST'
    });
  }

  async generateChallenge(peerId) {
    return await this.request(`/network/challenge/${peerId}`, {
      method: 'POST'
    });
  }

  async sendSecureMessage(peerId, message) {
    return await this.request(`/network/send/${peerId}`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  async scanNetwork() {
    return await this.request('/network/scan', {
      method: 'POST'
    });
  }

  async optimizeNetwork() {
    return await this.request('/network/optimize', {
      method: 'POST'
    });
  }

  // Advanced network operations with encryption
  async establishSecureConnection(peerId, challengeResponse) {
    return await this.request(`/network/connect/${peerId}`, {
      method: 'POST',
      body: JSON.stringify({ challenge_response: challengeResponse })
    });
  }

  async getPeerStatistics(peerId = null) {
    const endpoint = peerId ? `/network/stats/${peerId}` : '/network/stats';
    return await this.request(endpoint);
  }

  async getNetworkTopology() {
    return await this.request('/network/topology');
  }

  async setNetworkQoS(priority = 'normal', bandwidthLimit = null) {
    return await this.request('/network/qos', {
      method: 'POST',
      body: JSON.stringify({ priority, bandwidth_limit: bandwidthLimit })
    });
  }

  // Real-time network monitoring
  async subscribeToNetworkEvents(callback) {
    if (!this.socket) {
      this.socket = new WebSocket(`ws://${this.baseURL.replace('http://', '')}/network/events`);

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Failed to parse network event:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Network WebSocket error:', error);
      };

      this.socket.onclose = () => {
        console.log('Network WebSocket connection closed');
        this.socket = null;
      };
    }

    return this.socket;
  }

  async unsubscribeFromNetworkEvents() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Network health and diagnostics
  async pingPeer(peerId, timeout = 5000) {
    return await this.request(`/network/ping/${peerId}`, {
      method: 'POST',
      timeout
    });
  }

  async getNetworkLatency(peerId = null) {
    const endpoint = peerId ? `/network/latency/${peerId}` : '/network/latency';
    return await this.request(endpoint);
  }

  async diagnoseNetworkIssues() {
    return await this.request('/network/diagnose', {
      method: 'POST'
    });
  }

  // Secure file transfer over network
  async sendSecureFile(peerId, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.open('POST', `${this.baseURL}/network/send-file/${peerId}`);

      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Secure file transfer failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during secure file transfer'));
      };

      xhr.send(formData);
    });
  }

  // Network configuration and management
  async updateNetworkSettings(settings) {
    return await this.request('/network/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  async backupNetworkConfiguration() {
    return await this.request('/network/backup', {
      method: 'POST'
    });
  }

  async restoreNetworkConfiguration(backupData) {
    return await this.request('/network/restore', {
      method: 'POST',
      body: JSON.stringify({ backup: backupData })
    });
  }

  // Utility methods for network operations
  generatePeerId() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  validatePeerAddress(address) {
    // Simple validation for IP addresses or hostnames
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const hostnameRegex = /^[a-zA-Z0-9.-]+$/;
    return ipRegex.test(address) || hostnameRegex.test(address);
  }

  // Connection state management
  getConnectionState() {
    return {
      connected: !!this.socket && this.socket.readyState === WebSocket.OPEN,
      peers: this.peers || [],
      latency: this.latency || {}
    };
  }

  // Automatic reconnection logic
  setupAutoReconnect(retryInterval = 5000, maxRetries = 10) {
    this.autoReconnect = {
      enabled: true,
      retryInterval,
      maxRetries,
      currentRetries: 0,
      timer: null
    };

    if (this.socket) {
      this.socket.onclose = () => {
        this.attemptReconnection();
      };
    }
  }

  attemptReconnection() {
    if (!this.autoReconnect.enabled ||
        this.autoReconnect.currentRetries >= this.autoReconnect.maxRetries) {
      return;
    }

    this.autoReconnect.currentRetries++;

    this.autoReconnect.timer = setTimeout(() => {
      this.subscribeToNetworkEvents(() => {
        console.log('Network connection reestablished');
        this.autoReconnect.currentRetries = 0;
      });
    }, this.autoReconnect.retryInterval);
  }

  disableAutoReconnect() {
    this.autoReconnect.enabled = false;
    if (this.autoReconnect.timer) {
      clearTimeout(this.autoReconnect.timer);
    }
  }

  // Utility methods
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`, { timeout: 5000 });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  isAuthenticated() {
    return !!this.token;
  }
}

// Create global instance
window.APIClient = new APIClient();