/**
 * Notification Service
 * Handles WebSocket connections, notification management, and API calls
 */

import api from '../api/axios';

class NotificationService {
    constructor() {
        this.ws = null;
        // Prefer explicit env override, otherwise derive from API base URL or current origin
        let derivedWs = import.meta.env.VITE_WS_URL;
        if (!derivedWs) {
            try {
                const apiBase = api.defaults?.baseURL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}` : 'http://localhost:8001');
                // remove trailing /api if present
                const cleaned = apiBase.replace(/\/api\/?$/, '');
                // convert http(s) -> ws(s)
                derivedWs = cleaned.replace(/^http/, 'ws') + '/ws/notifications/';
            } catch (e) {
                derivedWs = 'ws://localhost:8001/ws/notifications/';
            }
        }
        this.wsUrl = derivedWs;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.listeners = new Set();
        this.isConnecting = false;
        this.token = null;
    }

    /**
     * Initialize WebSocket connection
     */
    connect(token) {
        if (this.isConnecting || this.ws) {
            console.log('Already connecting or connected');
            return Promise.resolve();
        }

        this.isConnecting = true;
        this.token = token;

        return new Promise((resolve, reject) => {
            try {
                // Log WS URL being used (obfuscate token)
                try {
                    const configured = import.meta.env.VITE_WS_URL || '(not set)';
                    console.log(`NotificationService: connecting to WS at ${configured}`);
                    if (!configured.startsWith('ws')) {
                        console.warn('VITE_WS_URL does not appear to be a ws:// or wss:// URL; check VITE_WS_URL in .env');
                    }
                } catch (e) {
                    console.warn('Could not read VITE_WS_URL', e);
                }

                // Set a timeout - if WebSocket doesn't connect in 10 seconds, resolve anyway
                // This allows app to continue with HTTP polling fallback
                const connectionTimeout = setTimeout(() => {
                    if (this.isConnecting) {
                        console.warn('WebSocket connection timeout, continuing without real-time notifications');
                        this.isConnecting = false;
                        resolve(); // Allow app to continue
                    }
                }, 10000);

                // Construct WebSocket URL with token
                const wsUrl = `${this.wsUrl}?token=${token}`;
                console.log('Opening WebSocket to', wsUrl.replace(/(token=)[^&]+/, '$1[REDACTED]'));
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log('WebSocket connected to notifications');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.notifyListeners('connected', true);
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    console.log('Notification received:', data);
                    this.notifyListeners('notification', data);
                };

                this.ws.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('WebSocket error:', error);
                    this.isConnecting = false;
                    this.notifyListeners('error', error);
                    // Don't reject - let the timeout or onclose handle recovery
                };

                this.ws.onclose = () => {
                    clearTimeout(connectionTimeout);
                    console.log('WebSocket disconnected');
                    this.isConnecting = false;
                    this.notifyListeners('connected', false);

                    // Attempt to reconnect
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                        setTimeout(() => this.connect(this.token), this.reconnectDelay);
                    }
                };
            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Subscribe to notification events
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notify all subscribers
     */
    notifyListeners(type, data) {
        this.listeners.forEach((listener) => {
            try {
                listener(type, data);
            } catch (error) {
                console.error('Error in notification listener:', error);
            }
        });
    }

    /**
     * Send message through WebSocket
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected');
        }
    }

    /**
     * Mark notification as read
     */
    markAsRead(notificationIds, forumId = null, tab = null) {
        this.send({
            action: 'mark_as_read',
            notification_ids: notificationIds,
            forum_id: forumId,
            tab: tab,
        });
    }

    /**
     * Get unread notification counts
     */
    async getUnreadCounts() {
        try {
            const response = await api.get('/notifications/counts/');
            return response.data;
        } catch (error) {
            console.error('Failed to get notification counts:', error);
            return { global_count: 0, forum_counts: {}, tab_counts: {} };
        }
    }

    /**
     * Fetch all unread notifications
     */
    async getNotifications(limit = 50) {
        try {
            const response = await api.get('/notifications/', {
                params: { limit },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get notifications:', error);
            return [];
        }
    }

    /**
     * Fetch notifications for specific forum
     */
    async getForumNotifications(forumId, limit = 20) {
        try {
            const response = await api.get(`/notifications/forum/${forumId}/`, {
                params: { limit },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get forum notifications:', error);
            return [];
        }
    }

    /**
     * Fetch notifications for specific tab
     */
    async getTabNotifications(forumId, tab, limit = 10) {
        try {
            const response = await api.get(`/notifications/tab/`, {
                params: {
                    forum_id: forumId,
                    tab: tab,
                    limit: limit,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get tab notifications:', error);
            return [];
        }
    }

    /**
     * Clear all notifications for a forum
     */
    async clearForumNotifications(forumId) {
        try {
            await api.post('/notifications/clear-forum/', {
                forum_id: forumId,
            });
        } catch (error) {
            console.error('Failed to clear forum notifications:', error);
        }
    }

    /**
     * Clear all notifications for a tab
     */
    async clearTabNotifications(forumId, tab) {
        try {
            await api.post('/notifications/clear-tab/', {
                forum_id: forumId,
                tab: tab,
            });
        } catch (error) {
            console.error('Failed to clear tab notifications:', error);
        }
    }

    /**
     * Health check / ping
     */
    ping() {
        this.send({ action: 'ping' });
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export singleton instance
export default new NotificationService();
