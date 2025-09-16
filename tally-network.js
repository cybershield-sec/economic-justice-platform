// Tally Network Harmonization System
// Shared across all Economic Justice Platform pages

class TallyNetwork {
    constructor() {
        this.networkKey = 'economic_justice_tally_network';
        this.syncInterval = 10000; // 10 seconds
        this.connectedPlatforms = new Set();
        this.init();
    }

    init() {
        this.loadNetworkState();
        this.startSync();
        this.connectToPlatforms();
    }

    loadNetworkState() {
        const saved = localStorage.getItem(this.networkKey);
        if (saved) {
            this.networkState = JSON.parse(saved);
        } else {
            this.networkState = {
                totalNodes: 1,
                globalTally: 0.5,
                collectivePower: 2.0,
                networkStrength: 1.0,
                lastSync: Date.now(),
                transactions: [],
                activePlatforms: {}
            };
        }
    }

    saveNetworkState() {
        localStorage.setItem(this.networkKey, JSON.stringify(this.networkState));
    }

    startSync() {
        setInterval(() => this.syncNetwork(), this.syncInterval);
    }

    syncNetwork() {
        // Update network metrics
        this.networkState.totalNodes = Math.max(1, this.calculateTotalNodes());
        this.networkState.networkStrength = this.calculateNetworkStrength();
        this.networkState.lastSync = Date.now();

        // Share with other platforms
        this.broadcastNetworkState();

        // Emit sync event for UI updates
        this.emitSyncEvent();
    }

    calculateTotalNodes() {
        // Count active platforms and simulate network growth
        const baseNodes = Object.keys(this.networkState.activePlatforms).length || 1;
        const timeFactor = (Date.now() - this.networkState.lastSync) / 3600000; // hours since last sync
        return baseNodes + Math.floor(timeFactor * 0.1);
    }

    calculateNetworkStrength() {
        // Network strength grows with more nodes and activity
        const baseStrength = this.networkState.totalNodes * 0.1;
        const activityBonus = this.networkState.transactions.length * 0.01;
        return Math.max(1.0, baseStrength + activityBonus);
    }

    connectToPlatforms() {
        // Simulate connections to other Economic Justice Platform pages
        const platforms = [
            'index.html',
            'economic-justice-resources.html',
            'story-platform.html',
            'multi-agent-chat.html',
            'crypotaLLY_REVOLUTION.html'
        ];

        platforms.forEach(platform => {
            if (this.isPlatformActive(platform)) {
                this.connectedPlatforms.add(platform);
                this.networkState.activePlatforms[platform] = Date.now();
            }
        });

        this.saveNetworkState();
    }

    isPlatformActive(platform) {
        // Check if platform has been recently active
        const lastActive = this.networkState.activePlatforms[platform];
        return lastActive && (Date.now() - lastActive < 300000); // 5 minutes
    }

    broadcastNetworkState() {
        // Share network state across all platform tabs/windows
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('tally_network');
                channel.postMessage({
                    type: 'network_update',
                    data: this.networkState,
                    timestamp: Date.now()
                });
                channel.close();
            } catch (e) {
                console.log('BroadcastChannel not supported, using localStorage fallback');
            }
        }

        // Fallback to localStorage for cross-tab communication
        localStorage.setItem('tally_network_broadcast', JSON.stringify({
            data: this.networkState,
            timestamp: Date.now()
        }));
    }

    emitSyncEvent() {
        // Dispatch event for UI components to listen to
        const event = new CustomEvent('tallyNetworkSync', {
            detail: this.networkState
        });
        window.dispatchEvent(event);
    }

    // Public API for platform integration
    addTransaction(transaction) {
        this.networkState.transactions.push({
            ...transaction,
            id: this.generateId(),
            timestamp: Date.now(),
            platform: window.location.pathname.split('/').pop()
        });

        // Transaction increases network value
        this.networkState.globalTally += transaction.amount * 0.1;
        this.networkState.collectivePower += transaction.amount * 0.05;

        this.saveNetworkState();
        this.syncNetwork();

        return this.networkState;
    }

    getUserTally() {
        // Get or create user-specific tally
        const userId = this.getUserId();
        if (!this.networkState.userTallies) {
            this.networkState.userTallies = {};
        }

        if (!this.networkState.userTallies[userId]) {
            this.networkState.userTallies[userId] = {
                individual: 1.0,
                contributions: 0,
                lastActivity: Date.now()
            };
        }

        return this.networkState.userTallies[userId];
    }

    updateUserTally(updates) {
        const userTally = this.getUserTally();
        Object.assign(userTally, updates, { lastActivity: Date.now() });
        this.saveNetworkState();
        return userTally;
    }

    contributeToCommons(amount) {
        const userTally = this.getUserTally();
        if (userTally.individual >= amount) {
            userTally.individual -= amount;
            userTally.contributions += amount;

            this.networkState.collectivePower += amount * 0.8;
            this.networkState.globalTally += amount * 0.2;

            this.addTransaction({
                from: 'user_' + this.getUserId(),
                to: 'global_commons',
                amount: amount,
                narrative: 'Contribution to economic commons'
            });

            return true;
        }
        return false;
    }

    participateInRevolution() {
        const userTally = this.getUserTally();
        const revolutionBonus = 0.3 + (Math.random() * 0.2);

        userTally.individual += revolutionBonus;
        this.networkState.networkStrength += revolutionBonus * 0.1;

        this.addTransaction({
            from: 'revolution',
            to: 'user_' + this.getUserId(),
            amount: revolutionBonus,
            narrative: 'Joined the economic justice revolution'
        });

        return revolutionBonus;
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getUserId() {
        // Generate persistent user ID
        let userId = localStorage.getItem('tally_user_id');
        if (!userId) {
            userId = 'user_' + this.generateId();
            localStorage.setItem('tally_user_id', userId);
        }
        return userId;
    }

    // Network status methods
    getNetworkStatus() {
        return {
            totalNodes: this.networkState.totalNodes,
            networkStrength: this.networkState.networkStrength,
            globalTally: this.networkState.globalTally,
            collectivePower: this.networkState.collectivePower,
            lastSync: new Date(this.networkState.lastSync).toLocaleTimeString(),
            activePlatforms: Object.keys(this.networkState.activePlatforms).length
        };
    }

    // Event listeners for real-time updates
    onNetworkUpdate(callback) {
        window.addEventListener('tallyNetworkSync', (event) => {
            callback(event.detail);
        });

        // Also listen for storage events (cross-tab)
        window.addEventListener('storage', (event) => {
            if (event.key === 'tally_network_broadcast' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    if (data.data) {
                        callback(data.data);
                    }
                } catch (e) {
                    console.log('Error parsing network broadcast');
                }
            }
        });
    }
}

// Global instance
window.tallyNetwork = new TallyNetwork();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TallyNetwork;
}